const pool = require('../config/database');
const repo = require('../repositories/base.repository');
const v = require('../utils/validate');
const { ApiError } = require('../utils/errors');
const types = ['numeric', 'qualitative', 'imaging'];
async function list(patientId, type) {
  const where = [], args = [];
  if (patientId !== undefined) { where.push('patient_id = ?'); args.push(v.id(patientId)); }
  if (type !== undefined) { where.push('result_type = ?'); args.push(v.choice(type, 'type', types)); }
  const [rows] = await pool.query(`SELECT * FROM medical_results ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`, args);
  return rows;
}
async function get(id) {
  const result = await repo.one('medical_results', v.id(id));
  if (!result) throw new ApiError(404, 'Resultado no encontrado');
  const [detail] = await pool.query('SELECT * FROM ?? WHERE result_id = ?', [`${result.result_type}_results`, result.id]);
  return { ...result, detail: detail[0] || null };
}
function parseDetail(body) {
  const type = v.choice(body.result_type, 'result_type', types);
  if (type === 'numeric') {
    const values = { measured_value: v.measurement(body.measured_value, 'measured_value'), unit: v.requiredText(body.unit, 'unit', 40), reference_min: v.measurement(body.reference_min, 'reference_min'), reference_max: v.measurement(body.reference_max, 'reference_max') };
    if (values.reference_min > values.reference_max) throw new ApiError(400, 'El mínimo de referencia no puede superar al máximo');
    return { result_type: type, values };
  }
  if(type === 'qualitative') return { result_type: type, values: { finding: v.requiredText(body.finding, 'finding', 250) } };
  return { result_type: type, values: { report_text: v.requiredText(body.report_text, 'report_text', 5000), image_path: v.requiredText(body.image_path, 'image_path', 500) } };
}
async function create(body) {
  const patientId = v.id(body.patient_id);
  const examName = v.requiredText(body.exam_name, 'exam_name');
  const detail = parseDetail(body);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[patient]] = await connection.query('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (!patient) throw new ApiError(404, 'Paciente no encontrado');
    const [created] = await connection.query('INSERT INTO medical_results (patient_id, exam_name, result_type) VALUES (?, ?, ?)', [patientId, examName, detail.result_type]);
    const keys = Object.keys(detail.values);
    await connection.query(`INSERT INTO ?? (result_id, ${keys.map(()=>'??').join(', ')}) VALUES (?, ${keys.map(()=>'?').join(', ')})`, [`${detail.result_type}_results`, ...keys, created.insertId, ...keys.map(key => detail.values[key])]);
    await connection.commit();
    return get(created.insertId);
  } catch(error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function edit(id, body) {
  const current = await get(id);
  const detail = parseDetail({ ...current.detail, ...body, result_type: current.result_type });
  const values = detail.values;
  const keys = Object.keys(values);
  const fields = keys.map(() => '?? = ?').join(', ');
  await pool.query(`UPDATE ?? SET ${fields} WHERE result_id = ?`, [`${current.result_type}_results`, ...keys.flatMap(key => [key, values[key]]), Number(id)]);
  return get(id);
}
async function erase(id) { if (!await repo.remove('medical_results', v.id(id))) throw new ApiError(404, 'Resultado no encontrado'); }
module.exports = { list, get, create, edit, erase };
