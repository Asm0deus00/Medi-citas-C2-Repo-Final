const pool = require('../config/database');

async function exists(executor, patientId) {
  const [patients] = await executor.query('SELECT id FROM patients WHERE id = ?', [patientId]);
  return patients.length > 0;
}

async function findEmailById(patientId) {
  const [patients] = await pool.query('SELECT email FROM patients WHERE id = ?', [patientId]);
  return patients.length ? patients[0].email : null;
}

async function searchByNameOrEmail(searchTerm) {
  const [patients] = await pool.query(
    'SELECT * FROM patients WHERE full_name LIKE ? OR email LIKE ? ORDER BY id',
    [`%${searchTerm}%`, `%${searchTerm}%`]
  );
  return patients;
}

module.exports = { exists, findEmailById, searchByNameOrEmail };
