const pool = require('../config/database');

async function findAll({ patientId, date }) {
  const conditions = [];
  const parameters = [];
  if (patientId !== undefined) {
    conditions.push('patient_id = ?');
    parameters.push(patientId);
  }
  if (date !== undefined) {
    conditions.push('DATE(starts_at) = ?');
    parameters.push(date);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [appointments] = await pool.query(
    `SELECT * FROM appointments ${whereClause} ORDER BY starts_at DESC`,
    parameters
  );
  return appointments;
}

async function findBusyRanges(doctorId, date) {
  const [busyRanges] = await pool.query(
    `SELECT HOUR(starts_at) * 60 + MINUTE(starts_at) AS startMinute,
            duration_minutes AS durationMinutes
     FROM appointments
     WHERE doctor_id = ? AND status <> 'cancelled' AND DATE(starts_at) = ?`,
    [doctorId, date]
  );
  return busyRanges;
}

async function hasConflict(connection, { doctorId, startsAt, durationMinutes }) {
  const [conflicts] = await connection.query(
    `SELECT id FROM appointments
     WHERE doctor_id = ? AND status <> 'cancelled'
       AND starts_at < DATE_ADD(?, INTERVAL ? MINUTE)
       AND DATE_ADD(starts_at, INTERVAL duration_minutes MINUTE) > ?
     LIMIT 1`,
    [doctorId, startsAt, durationMinutes, startsAt]
  );
  return conflicts.length > 0;
}

async function insertScheduled(connection, booking, priceAtBooking) {
  const [result] = await connection.query(
    `INSERT INTO appointments
       (patient_id, doctor_id, starts_at, duration_minutes, price_at_booking, status)
     VALUES (?, ?, ?, ?, ?, 'scheduled')`,
    [booking.patientId, booking.doctorId, booking.startsAt, booking.durationMinutes, priceAtBooking]
  );
  return result.insertId;
}

module.exports = { findAll, findBusyRanges, hasConflict, insertScheduled };
