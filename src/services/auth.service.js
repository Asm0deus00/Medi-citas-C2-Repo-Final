const pool = require('../config/database');
const v = require('../utils/validate');
const { ApiError } = require('../utils/errors');
async function login(body) {
  const email = v.email(body?.email);
  const password = v.requiredText(body?.password, 'password');
  const [rows] = await pool.query('SELECT id, patient_id, email, role FROM users WHERE email = ? AND password = ?', [email, password]);
  if (!rows.length) throw new ApiError(401, 'Credenciales incorrectas');
  return rows[0];
}
module.exports = { login };
