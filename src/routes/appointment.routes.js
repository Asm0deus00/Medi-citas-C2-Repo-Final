const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middleware/authentication');
const {
  requireAdmin,
  requirePatientInBody,
  requireAppointmentOwner
} = require('../middleware/authorization');

const router = express.Router();

router.use(authenticate);
router.get('/', appointmentController.list);
router.post('/', requirePatientInBody, appointmentController.create);
router.get('/:id', requireAppointmentOwner, appointmentController.get);
router.patch('/:id', requireAdmin, appointmentController.edit);
router.delete('/:id', requireAdmin, appointmentController.erase);

module.exports = router;
