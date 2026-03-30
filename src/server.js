const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
app.use(express.json());


function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function authRequired(req, res, next) {
  const token = req.header('x-session-token');
  if (!token) {
    return res.status(401).json({ error: 'Missing session token' });
  }

  const session = db
    .prepare(
      `SELECT ls.id, ls.user_id, ls.status, ls.ended_at, u.employee_id, u.name, u.role
       FROM login_sessions ls
       JOIN users u ON u.id = ls.user_id
       WHERE ls.token = ?`
    )
    .get(token);

  if (!session || session.status !== 'active' || session.ended_at) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.session = session;
  next();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login/request-otp', (req, res) => {
  const { employeeId, password } = req.body;
  if (!employeeId || !password) {
    return res.status(400).json({ error: 'employeeId and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE employee_id = ?').get(employeeId);
  if (!user) {

  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const otpCode = generateOtp();
  const requestId = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO otp_requests (request_id, user_id, otp_code, expires_at) VALUES (?, ?, ?, ?)'
  ).run(requestId, user.id, otpCode, expiresAt);

  return res.json({
    message: 'OTP sent to registered mobile number',
    requestId,
    otpForDemo: otpCode,
    mobile: user.mobile,
    expiresAt
  });
});

app.post('/api/auth/login/verify-otp', (req, res) => {
  const { requestId, otp } = req.body;
  if (!requestId || !otp) {
    return res.status(400).json({ error: 'requestId and otp are required' });
  }

  const otpRequest = db
    .prepare(
      `SELECT orq.*, u.employee_id, u.name, u.role
       FROM otp_requests orq
       JOIN users u ON u.id = orq.user_id
       WHERE orq.request_id = ?`
    )
    .get(requestId);

  if (!otpRequest) {
    return res.status(404).json({ error: 'OTP request not found' });
  }

  if (otpRequest.verified) {
    return res.status(409).json({ error: 'OTP already verified' });
  }

  if (new Date(otpRequest.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'OTP expired' });
  }

  if (otp !== otpRequest.otp_code) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  db.prepare('UPDATE otp_requests SET verified = 1 WHERE id = ?').run(otpRequest.id);

  const sessionId = uuidv4();
  db.prepare(
    'INSERT INTO login_sessions (session_id, user_id, otp_request_id, status) VALUES (?, ?, ?, ?)'
  ).run(sessionId, otpRequest.user_id, otpRequest.id, 'pending_biometric');

  return res.json({
    message: 'OTP verified. Complete biometric login.',
    sessionId,
    user: {
      employeeId: otpRequest.employee_id,
      name: otpRequest.name,
      role: otpRequest.role
    },
    nextStep: 'Provide biometricPasscode to complete login.'
  });
});

app.post('/api/auth/login/verify-biometric', (req, res) => {
  const { sessionId, biometricPasscode } = req.body;
  if (!sessionId || !biometricPasscode) {
    return res.status(400).json({ error: 'sessionId and biometricPasscode are required' });
  }

  const loginSession = db
    .prepare(
      `SELECT ls.*, u.employee_id, u.name, u.role, u.biometric_passcode
       FROM login_sessions ls
       JOIN users u ON u.id = ls.user_id
       WHERE ls.session_id = ?`
    )
    .get(sessionId);

  if (!loginSession) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (loginSession.status !== 'pending_biometric') {
    return res.status(409).json({ error: 'Session is not waiting for biometric verification' });
  }

  const isPasscodeValid = bcrypt.compareSync(biometricPasscode, loginSession.biometric_passcode);
  if (!isPasscodeValid) {
    return res.status(401).json({ error: 'Biometric passcode is invalid' });
  }

  const token = uuidv4();
  db.prepare('UPDATE login_sessions SET status = ?, token = ? WHERE id = ?').run('active', token, loginSession.id);

  return res.json({
    message: 'Login successful',
    token,
    user: {
      employeeId: loginSession.employee_id,
      name: loginSession.name,
      role: loginSession.role
    }
  });
});

app.post('/api/activity/heartbeat', authRequired, (req, res) => {
  const { eventType, durationMs } = req.body;
  if (!['active', 'idle'].includes(eventType)) {
    return res.status(400).json({ error: 'eventType must be active or idle' });
  }

  if (!Number.isInteger(durationMs) || durationMs <= 0) {
    return res.status(400).json({ error: 'durationMs must be a positive integer' });
  }

  db.prepare('INSERT INTO activity_events (session_id, event_type, duration_ms) VALUES (?, ?, ?)').run(
    req.session.id,
    eventType,
    durationMs
  );

  if (eventType === 'active') {
    db.prepare('UPDATE login_sessions SET active_ms = active_ms + ? WHERE id = ?').run(durationMs, req.session.id);
  } else {
    db.prepare('UPDATE login_sessions SET idle_ms = idle_ms + ? WHERE id = ?').run(durationMs, req.session.id);
  }

  return res.json({ message: 'Heartbeat stored' });
});

app.post('/api/auth/logout', authRequired, (req, res) => {
  db.prepare('UPDATE login_sessions SET ended_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run(
    'logged_out',
    req.session.id
  );

  res.json({ message: 'Logged out successfully' });
});

app.get('/api/me/session-stats', authRequired, (req, res) => {
  const stats = db
    .prepare('SELECT session_id, started_at, ended_at, active_ms, idle_ms FROM login_sessions WHERE id = ?')
    .get(req.session.id);

  return res.json({
    employeeId: req.session.employee_id,
    name: req.session.name,
    stats
  });
});

app.get('/api/admin/team-summary', authRequired, (req, res) => {
  if (req.session.role !== 'leader') {
    return res.status(403).json({ error: 'Only team leader can view team summary' });
  }

  const rows = db
    .prepare(
      `SELECT
          u.employee_id AS employeeId,
          u.name,
          COUNT(ls.id) AS sessions,
          COALESCE(SUM(ls.active_ms), 0) AS totalActiveMs,
          COALESCE(SUM(ls.idle_ms), 0) AS totalIdleMs,
          COALESCE(SUM((julianday(COALESCE(ls.ended_at, CURRENT_TIMESTAMP)) - julianday(ls.started_at)) * 86400000), 0) AS totalLoginMs
       FROM users u
       LEFT JOIN login_sessions ls ON ls.user_id = u.id
       WHERE u.role = 'member'
       GROUP BY u.id
       ORDER BY u.employee_id`
    )
    .all();

  return res.json({
    generatedAt: new Date().toISOString(),
    teamSize: rows.length,
    members: rows
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
