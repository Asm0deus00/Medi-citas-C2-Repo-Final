const path = require('node:path');

module.exports = Object.freeze({
  JSON_BODY_LIMIT: '1mb',
  CLINIC_UTC_OFFSET: '-05:00',
  SLOT_MINUTES: 30,
  MAX_APPOINTMENT_MINUTES: 240,
  DEFAULT_APPOINTMENT_MINUTES: 30,
  TOKEN_TTL_MS: 60 * 60 * 1000,
  MIN_SECRET_LENGTH: 32,
  PRIVATE_IMAGES_DIR: process.env.PRIVATE_IMAGES_DIR
    ? path.resolve(process.env.PRIVATE_IMAGES_DIR)
    : path.resolve(__dirname, '../../private_images')
});
