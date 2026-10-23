const appointmentService = require('../services/appointment.service');
const asyncHandler = require('../utils/async-handler');
const { createCrudController, resolvePatientFilter } = require('./crud.controller');

module.exports = {
  ...createCrudController(appointmentService),
  list: asyncHandler(async (req, res) => {
    res.json(await appointmentService.list(resolvePatientFilter(req), req.query.date));
  }),
  availability: asyncHandler(async (req, res) => {
    res.json(await appointmentService.availability(req.params.id, req.query.date));
  })
};
