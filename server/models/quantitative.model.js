const mongoose = require('mongoose');

const QuantitativeMovementSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    required: true,
    enum: ['outgoing', 'incoming'],
  },
  driverName: {
    type: String,
    required: true,
  },
  scannedBy: { 
    type: String,
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  largeCoolers: {
    type: Number,
    default: 0
  },
  smallCoolers: {
    type: Number,
    default: 0
  },
  notes: String,
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('QuantitativeMovement', QuantitativeMovementSchema);