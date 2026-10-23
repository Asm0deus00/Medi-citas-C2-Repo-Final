const pool = require('../config/database');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

async function verifyCredentials(body) {
  const email = validate.email(body?.email);
  const password = validate.requiredText(body?.password, 'password');
  const [users] = await pool.query(
    'SELECT id, patient_id, email, role FROM users WHERE email = ? AND password = ?',
    [email, password]
  );
  if (!users.length) throw new ApiError(401, 'Credenciales incorrectas');
  return users[0];
}

module.exports = { verifyCredentials };
