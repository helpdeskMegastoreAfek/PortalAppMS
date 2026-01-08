const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');

router.get('/manifest', testController.getGateManifest);

router.post('/submit', testController.submitBulkExit);

router.post('/return', testController.returnBox);

router.post('/return-equipment', testController.logEquipmentReturn);

module.exports = router;