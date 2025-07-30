const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const visionService = require('../services/visionService');

router.post('/', upload.single('invoiceImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }

    console.log(`[Upload Route] File received, temporarily saved at: ${req.file.path}`);

    try {
        const result = await visionService.processAndCropImage(req.file.path);

        res.status(200).json({ 
            message: 'File processed, cropped, and OCRed successfully!',
            data: result
        });
    } catch (error) {
        console.error('[Upload Route] Error processing file:', error.message);
        res.status(500).json({ message: error.message || 'An error occurred during file processing.' });
    }
});

module.exports = router;