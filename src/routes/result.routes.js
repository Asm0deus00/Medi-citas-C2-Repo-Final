const express = require('express');
const resultController = require('../controllers/result.controller');
const { authenticate } = require('../middleware/authentication');
const { requireAdmin, requireMedicalResultOwner } = require('../middleware/authorization');

const router = express.Router();

router.use(authenticate);
router.get('/', resultController.list);
router.post('/', requireAdmin, resultController.create);
router.get('/:id', requireMedicalResultOwner, resultController.get);
router.get('/:id/image', requireMedicalResultOwner, resultController.image);
router.patch('/:id', requireAdmin, resultController.edit);
router.delete('/:id', requireAdmin, resultController.erase);

module.exports = router;
