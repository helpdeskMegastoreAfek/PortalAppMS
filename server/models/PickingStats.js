// models/PickingStats.js
const mongoose = require('mongoose');

const pickingStatsSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    ownerName: { type: String, required: true },
    orderNumber: { type: String, required: true },
    waveNumber: { type: String },
    skuCode: { type: String, required: true },
    batch: { type: String },
    location: { type: String },
    container: { type: String },
    quantity: { type: Number, required: true },
    workstation: { type: String },
    temperatureZone: { type: String },
    picker: { type: String, required: true },
    unloadingDock: { type: String },
    orderSequenceNumber: { type: String },
    orderReleaseTime: { type: Date },
    stagingCompletionTime: { type: Date }
});

const PickingStats = mongoose.model('PickingStats', pickingStatsSchema);

module.exports = PickingStats;