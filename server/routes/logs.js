const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
require('dotenv').config();


const LOG_FILE_PATH = process.env.LOG_FILE_PATH 

// Endpoint to get all logs
router.get('/', async (req, res) => {
    try {
        if (!fs.existsSync(LOG_FILE_PATH)) {
            return res.json({ logContent: 'Log file not found.' });
        }

        const logContent = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
        
        res.json({ logContent });

    } catch (error) {
        console.error('Error reading log file:', error);
        res.status(500).json({ message: 'Failed to read log file', error: error.message });
    }
});

module.exports = router;