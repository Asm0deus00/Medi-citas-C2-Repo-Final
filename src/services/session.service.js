const userRepository = require('../repositories/user.repository');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

async function verifyCredentials(body) {
  const email = validate.email(body?.email);
  const password = validate.requiredText(body?.password, 'password');
  const user = await userRepository.findByCredentials(email, password);
  if (!user) throw new ApiError(401, 'Credenciales incorrectas');
  return user;
}

module.exports = { verifyCredentials };
