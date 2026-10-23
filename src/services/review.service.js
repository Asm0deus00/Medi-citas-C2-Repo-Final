const pool = require('../config/database');
const repository = require('../repositories/base.repository');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

async function list(patientId) {
  const query = patientId == null
    ? {
        sql: `SELECT review.*, appointment.doctor_id, appointment.patient_id
              FROM reviews AS review
              INNER JOIN appointments AS appointment ON appointment.id = review.appointment_id
              ORDER BY review.id DESC`,
        parameters: []
      }
    : {
        sql: `SELECT review.*, appointment.doctor_id, appointment.patient_id
              FROM reviews AS review
              INNER JOIN appointments AS appointment ON appointment.id = review.appointment_id
              WHERE appointment.patient_id = ?
              ORDER BY review.id DESC`,
        parameters: [validate.id(patientId)]
      };
  const [reviews] = await pool.query(query.sql, query.parameters);
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
  const waitMinutes = body.wait_minutes == null ? null : validate.integer(body.wait_minutes, 'wait_minutes', 0);
  const [[appointment]] = await pool.query('SELECT status FROM appointments WHERE id = ?', [appointmentId]);
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
  if (body.comment !== undefined) updatedFields.comment = validate.optionalText(body.comment, 'comment', 2000);
  if (body.wait_minutes !== undefined) {
    updatedFields.wait_minutes = body.wait_minutes === null ? null : validate.integer(body.wait_minutes, 'wait_minutes', 0);
  }
  if (!Object.keys(updatedFields).length) throw new ApiError(400, 'Sin campos para actualizar');

  const updated = await repository.update('reviews', validate.id(reviewId), updatedFields);
  if (!updated) throw new ApiError(404, 'Reseña no encontrada');
  return get(reviewId);
}

async function setTags(reviewId, tagIds) {
  const numericReviewId = validate.id(reviewId);
  await get(numericReviewId);
  if (!Array.isArray(tagIds)) throw new ApiError(400, 'tags debe ser una lista de identificadores');
  const uniqueTagIds = [...new Set(tagIds.map(tagId => validate.id(tagId)))];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    if (uniqueTagIds.length) {
      const placeholders = uniqueTagIds.map(() => '?').join(', ');
      const [existingTags] = await connection.query(
        `SELECT id FROM review_tags WHERE id IN (${placeholders})`,
        uniqueTagIds
      );
      if (existingTags.length !== uniqueTagIds.length) throw new ApiError(400, 'Una o más etiquetas no existen');
    }
    await connection.query('DELETE FROM review_tag_assignments WHERE review_id = ?', [numericReviewId]);
    for (const tagId of uniqueTagIds) {
      await connection.query(
        'INSERT INTO review_tag_assignments (review_id, tag_id) VALUES (?, ?)',
        [numericReviewId, tagId]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getTags(numericReviewId);
}

async function getTags(reviewId) {
  const numericReviewId = validate.id(reviewId);
  await get(numericReviewId);
  const [tags] = await pool.query(
    `SELECT tag.id, tag.name
     FROM review_tags AS tag
     INNER JOIN review_tag_assignments AS assignment ON assignment.tag_id = tag.id
     WHERE assignment.review_id = ? ORDER BY tag.name`,
    [numericReviewId]
  );
  return tags;
}

async function erase(reviewId) {
  const deleted = await repository.remove('reviews', validate.id(reviewId));
  if (!deleted) throw new ApiError(404, 'Reseña no encontrada');
}

module.exports = { list, get, create, edit, erase, getTags, setTags };
