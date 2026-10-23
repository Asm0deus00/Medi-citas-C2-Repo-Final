const pool = require('../config/database');
const { ApiError } = require('../utils/errors');
const ALLOWED_TABLES = new Set([
  'specialties',
  'review_tags',
  'doctors',
  'patients',
  'users',
  'doctor_schedules',
  'appointments',
  'reviews',
  'medical_results'
]);

function assertTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new ApiError(400, 'Tabla no permitida para el repositorio');
  }
  return table;
}

async function all(table) {
  assertTable(table);
  const [rows] = await pool.query('SELECT * FROM ?? ORDER BY id DESC', [table]);
  return rows;
}

async function one(table, id) {
  assertTable(table);
  const [rows] = await pool.query('SELECT * FROM ?? WHERE id = ?', [table, id]);
  return rows[0] || null;
}

async function insert(table, fields) {
  assertTable(table);
  const keys = Object.keys(fields || {});
  if (!keys.length) {
    throw new ApiError(400, 'No hay campos para insertar');
  }
  const columns = keys.map(() => '??').join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ?? (${columns}) VALUES (${placeholders})`;
  const [result] = await pool.query(sql, [table, ...keys, ...keys.map((key) => fields[key])]);
  return result.insertId;
}

async function update(table, id, fields) {
  assertTable(table);
  const keys = Object.keys(fields || {});
  if (!keys.length) {
    throw new ApiError(400, 'No hay campos para actualizar');
  }
  const assignments = keys.map(() => '?? = ?').join(', ');
  const sql = `UPDATE ?? SET ${assignments} WHERE id = ?`;
  const params = [table, ...keys.flatMap((key) => [key, fields[key]]), id];
  const [result] = await pool.query(sql, params);
  return result.affectedRows > 0;
}

async function remove(table, id) {
  assertTable(table);
  const [result] = await pool.query('DELETE FROM ?? WHERE id = ?', [table, id]);
  return result.affectedRows > 0;
}

module.exports = { all, one, insert, update, remove };
