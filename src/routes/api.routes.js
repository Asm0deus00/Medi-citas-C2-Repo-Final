const express = require('express');
const catalog = require('../controllers/catalog.controller');
const appointment = require('../controllers/appointment.controller');
const review = require('../controllers/review.controller');
const result = require('../controllers/result.controller');
const auth = require('../controllers/auth.controller');
const { ApiError } = require('../utils/errors');
const { authenticate, admin, owner } = require('../middleware/access');
const pool = require('../config/database');
const wrap = require('../utils/wrap');
const router = express.Router();
router.post('/patients', (req,res,next) => { req.params.resource = 'patients'; next(); }, catalog.create);
router.post('/users', (req,res,next) => { req.params.resource = 'users'; next(); }, catalog.create);
router.get('/doctors', (req,res,next) => { req.params.resource = 'doctors'; next(); }, catalog.list);
router.get('/doctors/:id', (req,res,next) => { req.params.resource = 'doctors'; next(); }, catalog.get);
router.get('/specialties', (req,res,next) => { req.params.resource = 'specialties'; next(); }, catalog.list);
router.get('/specialties/:id', (req,res,next) => { req.params.resource = 'specialties'; next(); }, catalog.get);
router.get('/doctor_schedules', (req,res,next) => { req.params.resource = 'doctor_schedules'; next(); }, catalog.list);
router.get('/doctor_schedules/:id', (req,res,next) => { req.params.resource = 'doctor_schedules'; next(); }, catalog.get);

router.get('/doctors/:id/availability', wrap(async (req,res) => res.json(await appointment.availability(req.params.id, req.query.date))));
router.post('/auth/login', auth.login);
router.use(authenticate);
router.use('/medical-results', (req, res, next) => { if (req.method !== 'GET') return admin(req,res,next); next(); });
router.use('/review_tags', (req,res,next) => { if (req.method === 'GET') return next(); return admin(req,res,next); });
router.use('/doctors', admin);
router.use('/specialties', admin);
router.use('/doctor_schedules', admin);
router.use('/users', admin);
router.use('/patients', (req,res,next) => { if (req.method === 'GET' && req.path !== '/') return owner(req,req.path.slice(1)), next(); return admin(req,res,next); });
router.use('/appointments', wrap(async(req,res,next) => {
 if(req.user.role === 'admin') return next();
 const id = req.params.id || /^\/(\d+)/.exec(req.path)?.[1];
 if(req.method === 'GET' && req.path === '/') { req.query.patientId = String(req.user.patientId); return next(); }
 if(req.method === 'POST') { owner(req,req.body.patient_id); return next(); }
 if(!id) throw new ApiError(403,'Operación restringida');
 const [[row]] = await pool.query('SELECT patient_id FROM appointments WHERE id = ?', [Number(id)]);
 if(!row) throw new ApiError(404,'Cita no encontrada');
 owner(req,row.patient_id);
 if(!['GET'].includes(req.method)) throw new ApiError(403,'Actualización reservada al administrador');
 next();
 }));
router.use('/reviews', wrap(async(req,res,next) => {
 if(req.user.role === 'admin') return next();
 if(req.method === 'GET' && req.path === '/') return next();
 const appointmentId = req.body?.appointment_id;
 if(req.method === 'POST') {
  const [[row]] = await pool.query('SELECT patient_id FROM appointments WHERE id = ?', [Number(appointmentId)]);
  if(!row) throw new ApiError(404,'Cita no encontrada'); owner(req,row.patient_id); return next();
 }
 const id = /^\/(\d+)/.exec(req.path)?.[1];
 if(!id) throw new ApiError(403,'Operación restringida');
 const [[row]] = await pool.query('SELECT a.patient_id FROM reviews r JOIN appointments a ON a.id=r.appointment_id WHERE r.id=?',[Number(id)]);
 if(!row) throw new ApiError(404,'Reseña no encontrada'); owner(req,row.patient_id);
 if(req.method !== 'GET') throw new ApiError(403,'Modificación restringida');
 next();
 }));
router.use('/medical-results', wrap(async(req,res,next) => {
 if(req.user.role === 'admin') return next();
 if(req.path === '/' && req.method === 'GET') {req.query.patientId = String(req.user.patientId); return next();}
 const id = /^\/(\d+)/.exec(req.path)?.[1];
 if(!id) throw new ApiError(403,'Acceso restringido');
 const [[row]] = await pool.query('SELECT patient_id FROM medical_results WHERE id=?',[Number(id)]);
 if(!row) throw new ApiError(404,'Resultado no encontrado'); owner(req,row.patient_id); next();
 }));
router.get('/appointments', appointment.list);
router.post('/appointments', appointment.create);
router.get('/appointments/:id', appointment.get);
router.patch('/appointments/:id', appointment.edit);
router.delete('/appointments/:id', appointment.erase);
router.get('/reviews', review.list);
router.post('/reviews', review.create);
router.get('/reviews/:id/tags', review.tags);
router.put('/reviews/:id/tags', review.setTags);
router.get('/reviews/:id', review.get);
router.patch('/reviews/:id', review.edit);
router.delete('/reviews/:id', review.erase);
router.get('/medical-results', result.list);
router.post('/medical-results', result.create);
router.get('/medical-results/:id', result.get);
router.get('/medical-results/:id/image', result.image);
router.patch('/medical-results/:id', result.edit);
router.delete('/medical-results/:id', result.erase);
router.param('resource', (req, res, next, value) => {
  if (!['users', 'patients', 'doctors', 'specialties', 'doctor_schedules', 'review_tags'].includes(value)) return next(new ApiError(404, 'Recurso desconocido'));
  next();
});
router.get('/:resource', catalog.list);
router.post('/:resource', catalog.create);
router.get('/:resource/:id', catalog.get);
router.patch('/:resource/:id', catalog.edit);
router.delete('/:resource/:id', catalog.erase);
module.exports = router;
