const asyncHandler = require('../utils/async-handler');

// serviceArguments se antepone a los argumentos del servicio (p. ej. el nombre del recurso)
function createCrudController(service, ...serviceArguments) {
  return {
    get: asyncHandler(async (req, res) => {
      res.json(await service.get(...serviceArguments, req.params.id));
    }),
    create: asyncHandler(async (req, res) => {
      res.status(201).json(await service.create(...serviceArguments, req.body));
    }),
    edit: asyncHandler(async (req, res) => {
      res.json(await service.edit(...serviceArguments, req.params.id, req.body));
    }),
    erase: asyncHandler(async (req, res) => {
      await service.erase(...serviceArguments, req.params.id);
      res.status(204).end();
    })
  };
}

// El paciente solo consulta lo suyo; el administrador puede filtrar por patientId
function resolvePatientFilter(req) {
  return req.user.role === 'admin' ? req.query.patientId : req.user.patientId;
}

module.exports = { createCrudController, resolvePatientFilter };
