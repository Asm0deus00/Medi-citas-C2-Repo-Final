const service = require('../services/appointment.service');
const wrap = require('../utils/wrap');
module.exports = {
 list: wrap(async(req,res)=>res.json(await service.list(req.query.patientId, req.query.date))),
 get: wrap(async(req,res)=>res.json(await service.get(req.params.id))),
 create: wrap(async(req,res)=>res.status(201).json(await service.create(req.body))),
 edit: wrap(async(req,res)=>res.json(await service.edit(req.params.id,req.body))),
 erase: wrap(async(req,res)=>{ await service.erase(req.params.id); res.status(204).end(); })
};
