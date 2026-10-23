const repository = require('../repositories/base.repository');
const reviewRepository = require('../repositories/review.repository');
const { runInTransaction } = require('../repositories/transaction');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

async function list(patientId) {
  return reviewRepository.findAllWithAppointment(patientId == null ? null : validate.id(patientId));
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
  const appointmentStatus = await reviewRepository.findAppointmentStatus(appointmentId);
  if (appointmentStatus !== 'completed') {
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

async function setTags(reviewId, tagIds) {
  const validReviewId = validate.id(reviewId);
  await get(validReviewId);
  if (!Array.isArray(tagIds)) throw new ApiError(400, 'tags debe ser una lista de identificadores');
  const uniqueTagIds = [...new Set(tagIds.map((tagId) => validate.id(tagId)))];

  await runInTransaction(async (connection) => {
    if (
      (await reviewRepository.countExistingTags(connection, uniqueTagIds)) !== uniqueTagIds.length
    ) {
      throw new ApiError(400, 'Una o más etiquetas no existen');
    }
    await reviewRepository.replaceTags(connection, validReviewId, uniqueTagIds);
  });
  return getTags(validReviewId);
}

async function getTags(reviewId) {
  const validReviewId = validate.id(reviewId);
  await get(validReviewId);
  return reviewRepository.findTags(validReviewId);
}

async function erase(reviewId) {
  const deleted = await repository.remove('reviews', validate.id(reviewId));
  if (!deleted) throw new ApiError(404, 'Reseña no encontrada');
}

module.exports = { list, get, create, edit, erase, getTags, setTags };
