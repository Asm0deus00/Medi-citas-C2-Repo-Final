const pool = require('../config/database');

// Lunes = 1 ... domingo = 0, igual que doctor_schedules.weekday
const WEEKDAY_SQL = 'MOD(WEEKDAY(?) + 1, 7)';

async function isActive(doctorId) {
  const [doctors] = await pool.query('SELECT id FROM doctors WHERE id = ? AND active = 1', [
    doctorId
  ]);
  return doctors.length > 0;
}

async function findActiveWithSchedules() {
  const [doctors] = await pool.query(`
    SELECT doctor.id, doctor.full_name, doctor.specialty_id,
           specialty.name AS specialty_name, doctor.schedule_description,
           doctor.consultation_price, doctor.profile, doctor.active
    FROM doctors AS doctor
    INNER JOIN specialties AS specialty ON specialty.id = doctor.specialty_id
    WHERE doctor.active = 1
    ORDER BY doctor.full_name
  `);
  const [schedules] = await pool.query(
    'SELECT doctor_id, weekday, start_time, end_time FROM doctor_schedules ORDER BY weekday, start_time'
  );
  return doctors.map((doctor) => ({
    ...doctor,
    schedules: schedules.filter((schedule) => schedule.doctor_id === doctor.id)
  }));
}

async function findWorkingBlocks(doctorId, date) {
  const [blocks] = await pool.query(
    `SELECT start_time, end_time FROM doctor_schedules
     WHERE doctor_id = ? AND weekday = ${WEEKDAY_SQL} ORDER BY start_time`,
    [doctorId, date]
  );
  return blocks;
}

async function lockForBooking(connection, doctorId) {
  const [doctors] = await connection.query(
    'SELECT consultation_price, active FROM doctors WHERE id = ? FOR UPDATE',
    [doctorId]
  );
  return doctors[0] || null;
}

async function hasWorkingBlockFor(connection, { doctorId, startsAt, durationMinutes }) {
  const [blocks] = await connection.query(
    `SELECT id FROM doctor_schedules
     WHERE doctor_id = ? AND weekday = ${WEEKDAY_SQL}
       AND TIME(?) >= start_time
       AND TIME(DATE_ADD(?, INTERVAL ? MINUTE)) <= end_time
       AND DATE(DATE_ADD(?, INTERVAL ? MINUTE)) = DATE(?)
     LIMIT 1`,
    [doctorId, startsAt, startsAt, startsAt, durationMinutes, startsAt, durationMinutes, startsAt]
  );
  return blocks.length > 0;
}

module.exports = {
  isActive,
  findActiveWithSchedules,
  findWorkingBlocks,
  lockForBooking,
  hasWorkingBlockFor
};
