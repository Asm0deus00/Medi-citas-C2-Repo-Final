const pool = require('../config/database');
async function all(table) { const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`); return rows; }
async function one(table, id) { const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]); return rows[0] || null; }
async function insert(table, fields) {
  const keys = Object.keys(fields);
  const columns = keys.map(() => '??').join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ?? (${columns}) VALUES (${placeholders})`;
  const [result] = await pool.query(sql, [table, ...keys, ...keys.map(key => fields[key])]);
  return result.insertId;
}
async function update(table, id, fields) {
  const keys = Object.keys(fields);
  const sql = `UPDATE ?? SET ${keys.map(() => '?? = ?').join(', ')} WHERE id = ?`;
  const params = [table, ...keys.flatMap(key => [key, fields[key]]), id];
  const [result] = await pool.query(sql, params);
  return result.affectedRows > 0;
}
async function remove(table, id) {
  const [result] = await pool.query('DELETE FROM ?? WHERE id = ?', [table, id]);
  return result.affectedRows > 0;
}
module.exports = { all, one, insert, update, remove };
