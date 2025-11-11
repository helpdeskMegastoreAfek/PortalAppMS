
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { updateSyncedInvoice } = require('../controllers/sync.controller');

router.post('/mysql-to-mongo', syncController.syncInvoicesToMongo);

router.put('/synced-invoices/:so_no', updateSyncedInvoice);

module.exports = router;