const repo = require('../repositories/base.repository');
const pool = require('../config/database');
const v = require('../utils/validate');
const { ApiError } = require('../utils/errors');
const definitions = {
  specialties: { table: 'specialties', fields: { name: 'text' } },
  review_tags: { table: 'review_tags', fields: { name: 'text' } },
  doctors: { table: 'doctors', fields: { full_name: 'text', specialty_id: 'id', schedule_description: 'text', consultation_price: 'price', profile: 'optional', active: 'flag' } },
  patients: { table: 'patients', fields: { full_name: 'text', email: 'email', phone: 'optional' } },
  users: { table: 'users', fields: { patient_id: 'id', email: 'email', password: 'text', role: 'role' } },
  doctor_schedules: { table: 'doctor_schedules', fields: { doctor_id: 'id', weekday: 'weekday', start_time: 'time', end_time: 'time' } }
};
function parseFields(definition, body, partial = false) {
  const values = {};
  for (const [name, type] of Object.entries(definition.fields)) {
    if (partial && body[name] === undefined) continue;
    const item = body[name];
    if (type === 'text') values[name] = v.requiredText(item, name);
    else if (type === 'optional') values[name] = v.optionalText(item, name, 1000);
    else if (type === 'id') values[name] = v.id(item);
    else if (type === 'email') values[name] = v.email(item);
    else if (type === 'price') values[name] = v.price(item);
    else if (type === 'flag') values[name] = v.choice(item, name, [0, 1]);
    else if (type === 'role') values[name] = v.choice(item, name, ['patient', 'admin']);
    else if (type === 'weekday') values[name] = v.integer(item, name, 0);
    else if (type === 'time') { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item)) throw new ApiError(400, `Horario ${name} inválido`); values[name] = item; }
  }
  if (!Object.keys(values).length) throw new ApiError(400, 'No hay campos para actualizar');
  if (values.weekday != null && values.weekday > 6) throw new ApiError(400, 'Día fuera de rango');
  if (values.start_time && values.end_time && values.start_time >= values.end_time) throw new ApiError(400, 'Horario inválido');
  return values;
}
function config(resource) { const def = definitions[resource]; if (!def) throw new ApiError(404, 'Recurso desconocido'); return def; }
async function list(resource, query = {}) {
  config(resource);
  if (resource === 'doctors') {
    const [rows] = await pool.query(`SELECT d.id, d.full_name, d.specialty_id, s.name AS specialty_name,
      d.schedule_description, d.consultation_price, d.profile, d.active
      FROM doctors d JOIN specialties s ON s.id=d.specialty_id WHERE d.active=1 ORDER BY d.full_name`);
    const [slots] = await pool.query('SELECT doctor_id, weekday, start_time, end_time FROM doctor_schedules ORDER BY weekday, start_time');
    return rows.map(row => ({ ...row, schedules: slots.filter(slot => slot.doctor_id === row.id) }));
  }
  if (resource === 'patients' && query.search !== undefined) {
    const term = v.requiredText(query.search, 'search', 100);
    const [rows] = await pool.query('SELECT * FROM patients WHERE full_name LIKE ? OR email LIKE ? ORDER BY id', [`%${term}%`, `%${term}%`]);
    return rows;
  }
  const rows = await repo.all(resource);
  return resource === 'users' ? rows.map(({ password, ...user }) => user) : rows;
}
async function get(resource, recordId) {
  const item = await repo.one(config(resource).table, v.id(recordId));
  if (!item) throw new ApiError(404, 'Registro no encontrado');
  if (resource === 'users') { const { password, ...user } = item; return user; }
  return item;
}
async function create(resource, body) {
  if (resource === 'users' && body.role !== 'patient') throw new ApiError(403, 'El alta pública permite solamente pacientes');
  const fields = parseFields(config(resource), body || {});
  if (resource === 'users') {
    const [[patient]] = await pool.query('SELECT email FROM patients WHERE id = ?', [fields.patient_id]);
    if (!patient || patient.email !== fields.email) throw new ApiError(400, 'El correo de la cuenta debe coincidir con el del paciente');
  }
  return get(resource, await repo.insert(config(resource).table, fields));
}
async function edit(resource, recordId, body) {
  if (resource === 'users') throw new ApiError(403, 'Las credenciales no se modifican por este recurso');
  const fields = parseFields(config(resource), body || {}, true);
  if (!await repo.update(config(resource).table, v.id(recordId), fields)) throw new ApiError(404, 'Registro no encontrado');
  return get(resource, recordId);
}
async function erase(resource, recordId) {
  if (resource === 'users') throw new ApiError(403, 'La eliminación de cuentas requiere procedimiento administrativo');
  if (!await repo.remove(config(resource).table, v.id(recordId))) throw new ApiError(404, 'Registro no encontrado');
}
module.exports = { definitions, list, get, create, edit, erase };
