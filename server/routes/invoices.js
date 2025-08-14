const path = require('path');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const Invoice = require('../models/Invoices'); 
const mongoose = require("mongoose");

// GET /api/invoices/
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find({}).sort({ invoice_date: -1 }); 
        res.json(invoices);
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        res.status(500).json({ message: "Error fetching invoices from database" });
    }
});

// GET /api/invoices/download/:filename
router.get('/download/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const invoice = await Invoice.findOne({ filename: filename });
        if (!invoice) {
            return res.status(404).json({ message: 'File not found in database' });
        }
        const sourcePath = invoice.source_path;
        if (fs.existsSync(sourcePath)) {
            res.download(sourcePath, filename); 
        } else {
            console.error(`File not found on disk at path: ${sourcePath}`);
            return res.status(404).json({ message: 'File not found on server disk' });
        }
    } catch (error) {
        console.error("Failed to process download request:", error);
        res.status(500).json({ message: "Error processing your request" });
    }
});

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const fp = 'C:\\Users\\Administrator\\Desktop\\invoice_app_exe\\data\\invoices_local'
  const filePath = path.resolve(__dirname, fp, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  } catch (err) {
    console.error('Error in PUT /api/invoices/:id →', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Attempting to delete invoice with ID: ${id}`);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).send('Invalid ID format.');
    }
    try {
        const deletedInvoice = await Invoice.findByIdAndDelete(id);
        if (!deletedInvoice) {
            console.log(`Deletion failed: Invoice with ID "${id}" not found in the database.`);
            return res.status(404).send('Invoice not found.'); 
        }
        console.log(`Successfully deleted invoice:`, deletedInvoice);
        res.status(200).json({ 
            message: 'Invoice deleted successfully', 
            deletedInvoice: deletedInvoice
        });
    } catch (error) {
        console.error(`An unexpected error occurred while deleting invoice "${id}":`, error);
        res.status(500).send('Server error. Please try again later.'); // 500 Internal Server Error
    }
});

module.exports = router;