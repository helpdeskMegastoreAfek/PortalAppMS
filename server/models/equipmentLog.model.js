const mongoose = require('mongoose');

const EquipmentLogSchema = new mongoose.Schema({
  type: { type: String, required: true }, // DISPATCH / RETURN
  driverName: { type: String, required: true },
  vehicleNumber: { type: String },
  coolers: { type: Number, default: 0 },
  ice: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'equipmentlogs' });

module.exports = mongoose.model('EquipmentLog', EquipmentLogSchema);