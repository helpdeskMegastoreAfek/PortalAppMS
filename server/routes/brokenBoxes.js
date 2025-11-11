const router = require('express').Router();
const BrokenBox = require('../models/BrokenBox');

// POST new broken boxes
router.post('/', async (req, res) => {
  try {
    const { barcodes, username, vehicleNumber, transactionType } = req.body;

    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0 || !username || !transactionType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newBrokenBoxes = barcodes.map(barcode => ({
      barcode,
      username,
      vehicleNumber,
      transactionType,
      reportedAt: new Date()
    }));

    const result = await BrokenBox.insertMany(newBrokenBoxes, { ordered: false });

    res.status(201).json({ message: `${result.length} broken boxes saved successfully.`, data: result });

  } catch (error) {
    console.error('!!! SERVER ERROR CAUGHT !!!:', error);

    if (error.code === 11000 || (error.writeErrors && error.writeErrors.some(e => e.err.code === 11000))) {
      const insertedCount = error.result ? error.result.nInserted : 0;
      return res.status(201).json({
        message: `Saved ${insertedCount} new broken boxes. Duplicates were ignored.`,
        result: error.result,
      });
    }

    res.status(500).json({ message: 'An unexpected error occurred on the server', error: error.message });
  }
});

module.exports = router;