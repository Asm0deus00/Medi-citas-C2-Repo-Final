const catalogService = require('../services/catalog.service');
const asyncHandler = require('../utils/async-handler');
const { createCrudController } = require('./crud.controller');

function createCatalogController(resourceName) {
  return {
    ...createCrudController(catalogService, resourceName),
    list: asyncHandler(async (req, res) => {
      res.json(await catalogService.list(resourceName, req.query));
    })
  };
}

module.exports = { createCatalogController };
