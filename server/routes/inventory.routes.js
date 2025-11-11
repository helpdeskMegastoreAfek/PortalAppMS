const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// Connects the GET /api/inventory/history URL to the getHistory function
router.get('/history', inventoryController.getHistory);

router.post('/log-corrections', inventoryController.logCorrections);

module.exports = router;