const pool = require('../config/database');
const repository = require('../repositories/base.repository');
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
// Lunes = 1 ... domingo = 0, igual que doctor_schedules.weekday
const WEEKDAY_SQL = 'MOD(WEEKDAY(?) + 1, 7)';

async function list(patientId, date) {
  const conditions = [];
  const parameters = [];
  if (patientId !== undefined) {
    conditions.push('patient_id = ?');
    parameters.push(validate.id(patientId));
  }
  if (date !== undefined) {
    conditions.push('DATE(starts_at) = ?');
    parameters.push(validate.date(date));
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [appointments] = await pool.query(
    `SELECT * FROM appointments ${whereClause} ORDER BY starts_at DESC`,
    parameters
  );
  return appointments;
}

async function get(appointmentId) {
  const appointment = await repository.one('appointments', validate.id(appointmentId));
  if (!appointment) throw new ApiError(404, 'Cita no encontrada');
  return appointment;
}

async function findActiveDoctor(doctorId) {
  const [doctors] = await pool.query('SELECT id FROM doctors WHERE id = ? AND active = 1', [
    doctorId
  ]);
  if (!doctors.length) throw new ApiError(404, 'Médico no disponible');
}

async function availability(doctorId, date) {
  const validDoctorId = validate.id(doctorId);
  const validDate = validate.date(date);
  await findActiveDoctor(validDoctorId);

  const [workingBlocks] = await pool.query(
    `SELECT start_time, end_time FROM doctor_schedules
     WHERE doctor_id = ? AND weekday = ${WEEKDAY_SQL} ORDER BY start_time`,
    [validDoctorId, validDate]
  );
  const [busyRanges] = await pool.query(
    `SELECT HOUR(starts_at) * 60 + MINUTE(starts_at) AS startMinute,
            duration_minutes AS durationMinutes
     FROM appointments
     WHERE doctor_id = ? AND status <> 'cancelled' AND DATE(starts_at) = ?`,
    [validDoctorId, validDate]
  );

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
  const [[patient]] = await connection.query('SELECT id FROM patients WHERE id = ?', [patientId]);
  const [[doctor]] = await connection.query(
    'SELECT consultation_price, active FROM doctors WHERE id = ? FOR UPDATE',
    [doctorId]
  );
  if (!patient || !doctor || !doctor.active) {
    throw new ApiError(400, 'Paciente o médico no disponible');
  }
  return doctor;
}

async function assertNoConflict(connection, { doctorId, startsAt, durationMinutes }) {
  const [conflicts] = await connection.query(
    `SELECT id FROM appointments
     WHERE doctor_id = ? AND status <> 'cancelled'
       AND starts_at < DATE_ADD(?, INTERVAL ? MINUTE)
       AND DATE_ADD(starts_at, INTERVAL duration_minutes MINUTE) > ?
     LIMIT 1`,
    [doctorId, startsAt, durationMinutes, startsAt]
  );
  if (conflicts.length) throw new ApiError(409, 'El médico ya tiene una cita en ese horario');
}

async function assertWithinSchedule(connection, { doctorId, startsAt, durationMinutes }) {
  const [blocks] = await connection.query(
    `SELECT id FROM doctor_schedules
     WHERE doctor_id = ? AND weekday = ${WEEKDAY_SQL}
       AND TIME(?) >= start_time
       AND TIME(DATE_ADD(?, INTERVAL ? MINUTE)) <= end_time
       AND DATE(DATE_ADD(?, INTERVAL ? MINUTE)) = DATE(?)
     LIMIT 1`,
    [doctorId, startsAt, startsAt, startsAt, durationMinutes, startsAt, durationMinutes, startsAt]
  );
  if (!blocks.length) {
    throw new ApiError(409, 'La cita está fuera del horario de atención del médico');
  }
}

async function insertAppointment(connection, booking, priceAtBooking) {
  const [result] = await connection.query(
    `INSERT INTO appointments
       (patient_id, doctor_id, starts_at, duration_minutes, price_at_booking, status)
     VALUES (?, ?, ?, ?, ?, 'scheduled')`,
    [booking.patientId, booking.doctorId, booking.startsAt, booking.durationMinutes, priceAtBooking]
  );
  return result.insertId;
}

async function create(body) {
  const booking = parseBooking(body);
  const appointmentId = await runInTransaction(async (connection) => {
    const doctor = await lockBookableDoctor(connection, booking);
    await assertNoConflict(connection, booking);
    await assertWithinSchedule(connection, booking);
    return insertAppointment(connection, booking, doctor.consultation_price);
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
