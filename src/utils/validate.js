const { ApiError } = require('./errors');

function requiredText(value, field, limit = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) {
    throw new ApiError(400, `${field} es obligatorio (máximo ${limit} caracteres)`);
  }
  return value.trim();
}

function optionalText(value, field, limit = 255) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > limit) {
    throw new ApiError(400, `${field} no es válido`);
  }
  return value.trim();
}

function integer(value, field, min = 1) {
  if (
    value === '' ||
    value == null ||
    typeof value === 'boolean' ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min
  ) {
    throw new ApiError(400, `${field} debe ser un entero mayor o igual a ${min}`);
  }
  return Number(value);
}

function id(value) {
  return integer(value, 'id');
}

function email(value) {
  const normalizedEmail = requiredText(value, 'email', 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ApiError(400, 'Correo inválido');
  }
  return normalizedEmail;
}

function dateTime(value) {
  const pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
  const match = typeof value === 'string' ? pattern.exec(value) : null;
  if (!match) throw new ApiError(400, 'La fecha debe ser YYYY-MM-DDTHH:mm');

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '00'] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new ApiError(400, 'La fecha u hora no existe');
  }
  return value.replace('T', ' ').slice(0, 19);
}

function date(value) {
  const invalid = new ApiError(400, 'Fecha inválida: use YYYY-MM-DD');
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid;
  const parsedDate = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw invalid;
  }
  return value;
}

function choice(value, field, allowed) {
  if (!allowed.includes(value)) throw new ApiError(400, `${field}: use ${allowed.join(', ')}`);
  return value;
}

function price(value) {
  const numericPrice = Number(value);
  if (value == null || value === '' || !Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new ApiError(400, 'Precio inválido');
  }
  return numericPrice;
}

function measurement(value, field) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    typeof value === 'boolean' ||
    !Number.isFinite(Number(value))
  ) {
    throw new ApiError(400, `${field} debe ser un número`);
  }
  const numericValue = Number(value);
  if (Math.abs(numericValue) > 999999999) throw new ApiError(400, `${field} fuera de rango`);
  return numericValue;
}

module.exports = {
  requiredText,
  optionalText,
  integer,
  id,
  email,
  date,
  dateTime,
  choice,
  price,
  measurement
};
