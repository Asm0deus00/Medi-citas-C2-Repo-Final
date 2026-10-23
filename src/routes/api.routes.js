const express = require('express');
const catalogRouters = require('./catalog.routes');
const sessionRoutes = require('./session.routes');
const appointmentRoutes = require('./appointment.routes');
const reviewRoutes = require('./review.routes');
const resultRoutes = require('./result.routes');

const router = express.Router();

router.use('/sessions', sessionRoutes);
router.use('/patients', catalogRouters.patients);
router.use('/users', catalogRouters.users);
router.use('/doctors', catalogRouters.doctors);
router.use('/specialties', catalogRouters.specialties);
router.use('/doctor_schedules', catalogRouters.doctorSchedules);
router.use('/review_tags', catalogRouters.reviewTags);
router.use('/appointments', appointmentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/medical-results', resultRoutes);

module.exports = router;
