const express = require('express');
const { createCatalogController } = require('../controllers/catalog.controller');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middleware/authentication');
const { requireAdmin, requirePatientInParams } = require('../middleware/authorization');

const PUBLIC = [];
const AUTHENTICATED = [authenticate];
const ADMIN_ONLY = [authenticate, requireAdmin];
const PATIENT_OR_ADMIN = [authenticate, requirePatientInParams];

// Editar y eliminar siempre son de administrador; accessRules define listar, consultar y crear
function createCatalogRouter(resourceName, accessRules) {
  const controller = createCatalogController(resourceName);
  const router = express.Router();

  router.get('/', ...accessRules.list, controller.list);
  router.post('/', ...accessRules.create, controller.create);
  router.get('/:id', ...accessRules.get, controller.get);
  router.patch('/:id', ...ADMIN_ONLY, controller.edit);
  router.delete('/:id', ...ADMIN_ONLY, controller.erase);
  return router;
}

const PUBLIC_READ_ADMIN_WRITE = { list: PUBLIC, get: PUBLIC, create: ADMIN_ONLY };

const doctors = createCatalogRouter('doctors', PUBLIC_READ_ADMIN_WRITE);
doctors.get('/:id/availability', appointmentController.availability);

module.exports = {
  patients: createCatalogRouter('patients', {
    list: ADMIN_ONLY,
    get: PATIENT_OR_ADMIN,
    create: PUBLIC
  }),
  users: createCatalogRouter('users', { list: ADMIN_ONLY, get: ADMIN_ONLY, create: PUBLIC }),
  doctors,
  specialties: createCatalogRouter('specialties', PUBLIC_READ_ADMIN_WRITE),
  doctorSchedules: createCatalogRouter('doctor_schedules', PUBLIC_READ_ADMIN_WRITE),
  reviewTags: createCatalogRouter('review_tags', {
    list: AUTHENTICATED,
    get: AUTHENTICATED,
    create: ADMIN_ONLY
  })
};
