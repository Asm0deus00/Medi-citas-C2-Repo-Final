const pool = require('../config/database');

async function findAllWithAppointment(patientId) {
  const filterByPatient = patientId !== null;
  const [reviews] = await pool.query(
    `SELECT review.*, appointment.doctor_id, appointment.patient_id
     FROM reviews AS review
     INNER JOIN appointments AS appointment ON appointment.id = review.appointment_id
     ${filterByPatient ? 'WHERE appointment.patient_id = ?' : ''}
     ORDER BY review.id DESC`,
    filterByPatient ? [patientId] : []
  );
  return reviews;
}

async function findAppointmentStatus(appointmentId) {
  const [appointments] = await pool.query('SELECT status FROM appointments WHERE id = ?', [
    appointmentId
  ]);
  return appointments.length ? appointments[0].status : null;
}

async function countExistingTags(connection, tagIds) {
  if (!tagIds.length) return 0;
  const placeholders = tagIds.map(() => '?').join(', ');
  const [tags] = await connection.query(
    `SELECT id FROM review_tags WHERE id IN (${placeholders})`,
    tagIds
  );
  return tags.length;
}

async function replaceTags(connection, reviewId, tagIds) {
  await connection.query('DELETE FROM review_tag_assignments WHERE review_id = ?', [reviewId]);
  for (const tagId of tagIds) {
    await connection.query('INSERT INTO review_tag_assignments (review_id, tag_id) VALUES (?, ?)', [
      reviewId,
      tagId
    ]);
  }
}

async function findTags(reviewId) {
  const [tags] = await pool.query(
    `SELECT tag.id, tag.name
     FROM review_tags AS tag
     INNER JOIN review_tag_assignments AS assignment ON assignment.tag_id = tag.id
     WHERE assignment.review_id = ? ORDER BY tag.name`,
    [reviewId]
  );
  return tags;
}

module.exports = {
  findAllWithAppointment,
  findAppointmentStatus,
  countExistingTags,
  replaceTags,
  findTags
};
