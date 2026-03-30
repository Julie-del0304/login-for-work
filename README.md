# Work Login & Productivity Tracking Module

This project gives you a full backend + database module for:
- Employee login with **password → OTP → biometric passcode** flow.
- Session tracking (login time, logout time).
- Work tracking via active/idle heartbeat.
- Team leader dashboard API to check who worked and who wasted time.

## Tech Stack
- Node.js + Express
- SQLite (`better-sqlite3`)
- `bcryptjs` for password and biometric passcode hashing

## Prerequisites
- Node.js `18+` recommended
- npm `9+` recommended

## Quick Start (Windows / Mac / Linux)

```bash
npm install
npm run seed
npm run dev
```

If success, terminal shows:

```txt
Server running on port 3000
```

Server URL: `http://localhost:3000`

> Note: server startup now auto-seeds missing default users (TL001 + EMP001-EMP010).
> So even if you forget `npm run seed`, login APIs will still work with default IDs.

## Seeded Credentials

### Team Leader
- Employee ID: `TL001`
- Password: `Leader@123`
- Biometric passcode: `111111`

### Team Members
- IDs: `EMP001` to `EMP010`
- Password: `Member@123`
- Biometric passcodes are set in `src/seed.js`

---

## You already started server. What next?

After `npm run dev`, keep that terminal open.
Open **another terminal** and call APIs with Postman or curl.

If you are on Windows PowerShell and `curl` syntax gives errors, use Postman directly or run the same commands in Git Bash.

### 0) Health Check
```bash
curl http://localhost:3000/health
```

### 1) Request OTP
```bash
curl -X POST http://localhost:3000/api/auth/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"EMP001","password":"Member@123"}'
```

Copy `requestId` and `otpForDemo` from response.

### 2) Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"requestId":"<REQUEST_ID>","otp":"<OTP_FOR_DEMO>"}'
```

Copy `sessionId`.

### 3) Verify Biometric
```bash
curl -X POST http://localhost:3000/api/auth/login/verify-biometric \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","biometricPasscode":"222222"}'
```

Copy `token`.

### 4) Send Work Heartbeat (Active)
```bash
curl -X POST http://localhost:3000/api/activity/heartbeat \
  -H "Content-Type: application/json" \
  -H "x-session-token: <TOKEN>" \
  -d '{"eventType":"active","durationMs":60000}'
```

### 5) Send Idle Heartbeat
```bash
curl -X POST http://localhost:3000/api/activity/heartbeat \
  -H "Content-Type: application/json" \
  -H "x-session-token: <TOKEN>" \
  -d '{"eventType":"idle","durationMs":30000}'
```

### 6) Check My Session Stats
```bash
curl http://localhost:3000/api/me/session-stats \
  -H "x-session-token: <TOKEN>"
```

### 7) Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "x-session-token: <TOKEN>"
```

---

## Team Leader Report (who worked / idle time)

Login as leader (`TL001`) and get leader token, then:

```bash
curl http://localhost:3000/api/admin/team-summary \
  -H "x-session-token: <LEADER_TOKEN>"
```

---

## API Flow (Reference)

### 1) Request OTP
`POST /api/auth/login/request-otp`
```json
{
  "employeeId": "EMP001",
  "password": "Member@123"
}
```

### 2) Verify OTP
`POST /api/auth/login/verify-otp`
```json
{
  "requestId": "<from step 1>",
  "otp": "<otpForDemo>"
}
```

### 3) Verify Biometric
`POST /api/auth/login/verify-biometric`
```json
{
  "sessionId": "<from step 2>",
  "biometricPasscode": "222222"
}
```

Returns `token`. Send this token in header:
- `x-session-token: <token>`

### 4) Track Activity
`POST /api/activity/heartbeat`
```json
{
  "eventType": "active",
  "durationMs": 60000
}
```
Use `eventType: "idle"` when user is not working.

### 5) Logout
`POST /api/auth/logout`

### 6) Leader Team Report
`GET /api/admin/team-summary`
- Requires leader login token.
- Returns each member:
  - Total sessions
  - Total active time
  - Total idle time
  - Total login duration

## Notes
- OTP is returned in API response as `otpForDemo` for testing.
- Replace this with real SMS integration in production.
- Biometric passcode is a placeholder for actual FaceID/laptop biometric SDK integration.
