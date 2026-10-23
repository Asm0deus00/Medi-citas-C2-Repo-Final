const asyncHandler = require('../utils/async-handler');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');
const ownership = require('../repositories/ownership.repository');

function isAdmin(user) {
  return user.role === 'admin';
}

function assertPatientAccess(user, patientId) {
  if (!isAdmin(user) && user.patientId !== validate.id(patientId)) {
    throw new ApiError(403, 'No puede acceder a datos de otro paciente');
  }
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return next(new ApiError(403, 'Solo administradores'));
  return next();
}

function requirePatientInParams(req, res, next) {
  try {
    assertPatientAccess(req.user, req.params.id);
    next();
  } catch (error) {
    next(error);
  }
}

function requirePatientInBody(req, res, next) {
  try {
    assertPatientAccess(req.user, req.body?.patient_id);
    next();
  } catch (error) {
    next(error);
  }
}

function requireRecordOwner({ findPatientId, readRecordId, notFoundMessage }) {
  return asyncHandler(async (req, res, next) => {
    if (isAdmin(req.user)) return next();
    const patientId = await findPatientId(readRecordId(req));
    if (patientId === null) throw new ApiError(404, notFoundMessage);
    assertPatientAccess(req.user, patientId);
    return next();
  });
}

const requireAppointmentOwner = requireRecordOwner({
  findPatientId: ownership.findPatientIdByAppointment,
  readRecordId: (req) => req.params.id,
  notFoundMessage: 'Cita no encontrada'
});

const requireAppointmentOwnerInBody = requireRecordOwner({
  findPatientId: ownership.findPatientIdByAppointment,
  readRecordId: (req) => req.body?.appointment_id,
  notFoundMessage: 'Cita no encontrada'
});

const requireReviewOwner = requireRecordOwner({
  findPatientId: ownership.findPatientIdByReview,
  readRecordId: (req) => req.params.id,
  notFoundMessage: 'Reseña no encontrada'
});

const requireMedicalResultOwner = requireRecordOwner({
  findPatientId: ownership.findPatientIdByMedicalResult,
  readRecordId: (req) => req.params.id,
  notFoundMessage: 'Resultado no encontrado'
});

module.exports = {
  assertPatientAccess,
  requireAdmin,
  requirePatientInParams,
  requirePatientInBody,
  requireAppointmentOwner,
  requireAppointmentOwnerInBody,
  requireReviewOwner,
  requireMedicalResultOwner
};
