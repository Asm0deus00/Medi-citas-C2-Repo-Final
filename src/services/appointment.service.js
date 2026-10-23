const repository = require('../repositories/base.repository');
const appointmentRepository = require('../repositories/appointment.repository');
const doctorRepository = require('../repositories/doctor.repository');
const patientRepository = require('../repositories/patient.repository');
const { runInTransaction } = require('../repositories/transaction');
const validate = require('../utils/validate');
const { buildFreeSlots } = require('../utils/schedule');
const { ApiError } = require('../utils/errors');
const {
  CLINIC_UTC_OFFSET,
  MAX_APPOINTMENT_MINUTES,
  DEFAULT_APPOINTMENT_MINUTES
} = require('../config/constants');

const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'];

async function list(patientId, date) {
  return appointmentRepository.findAll({
    patientId: patientId === undefined ? undefined : validate.id(patientId),
    date: date === undefined ? undefined : validate.date(date)
  });
}

async function get(appointmentId) {
  const appointment = await repository.one('appointments', validate.id(appointmentId));
  if (!appointment) throw new ApiError(404, 'Cita no encontrada');
  return appointment;
}

async function availability(doctorId, date) {
  const validDoctorId = validate.id(doctorId);
  const validDate = validate.date(date);
  if (!(await doctorRepository.isActive(validDoctorId))) {
    throw new ApiError(404, 'Médico no disponible');
  }

  const workingBlocks = await doctorRepository.findWorkingBlocks(validDoctorId, validDate);
  const busyRanges = await appointmentRepository.findBusyRanges(validDoctorId, validDate);
  const slots = buildFreeSlots({
    date: validDate,
    workingBlocks,
    busyRanges,
    utcOffset: CLINIC_UTC_OFFSET
  });
  return { doctor_id: validDoctorId, date: validDate, slots };
}

function parseBooking(body) {
  const startsAt = validate.dateTime(body.starts_at);
  const startsAtInstant = new Date(`${startsAt.replace(' ', 'T')}${CLINIC_UTC_OFFSET}`);
  if (startsAtInstant.getTime() <= Date.now()) {
    throw new ApiError(400, 'No se permiten citas en fechas pasadas');
  }

  const durationMinutes = validate.integer(
    body.duration_minutes ?? DEFAULT_APPOINTMENT_MINUTES,
    'duration_minutes'
  );
  if (durationMinutes > MAX_APPOINTMENT_MINUTES) {
    throw new ApiError(400, `Duración máxima: ${MAX_APPOINTMENT_MINUTES} minutos`);
  }

  return {
    patientId: validate.id(body.patient_id),
    doctorId: validate.id(body.doctor_id),
    startsAt,
    durationMinutes
  };
}

async function lockBookableDoctor(connection, { patientId, doctorId }) {
  const patientExists = await patientRepository.exists(connection, patientId);
  const doctor = await doctorRepository.lockForBooking(connection, doctorId);
  if (!patientExists || !doctor || !doctor.active) {
    throw new ApiError(400, 'Paciente o médico no disponible');
  }
  return doctor;
}

async function create(body) {
  const booking = parseBooking(body);
  const appointmentId = await runInTransaction(async (connection) => {
    const doctor = await lockBookableDoctor(connection, booking);
    if (await appointmentRepository.hasConflict(connection, booking)) {
      throw new ApiError(409, 'El médico ya tiene una cita en ese horario');
    }
    if (!(await doctorRepository.hasWorkingBlockFor(connection, booking))) {
      throw new ApiError(409, 'La cita está fuera del horario de atención del médico');
    }
    return appointmentRepository.insertScheduled(connection, booking, doctor.consultation_price);
  });
  return get(appointmentId);
}

async function edit(appointmentId, body) {
  const current = await get(appointmentId);
  const status = validate.choice(body?.status, 'status', APPOINTMENT_STATUSES);
  if (current.status === 'completed' && status !== 'completed') {
    throw new ApiError(409, 'Una cita atendida no puede reabrirse');
  }
  await repository.update('appointments', current.id, { status });
  return get(current.id);
}

async function erase(appointmentId) {
  const appointment = await get(appointmentId);
  await repository.remove('appointments', appointment.id);
}

module.exports = { list, get, create, edit, erase, availability };
