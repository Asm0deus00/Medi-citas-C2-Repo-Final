const express = require('express');
const reviewController = require('../controllers/review.controller');
const { authenticate } = require('../middleware/authentication');
const {
  requireAdmin,
  requireAppointmentOwnerInBody,
  requireReviewOwner
} = require('../middleware/authorization');

const router = express.Router();

router.use(authenticate);
router.get('/', reviewController.list);
router.post('/', requireAppointmentOwnerInBody, reviewController.create);
router.get('/:id', requireReviewOwner, reviewController.get);
router.get('/:id/tags', requireReviewOwner, reviewController.tags);
router.put('/:id/tags', requireAdmin, reviewController.setTags);
router.patch('/:id', requireAdmin, reviewController.edit);
router.delete('/:id', requireAdmin, reviewController.erase);

module.exports = router;
