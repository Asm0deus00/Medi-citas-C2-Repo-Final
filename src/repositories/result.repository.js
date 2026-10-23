const pool = require('../config/database');

async function findAll({ patientId, resultType }) {
  const conditions = [];
  const parameters = [];
  if (patientId !== undefined) {
    conditions.push('patient_id = ?');
    parameters.push(patientId);
  }
  if (resultType !== undefined) {
    conditions.push('result_type = ?');
    parameters.push(resultType);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [results] = await pool.query(
    `SELECT * FROM medical_results ${whereClause} ORDER BY id DESC`,
    parameters
  );
  return results;
}

async function findDetail(detailTable, resultId) {
  const [details] = await pool.query('SELECT * FROM ?? WHERE result_id = ?', [
    detailTable,
    resultId
  ]);
  return details[0] || null;
}

async function insertWithDetail(
  connection,
  { patientId, examName, resultType, detailTable, detail }
) {
  const [created] = await connection.query(
    'INSERT INTO medical_results (patient_id, exam_name, result_type) VALUES (?, ?, ?)',
    [patientId, examName, resultType]
  );
  const columns = Object.keys(detail);
  const columnPlaceholders = columns.map(() => '??').join(', ');
  const valuePlaceholders = columns.map(() => '?').join(', ');
  await connection.query(
    `INSERT INTO ?? (result_id, ${columnPlaceholders}) VALUES (?, ${valuePlaceholders})`,
    [detailTable, ...columns, created.insertId, ...columns.map((column) => detail[column])]
  );
  return created.insertId;
}

async function updateDetail(detailTable, resultId, detail) {
  const columns = Object.keys(detail);
  const assignments = columns.map(() => '?? = ?').join(', ');
  await pool.query(`UPDATE ?? SET ${assignments} WHERE result_id = ?`, [
    detailTable,
    ...columns.flatMap((column) => [column, detail[column]]),
    resultId
  ]);
}

module.exports = { findAll, findDetail, insertWithDetail, updateDetail };
