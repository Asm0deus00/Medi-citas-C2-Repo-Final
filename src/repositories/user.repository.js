const pool = require('../config/database');

async function findByCredentials(email, password) {
  const [users] = await pool.query(
    'SELECT id, patient_id, email, role FROM users WHERE email = ? AND password = ?',
    [email, password]
  );
  return users[0] || null;
}

module.exports = { findByCredentials };
