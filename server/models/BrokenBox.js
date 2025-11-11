const mongoose = require("mongoose");

const brokenBoxSchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  username: { type: String, required: true }, 
  vehicleNumber: { type: String }, 
  transactionType: { 
    type: String, 
    enum: ['incoming', 'outgoing'],
    required: true 
  },
  
  reportedAt: { type: Date, default: Date.now },
});

brokenBoxSchema.index({ barcode: 1 }, { unique: true });

module.exports = mongoose.model("BrokenBox", brokenBoxSchema);