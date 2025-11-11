// server/models/correctionLog.model.js
const mongoose = require('mongoose');

const correctionLogSchema = new mongoose.Schema({
  newBarcode: { type: String, required: true },
  oldBarcode: { type: String },
  reason: { type: String, required: true },
  changedBy: { type: String, required: true },
  vehicleNumber: { type: String },
  driverName: { type: String },
  clientTimestamp: { type: Date },
}, {
  timestamps: true,
});

const CorrectionLog = mongoose.model('CorrectionLog', correctionLogSchema, 'correctionlogs'); // The 3rd argument ensures it uses the correct collection name

module.exports = CorrectionLog;