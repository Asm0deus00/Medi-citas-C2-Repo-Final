const reviewService = require('../services/review.service');
const asyncHandler = require('../utils/async-handler');
const { createCrudController } = require('./crud.controller');

module.exports = {
  ...createCrudController(reviewService),
  list: asyncHandler(async (req, res) => {
    const patientId = req.user.role === 'admin' ? null : req.user.patientId;
    res.json(await reviewService.list(patientId));
  }),
  tags: asyncHandler(async (req, res) => {
    res.json(await reviewService.getTags(req.params.id));
  }),
  setTags: asyncHandler(async (req, res) => {
    res.json(await reviewService.setTags(req.params.id, req.body.tags));
  })
};
