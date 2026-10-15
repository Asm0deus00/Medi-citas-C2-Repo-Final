const service = require('../services/result.service');
const wrap = require('../utils/wrap');
const path = require('node:path');
const fs = require('node:fs/promises');
const { ApiError } = require('../utils/errors');
module.exports = {
 image: wrap(async(req,res)=> {
   const item = await service.get(req.params.id);
   if (item.result_type !== 'imaging') throw new ApiError(400,'El resultado no es de imagenología');
   const relative = item.detail?.image_path;
   if (!relative || !/^[a-zA-Z0-9_-]+\.(png|jpe?g|pdf)$/i.test(relative)) throw new ApiError(404,'Imagen no disponible');
   const root = path.resolve(__dirname, '../../private_images');
   const file = path.join(root, relative);
   try { await fs.access(file); } catch { throw new ApiError(404,'Archivo de imagen no disponible'); }
   res.sendFile(file);
 }),
 list: wrap(async(req,res)=>res.json(await service.list(req.query.patientId,req.query.type))),
 get: wrap(async(req,res)=>res.json(await service.get(req.params.id))),
 create: wrap(async(req,res)=>res.status(201).json(await service.create(req.body))),
 edit: wrap(async(req,res)=>res.json(await service.edit(req.params.id,req.body))),
 erase: wrap(async(req,res)=>{ await service.erase(req.params.id); res.status(204).end(); })
};
