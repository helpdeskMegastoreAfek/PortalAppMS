const path = require('path');


const express = require('express');
const router = express.Router();
const fs = require('fs');
const Invoice = require('../models/Invoices'); 

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
  const fp = 'C:\\Users\\Administrator\\Desktop\\invoice_app_exe\\dist\\invoice_script\\data\\invoices_local'
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



module.exports = router;