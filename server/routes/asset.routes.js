const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');

console.log("✅ asset.routes.js is loaded and running.");

// GET /api/assets/history
router.get('/history', assetController.getHistoryLog);

// POST /api/assets/scan
router.post('/scan', assetController.scanAsset);

// GET /api/assets
router.get('/', assetController.getAllAssets);


// GET /api/assets/:barcode
router.get('/:barcode', assetController.getAssetByBarcode);

// PUT /api/assets/:oldBarcode
router.put('/:oldBarcode', assetController.adminUpdateAsset);

// DELETE /api/assets/:barcode
router.delete('/:barcode', assetController.deleteAsset);

router.put('/:barcode/status', assetController.updateAssetStatus);

router.put('/admin/:barcode', assetController.adminUpdateAsset);


module.exports = router;