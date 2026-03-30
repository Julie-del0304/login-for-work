const bcrypt = require('bcryptjs');
const db = require('./db');

const users = [
  { employeeId: 'TL001', name: 'Team Leader', role: 'leader', mobile: '9000000001', password: 'Leader@123', biometricPasscode: '111111' },
  { employeeId: 'EMP001', name: 'Member 1', role: 'member', mobile: '9000000002', password: 'Member@123', biometricPasscode: '222222' },
  { employeeId: 'EMP002', name: 'Member 2', role: 'member', mobile: '9000000003', password: 'Member@123', biometricPasscode: '333333' },
  { employeeId: 'EMP003', name: 'Member 3', role: 'member', mobile: '9000000004', password: 'Member@123', biometricPasscode: '444444' },
  { employeeId: 'EMP004', name: 'Member 4', role: 'member', mobile: '9000000005', password: 'Member@123', biometricPasscode: '555555' },
  { employeeId: 'EMP005', name: 'Member 5', role: 'member', mobile: '9000000006', password: 'Member@123', biometricPasscode: '666666' },
  { employeeId: 'EMP006', name: 'Member 6', role: 'member', mobile: '9000000007', password: 'Member@123', biometricPasscode: '777777' },
  { employeeId: 'EMP007', name: 'Member 7', role: 'member', mobile: '9000000008', password: 'Member@123', biometricPasscode: '888888' },
  { employeeId: 'EMP008', name: 'Member 8', role: 'member', mobile: '9000000009', password: 'Member@123', biometricPasscode: '999999' },
  { employeeId: 'EMP009', name: 'Member 9', role: 'member', mobile: '9000000010', password: 'Member@123', biometricPasscode: '121212' },
  { employeeId: 'EMP010', name: 'Member 10', role: 'member', mobile: '9000000011', password: 'Member@123', biometricPasscode: '343434' }
];

const insertUser = db.prepare(`
  INSERT INTO users (employee_id, name, role, mobile, password_hash, biometric_passcode)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const user of users) {
  const passwordHash = bcrypt.hashSync(user.password, 10);
  const biometricHash = bcrypt.hashSync(user.biometricPasscode, 10);
  insertUser.run(user.employeeId, user.name, user.role, user.mobile, passwordHash, biometricHash);
}

console.log('Seeded users successfully.');
