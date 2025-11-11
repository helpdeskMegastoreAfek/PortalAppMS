// routes/stats.js
const express = require('express');
const router = express.Router();
const PickingStats = require('../models/PickingStats');

// GET /api/stats/picking
router.get('/picking', async (req, res) => {
    try {
        const stats = await PickingStats.find();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;