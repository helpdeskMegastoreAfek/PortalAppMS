// server/models/PickingStats.js
const mongoose = require('mongoose');

const pickingStatsSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    ownerName: { type: String },
    orderNumber: { type: String, required: true },
    waveNumber: { type: String },
    skuCode: { type: String, required: true },
    batch: { type: String },
    location: { type: String },
    container: { type: String },
    quantity: { type: Number, required: true },
    workstation: { type: String },
    shippingBox: { type: String },
    temperatureZone: { type: String },
    picker: { type: String }, 
    unloadingDock: { type: String },
    orderSequenceNumber: { type: String },
    orderReleaseTime: { type: Date },
});

module.exports = mongoose.model('PickingStats', pickingStatsSchema);