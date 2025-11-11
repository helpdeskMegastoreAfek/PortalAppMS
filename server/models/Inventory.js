const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  username: { type: String, required: true },

  vehicleNumber: { type: String }, 
  notes: { type: String, default: '' },
  
  boxes: { type: Number, required: true, default: 0 },
  largeCoolers: { type: Number, required: true, default: 0 },
  smallCoolers: { type: Number, required: true, default: 0 },

  transactionType: { 
    type: String, 
    enum: ['incoming', 'outgoing'],
    required: true 
  },
  manuallyReconciledBarcodes: {
  type: [String],
  default: []
},
  scannedBarcodes: {
    type: [String],
    default: [] 
  },

  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Inventory", inventorySchema);