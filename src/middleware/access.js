const crypto = require('node:crypto');
const { ApiError } = require('../utils/errors');
const validate = require('../utils/validate');
const secret = () => process.env.SESSION_SECRET;
function makeToken(user) {
  if (!secret() || secret().length < 32) throw new ApiError(500, 'SESSION_SECRET debe tener al menos 32 caracteres');
  const payload = Buffer.from(JSON.stringify({ id: user.id, patientId: user.patient_id, role: user.role, exp: Date.now() + 3600000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function authenticate(req, res, next) {
  try {
    const token = /^Bearer (.+)$/i.exec(req.get('authorization') || '')?.[1];
    if (!token || !secret() || secret().length < 32) throw new ApiError(401, 'Sesión requerida');
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) throw new ApiError(401, 'Token inválido');
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new ApiError(401, 'Token inválido');
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Number.isInteger(user.id) || user.exp <= Date.now() || !['patient', 'admin'].includes(user.role)) throw new ApiError(401, 'Sesión expirada');
    req.user = user;
    next();
  } catch (error) { next(error.status ? error : new ApiError(401, 'Token inválido')); }
}
function admin(req, res, next) { if (req.user.role !== 'admin') return next(new ApiError(403, 'Solo administradores')); next(); }
function owner(req, patientId) { if (req.user.role !== 'admin' && req.user.patientId !== validate.id(patientId)) throw new ApiError(403, 'No puede acceder a datos de otro paciente'); }
module.exports = { makeToken, authenticate, admin, owner };
