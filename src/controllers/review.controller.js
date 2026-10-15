const service = require('../services/review.service');
const wrap = require('../utils/wrap');
module.exports = {
 list: wrap(async(req,res)=>res.json(await service.list(req.user.role === 'admin' ? null : req.user.patientId))),
 get: wrap(async(req,res)=>res.json(await service.get(req.params.id))),
 create: wrap(async(req,res)=>res.status(201).json(await service.create(req.body))),
 edit: wrap(async(req,res)=>res.json(await service.edit(req.params.id,req.body))),
 tags: wrap(async(req,res)=>res.json(await service.getTags(req.params.id))),
 setTags: wrap(async(req,res)=>res.json(await service.setTags(req.params.id,req.body.tags))),
 erase: wrap(async(req,res)=>{ await service.erase(req.params.id); res.status(204).end(); })
};
