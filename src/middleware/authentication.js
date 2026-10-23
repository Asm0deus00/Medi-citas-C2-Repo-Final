const crypto = require('node:crypto');
const { ApiError } = require('../utils/errors');
const { TOKEN_TTL_MS, MIN_SECRET_LENGTH } = require('../config/constants');

const VALID_ROLES = ['patient', 'admin'];

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new ApiError(500, `SESSION_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest();
}

function createToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      patientId: user.patient_id,
      role: user.role,
      exp: Date.now() + TOKEN_TTL_MS
    })
  ).toString('base64url');
  return `${payload}.${sign(payload).toString('base64url')}`;
}

function readBearerToken(req) {
  const match = /^Bearer (.+)$/i.exec(req.get('authorization') || '');
  if (!match) throw new ApiError(401, 'Sesión requerida');
  return match[1];
}

function verifyToken(token) {
  const [payload, signature, extraPart] = token.split('.');
  if (!payload || !signature || extraPart) throw new ApiError(401, 'Token inválido');

  const expectedSignature = sign(payload);
  const receivedSignature = Buffer.from(signature, 'base64url');
  const signatureIsValid =
    receivedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(receivedSignature, expectedSignature);
  if (!signatureIsValid) throw new ApiError(401, 'Token inválido');

  const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const isSessionValid =
    Number.isInteger(user.id) && user.exp > Date.now() && VALID_ROLES.includes(user.role);
  if (!isSessionValid) throw new ApiError(401, 'Sesión expirada');
  return user;
}

function authenticate(req, res, next) {
  try {
    req.user = verifyToken(readBearerToken(req));
    next();
  } catch (error) {
    next(error.status ? error : new ApiError(401, 'Token inválido'));
  }
}

module.exports = { createToken, authenticate };
