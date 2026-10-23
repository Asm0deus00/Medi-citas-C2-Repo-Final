const pool = require('../config/database');
const repository = require('../repositories/base.repository');
const { runInTransaction } = require('../repositories/transaction');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');
const { PRIVATE_IMAGES_DIR } = require('../config/constants');
const path = require('node:path');

const DETAIL_TABLES = Object.freeze({
  numeric: 'numeric_results',
  qualitative: 'qualitative_results',
  imaging: 'imaging_results'
});
const RESULT_TYPES = Object.keys(DETAIL_TABLES);
const IMAGE_FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(png|jpe?g|pdf)$/i;

async function list(patientId, resultType) {
  const conditions = [];
  const parameters = [];
  if (patientId !== undefined) {
    conditions.push('patient_id = ?');
    parameters.push(validate.id(patientId));
  }
  if (resultType !== undefined) {
    conditions.push('result_type = ?');
    parameters.push(validate.choice(resultType, 'type', RESULT_TYPES));
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [results] = await pool.query(
    `SELECT * FROM medical_results ${whereClause} ORDER BY id DESC`,
    parameters
  );
  return results;
}

async function get(resultId) {
  const result = await repository.one('medical_results', validate.id(resultId));
  if (!result) throw new ApiError(404, 'Resultado no encontrado');
  const [details] = await pool.query('SELECT * FROM ?? WHERE result_id = ?', [
    DETAIL_TABLES[result.result_type],
    result.id
  ]);
  return { ...result, detail: details[0] || null };
}

const DETAIL_PARSERS = Object.freeze({
  numeric(body) {
    const detail = {
      measured_value: validate.measurement(body.measured_value, 'measured_value'),
      unit: validate.requiredText(body.unit, 'unit', 40),
      reference_min: validate.measurement(body.reference_min, 'reference_min'),
      reference_max: validate.measurement(body.reference_max, 'reference_max')
    };
    if (detail.reference_min > detail.reference_max) {
      throw new ApiError(400, 'El mínimo de referencia no puede superar al máximo');
    }
    return detail;
  },
  qualitative(body) {
    return { finding: validate.requiredText(body.finding, 'finding', 250) };
  },
  imaging(body) {
    return {
      report_text: validate.requiredText(body.report_text, 'report_text', 5000),
      image_path: validate.requiredText(body.image_path, 'image_path', 500)
    };
  }
});

function parseDetail(resultType, body) {
  return DETAIL_PARSERS[resultType](body);
}

async function insertResult(connection, { patientId, examName, resultType, detail }) {
  const [patients] = await connection.query('SELECT id FROM patients WHERE id = ?', [patientId]);
  if (!patients.length) throw new ApiError(404, 'Paciente no encontrado');

  const [created] = await connection.query(
    'INSERT INTO medical_results (patient_id, exam_name, result_type) VALUES (?, ?, ?)',
    [patientId, examName, resultType]
  );
  const columns = Object.keys(detail);
  const columnPlaceholders = columns.map(() => '??').join(', ');
  const valuePlaceholders = columns.map(() => '?').join(', ');
  await connection.query(
    `INSERT INTO ?? (result_id, ${columnPlaceholders}) VALUES (?, ${valuePlaceholders})`,
    [
      DETAIL_TABLES[resultType],
      ...columns,
      created.insertId,
      ...columns.map((column) => detail[column])
    ]
  );
  return created.insertId;
}

async function create(body) {
  const patientId = validate.id(body.patient_id);
  const examName = validate.requiredText(body.exam_name, 'exam_name');
  const resultType = validate.choice(body.result_type, 'result_type', RESULT_TYPES);
  const detail = parseDetail(resultType, body);

  const resultId = await runInTransaction((connection) =>
    insertResult(connection, { patientId, examName, resultType, detail })
  );
  return get(resultId);
}

async function edit(resultId, body) {
  const current = await get(resultId);
  const detail = parseDetail(current.result_type, { ...current.detail, ...body });
  const columns = Object.keys(detail);
  const assignments = columns.map(() => '?? = ?').join(', ');
  await pool.query(`UPDATE ?? SET ${assignments} WHERE result_id = ?`, [
    DETAIL_TABLES[current.result_type],
    ...columns.flatMap((column) => [column, detail[column]]),
    current.id
  ]);
  return get(current.id);
}

async function erase(resultId) {
  const deleted = await repository.remove('medical_results', validate.id(resultId));
  if (!deleted) throw new ApiError(404, 'Resultado no encontrado');
}

async function getImageFilePath(resultId) {
  const result = await get(resultId);
  if (result.result_type !== 'imaging') {
    throw new ApiError(400, 'El resultado no es de imagenología');
  }
  const fileName = result.detail?.image_path;
  if (!fileName || !IMAGE_FILE_PATTERN.test(fileName)) {
    throw new ApiError(404, 'Imagen no disponible');
  }
  return path.join(PRIVATE_IMAGES_DIR, fileName);
}

module.exports = { list, get, create, edit, erase, getImageFilePath };
