const pool = require('../config/database');
const validate = require('../utils/validate');

async function findFirstPatientId(sql, recordId) {
  const [rows] = await pool.query(sql, [validate.id(recordId)]);
  return rows.length ? rows[0].patient_id : null;
}

function findPatientIdByAppointment(appointmentId) {
  return findFirstPatientId('SELECT patient_id FROM appointments WHERE id = ?', appointmentId);
}

function findPatientIdByReview(reviewId) {
  return findFirstPatientId(
    `SELECT appointment.patient_id
     FROM reviews AS review
     INNER JOIN appointments AS appointment ON appointment.id = review.appointment_id
     WHERE review.id = ?`,
    reviewId
  );
}

function findPatientIdByMedicalResult(resultId) {
  return findFirstPatientId('SELECT patient_id FROM medical_results WHERE id = ?', resultId);
}

module.exports = {
  findPatientIdByAppointment,
  findPatientIdByReview,
  findPatientIdByMedicalResult
};
