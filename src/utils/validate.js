const { ApiError } = require('./errors');
const requiredText = (value, field, limit = 255) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new ApiError(400, `${field} es obligatorio (máximo ${limit} caracteres)`);
  return value.trim();
};
const optionalText = (value, field, limit = 255) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > limit) throw new ApiError(400, `${field} no es válido`);
  return value.trim();
};
const integer = (value, field, min = 1) => {
  if (!Number.isSafeInteger(Number(value)) || value === '' || value == null || Number(value) < min) throw new ApiError(400, `${field} debe ser un entero mayor o igual a ${min}`);
  return Number(value);
};
const id = (value) => integer(value, 'id');
const email = (value) => {
  const result = requiredText(value, 'email', 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ApiError(400, 'Correo inválido');
  return result;
};
const dateTime = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?$/.test(value) || Number.isNaN(Date.parse(value))) throw new ApiError(400, 'La fecha debe ser YYYY-MM-DDTHH:mm');
  return value.replace('T', ' ');
};
const choice = (value, field, allowed) => {
  if (!allowed.includes(value)) throw new ApiError(400, `${field}: use ${allowed.join(', ')}`);
  return value;
};
const price = (value) => {
  const n = Number(value);
  if (value == null || value === '' || !Number.isFinite(n) || n < 0) throw new ApiError(400, 'Precio inválido');
  return n;
};
const measurement = (value, field) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value))) throw new ApiError(400, `${field} debe ser un número`);
  const n = Number(value);
  if (Math.abs(n) > 999999999) throw new ApiError(400, `${field} fuera de rango`);
  return n;
};
module.exports = { requiredText, optionalText, integer, id, email, dateTime, choice, price, measurement };
