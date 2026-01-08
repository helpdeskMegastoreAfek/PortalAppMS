const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/stats', dashboardController.getDashboardStats);

router.get('/search/:barcode', dashboardController.getAssetDetails);

router.get('/equipment', dashboardController.getEquipmentLogs);
router.get('/boxes', dashboardController.getAssetBoxes);

module.exports = router;