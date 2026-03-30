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


```bash
npm install
npm run seed


## Seeded Credentials

### Team Leader
- Employee ID: `TL001`
- Password: `Leader@123`
- Biometric passcode: `111111`

### Team Members
- IDs: `EMP001` to `EMP010`
- Password: `Member@123`
- Biometric passcodes are set in `src/seed.js`


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
