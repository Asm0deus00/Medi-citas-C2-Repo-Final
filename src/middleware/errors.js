const { ApiError } = require('../utils/errors');
function errorHandler(error, req, res, next) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El registro ya existe' });
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Referencia inexistente' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
module.exports = errorHandler;
