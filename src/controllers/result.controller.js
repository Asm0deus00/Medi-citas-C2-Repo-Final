const fs = require('node:fs/promises');
const resultService = require('../services/result.service');
const asyncHandler = require('../utils/async-handler');
const { ApiError } = require('../utils/errors');
const { createCrudController, resolvePatientFilter } = require('./crud.controller');

module.exports = {
  ...createCrudController(resultService),
  list: asyncHandler(async (req, res) => {
    res.json(await resultService.list(resolvePatientFilter(req), req.query.type));
  }),
  image: asyncHandler(async (req, res) => {
    const imageFile = await resultService.getImageFilePath(req.params.id);
    try {
      await fs.access(imageFile);
    } catch {
      throw new ApiError(404, 'Archivo de imagen no disponible');
    }
    res.sendFile(imageFile);
  })
};
