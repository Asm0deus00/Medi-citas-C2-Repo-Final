const pool = require('../config/database');
const repo = require('../repositories/base.repository');
const v = require('../utils/validate');
const { ApiError } = require('../utils/errors');
async function list(patientId) {
  const [rows] = patientId == null ? await pool.query('SELECT r.*, a.doctor_id, a.patient_id FROM reviews r JOIN appointments a ON a.id = r.appointment_id ORDER BY r.id DESC') : await pool.query('SELECT r.*, a.doctor_id, a.patient_id FROM reviews r JOIN appointments a ON a.id = r.appointment_id WHERE a.patient_id = ? ORDER BY r.id DESC', [v.id(patientId)]);
  return rows;
}
async function get(id) { const review = await repo.one('reviews', v.id(id)); if (!review) throw new ApiError(404, 'Reseña no encontrada'); return review; }
async function create(body) {
  const appointmentId = v.id(body.appointment_id);
  const rating = v.integer(body.rating, 'rating');
  if (rating > 5) throw new ApiError(400, 'La calificación debe estar entre 1 y 5');
  const comment = v.optionalText(body.comment, 'comment', 2000);
  const waitMinutes = body.wait_minutes == null ? null : v.integer(body.wait_minutes, 'wait_minutes', 0);
  const [appointments] = await pool.query('SELECT status FROM appointments WHERE id = ?', [appointmentId]);
  if (!appointments.length || appointments[0].status !== 'completed') throw new ApiError(409, 'Solo se puede reseñar una cita atendida');
  const reviewId = await repo.insert('reviews', { appointment_id: appointmentId, rating, comment, wait_minutes: waitMinutes });
  return get(reviewId);
}
async function edit(id, body) {
  const fields = {};
  if (body.rating !== undefined) { fields.rating = v.integer(body.rating, 'rating'); if(fields.rating > 5) throw new ApiError(400,'Calificación inválida'); }
  if (body.comment !== undefined) fields.comment = v.optionalText(body.comment, 'comment', 2000);
  if (body.wait_minutes !== undefined) fields.wait_minutes = body.wait_minutes === null ? null : v.integer(body.wait_minutes, 'wait_minutes', 0);
  if (!Object.keys(fields).length) throw new ApiError(400, 'Sin campos');
  if (!await repo.update('reviews', v.id(id), fields)) throw new ApiError(404, 'Reseña no encontrada');
  return get(id);
}
async function setTags(id, tagIds) {
  await get(id);
  if (!Array.isArray(tagIds)) throw new ApiError(400, 'tags debe ser una lista de identificadores');
  const uniqueIds = [...new Set(tagIds.map(tagId => v.id(tagId)))];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM review_tag_assignments WHERE review_id = ?', [id]);
    for (const tagId of uniqueIds) {
      await connection.query('INSERT INTO review_tag_assignments (review_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  return getTags(id);
}
async function getTags(id) {
  await get(id);
  const [rows] = await pool.query('SELECT t.id, t.name FROM review_tags t JOIN review_tag_assignments a ON a.tag_id = t.id WHERE a.review_id = ?', [id]);
  return rows;
}
async function erase(id) { if(!await repo.remove('reviews',v.id(id))) throw new ApiError(404,'Reseña no encontrada'); }
module.exports = { list, get, create, edit, erase, getTags, setTags };
