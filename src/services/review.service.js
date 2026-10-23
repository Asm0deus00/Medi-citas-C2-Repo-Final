const pool = require('../config/database');
const repository = require('../repositories/base.repository');
const { runInTransaction } = require('../repositories/transaction');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

async function list(patientId) {
  const filterByPatient = patientId != null;
  const [reviews] = await pool.query(
    `SELECT review.*, appointment.doctor_id, appointment.patient_id
     FROM reviews AS review
     INNER JOIN appointments AS appointment ON appointment.id = review.appointment_id
     ${filterByPatient ? 'WHERE appointment.patient_id = ?' : ''}
     ORDER BY review.id DESC`,
    filterByPatient ? [validate.id(patientId)] : []
  );
  return reviews;
}

async function get(reviewId) {
  const review = await repository.one('reviews', validate.id(reviewId));
  if (!review) throw new ApiError(404, 'Reseña no encontrada');
  return review;
}

async function create(body) {
  const appointmentId = validate.id(body.appointment_id);
  const rating = validate.integer(body.rating, 'rating');
  if (rating < 1 || rating > 5) throw new ApiError(400, 'La calificación debe estar entre 1 y 5');

  const comment = validate.optionalText(body.comment, 'comment', 2000);
  const waitMinutes =
    body.wait_minutes == null ? null : validate.integer(body.wait_minutes, 'wait_minutes', 0);
  const [[appointment]] = await pool.query('SELECT status FROM appointments WHERE id = ?', [
    appointmentId
  ]);
  if (!appointment || appointment.status !== 'completed') {
    throw new ApiError(409, 'Solo se puede reseñar una cita atendida');
  }

  const reviewId = await repository.insert('reviews', {
    appointment_id: appointmentId,
    rating,
    comment,
    wait_minutes: waitMinutes
  });
  return get(reviewId);
}

async function edit(reviewId, body) {
  const updatedFields = {};
  if (body.rating !== undefined) {
    updatedFields.rating = validate.integer(body.rating, 'rating');
    if (updatedFields.rating > 5) throw new ApiError(400, 'Calificación inválida');
  }
  if (body.comment !== undefined)
    updatedFields.comment = validate.optionalText(body.comment, 'comment', 2000);
  if (body.wait_minutes !== undefined) {
    updatedFields.wait_minutes =
      body.wait_minutes === null ? null : validate.integer(body.wait_minutes, 'wait_minutes', 0);
  }
  if (!Object.keys(updatedFields).length) throw new ApiError(400, 'Sin campos para actualizar');

  const updated = await repository.update('reviews', validate.id(reviewId), updatedFields);
  if (!updated) throw new ApiError(404, 'Reseña no encontrada');
  return get(reviewId);
}

async function assertTagsExist(connection, tagIds) {
  if (!tagIds.length) return;
  const placeholders = tagIds.map(() => '?').join(', ');
  const [existingTags] = await connection.query(
    `SELECT id FROM review_tags WHERE id IN (${placeholders})`,
    tagIds
  );
  if (existingTags.length !== tagIds.length)
    throw new ApiError(400, 'Una o más etiquetas no existen');
}

async function setTags(reviewId, tagIds) {
  const validReviewId = validate.id(reviewId);
  await get(validReviewId);
  if (!Array.isArray(tagIds)) throw new ApiError(400, 'tags debe ser una lista de identificadores');
  const uniqueTagIds = [...new Set(tagIds.map((tagId) => validate.id(tagId)))];

  await runInTransaction(async (connection) => {
    await assertTagsExist(connection, uniqueTagIds);
    await connection.query('DELETE FROM review_tag_assignments WHERE review_id = ?', [
      validReviewId
    ]);
    for (const tagId of uniqueTagIds) {
      await connection.query(
        'INSERT INTO review_tag_assignments (review_id, tag_id) VALUES (?, ?)',
        [validReviewId, tagId]
      );
    }
  });
  return getTags(validReviewId);
}

async function getTags(reviewId) {
  const validReviewId = validate.id(reviewId);
  await get(validReviewId);
  const [tags] = await pool.query(
    `SELECT tag.id, tag.name
     FROM review_tags AS tag
     INNER JOIN review_tag_assignments AS assignment ON assignment.tag_id = tag.id
     WHERE assignment.review_id = ? ORDER BY tag.name`,
    [validReviewId]
  );
  return tags;
}

async function erase(reviewId) {
  const deleted = await repository.remove('reviews', validate.id(reviewId));
  if (!deleted) throw new ApiError(404, 'Reseña no encontrada');
}

module.exports = { list, get, create, edit, erase, getTags, setTags };
