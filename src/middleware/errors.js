const { ApiError } = require('../utils/errors');

const DATABASE_ERRORS = Object.freeze({
  ER_DUP_ENTRY: { status: 409, message: 'El registro ya existe' },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'Referencia inexistente' },
  ER_ROW_IS_REFERENCED_2: { status: 409, message: 'El registro tiene datos asociados' }
});

function errorHandler(error, req, res, next) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });

  const databaseError = DATABASE_ERRORS[error.code];
  if (databaseError) return res.status(databaseError.status).json({ error: databaseError.message });

  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });

  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = errorHandler;
