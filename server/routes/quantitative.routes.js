const express = require('express');
const router = express.Router();
const quantitativeController = require('../controllers/quantitative.controller');

// POST /api/quantitatives/log
router.post('/log', quantitativeController.logMovement);

router.get('/', quantitativeController.getAllMovements);

module.exports = router;