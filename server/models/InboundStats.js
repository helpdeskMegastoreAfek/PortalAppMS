const mongoose = require('mongoose');

const inboundStatsSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    owner: { type: String },
    orderNumber: { type: String },
    skuCode: { type: String },
    batch: { type: String },
    location: { type: String },
    container: { type: String },
    quantity: { type: Number },
    workArea: { type: String },
    temperatureZone: { type: String },
    receiver: { type: String },
    containerChanger: { type: String },
    create_at: { type: Date } 
});


const InboundStats = mongoose.model('InboundStats', inboundStatsSchema, 'inbound_stats');

module.exports = InboundStats;