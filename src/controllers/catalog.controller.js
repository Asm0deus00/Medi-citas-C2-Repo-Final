const service = require('../services/catalog.service');
const wrap = require('../utils/wrap');
module.exports = {
  list: wrap(async (req, res) => res.json(await service.list(req.params.resource, req.query))),
  get: wrap(async (req, res) => res.json(await service.get(req.params.resource, req.params.id))),
  create: wrap(async (req, res) => res.status(201).json(await service.create(req.params.resource, req.body))),
  edit: wrap(async (req, res) => res.json(await service.edit(req.params.resource, req.params.id, req.body))),
  erase: wrap(async (req, res) => { await service.erase(req.params.resource, req.params.id); res.status(204).end(); })
};
