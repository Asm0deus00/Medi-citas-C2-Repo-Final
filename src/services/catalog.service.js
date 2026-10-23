const repository = require('../repositories/base.repository');
const doctorRepository = require('../repositories/doctor.repository');
const patientRepository = require('../repositories/patient.repository');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

const RESOURCE_DEFINITIONS = Object.freeze({
  specialties: { table: 'specialties', fields: { name: 'text' } },
  review_tags: { table: 'review_tags', fields: { name: 'text' } },
  doctors: {
    table: 'doctors',
    fields: {
      full_name: 'text',
      specialty_id: 'id',
      schedule_description: 'text',
      consultation_price: 'price',
      profile: 'optional',
      active: 'flag'
    }
  },
  patients: { table: 'patients', fields: { full_name: 'text', email: 'email', phone: 'optional' } },
  users: {
    table: 'users',
    fields: { patient_id: 'id', email: 'email', password: 'text', role: 'role' }
  },
  doctor_schedules: {
    table: 'doctor_schedules',
    fields: { doctor_id: 'id', weekday: 'weekday', start_time: 'time', end_time: 'time' }
  }
});

function getResourceDefinition(resourceName) {
  const definition = RESOURCE_DEFINITIONS[resourceName];
  if (!definition) throw new ApiError(404, 'Recurso desconocido');
  return definition;
}

function parseFields(definition, body, partial = false) {
  const parsedFields = {};
  for (const [fieldName, fieldType] of Object.entries(definition.fields)) {
    if (partial && body[fieldName] === undefined) continue;
    const fieldValue = body[fieldName];
    switch (fieldType) {
      case 'text':
        parsedFields[fieldName] = validate.requiredText(fieldValue, fieldName);
        break;
      case 'optional':
        parsedFields[fieldName] = validate.optionalText(fieldValue, fieldName, 1000);
        break;
      case 'id':
        parsedFields[fieldName] = validate.id(fieldValue);
        break;
      case 'email':
        parsedFields[fieldName] = validate.email(fieldValue);
        break;
      case 'price':
        parsedFields[fieldName] = validate.price(fieldValue);
        break;
      case 'flag':
        parsedFields[fieldName] = validate.choice(fieldValue, fieldName, [0, 1]);
        break;
      case 'role':
        parsedFields[fieldName] = validate.choice(fieldValue, fieldName, ['patient', 'admin']);
        break;
      case 'weekday':
        parsedFields[fieldName] = validate.integer(fieldValue, fieldName, 0);
        break;
      case 'time':
        if (typeof fieldValue !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fieldValue)) {
          throw new ApiError(400, `Horario ${fieldName} inválido`);
        }
        parsedFields[fieldName] = fieldValue;
        break;
      default:
        throw new ApiError(500, `Tipo de campo no configurado: ${fieldType}`);
    }
  }

  if (!Object.keys(parsedFields).length) throw new ApiError(400, 'No hay campos para actualizar');
  if (parsedFields.weekday != null && parsedFields.weekday > 6)
    throw new ApiError(400, 'Día fuera de rango');
  if (
    parsedFields.start_time &&
    parsedFields.end_time &&
    parsedFields.start_time >= parsedFields.end_time
  ) {
    throw new ApiError(400, 'Horario inválido');
  }
  return parsedFields;
}

function omitPassword(user) {
  const publicUser = { ...user };
  delete publicUser.password;
  return publicUser;
}

async function searchPatients(searchText) {
  const searchTerm = validate.requiredText(searchText, 'search', 100);
  return patientRepository.searchByNameOrEmail(searchTerm);
}

async function list(resourceName, query = {}) {
  getResourceDefinition(resourceName);
  if (resourceName === 'doctors') return doctorRepository.findActiveWithSchedules();
  if (resourceName === 'patients' && query.search !== undefined) {
    return searchPatients(query.search);
  }

  const records = await repository.all(resourceName);
  return resourceName === 'users' ? records.map(omitPassword) : records;
}

async function get(resourceName, recordId) {
  const definition = getResourceDefinition(resourceName);
  const record = await repository.one(definition.table, validate.id(recordId));
  if (!record) throw new ApiError(404, 'Registro no encontrado');
  return resourceName === 'users' ? omitPassword(record) : record;
}

async function create(resourceName, body) {
  const definition = getResourceDefinition(resourceName);
  if (resourceName === 'users' && body.role !== 'patient') {
    throw new ApiError(403, 'El alta pública permite solamente pacientes');
  }

  const fields = parseFields(definition, body || {});
  if (resourceName === 'users') {
    const patientEmail = await patientRepository.findEmailById(fields.patient_id);
    if (patientEmail !== fields.email) {
      throw new ApiError(400, 'El correo de la cuenta debe coincidir con el del paciente');
    }
  }
  return get(resourceName, await repository.insert(definition.table, fields));
}

async function edit(resourceName, recordId, body) {
  const definition = getResourceDefinition(resourceName);
  if (resourceName === 'users')
    throw new ApiError(403, 'Las credenciales no se modifican por este recurso');
  const fields = parseFields(definition, body || {}, true);
  const updated = await repository.update(definition.table, validate.id(recordId), fields);
  if (!updated) throw new ApiError(404, 'Registro no encontrado');
  return get(resourceName, recordId);
}

async function erase(resourceName, recordId) {
  const definition = getResourceDefinition(resourceName);
  if (resourceName === 'users')
    throw new ApiError(403, 'La eliminación de cuentas requiere procedimiento administrativo');
  const deleted = await repository.remove(definition.table, validate.id(recordId));
  if (!deleted) throw new ApiError(404, 'Registro no encontrado');
}

module.exports = { list, get, create, edit, erase };
