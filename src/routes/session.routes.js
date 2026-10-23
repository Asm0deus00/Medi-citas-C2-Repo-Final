const express = require('express');
const sessionController = require('../controllers/session.controller');

const router = express.Router();

router.post('/', sessionController.create);

module.exports = router;
