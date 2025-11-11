const mongoose = require('mongoose');

// This defines a single event in the asset's history
const HistoryEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
        'Created', 
        'Dispatched', 
        'Returned', 
        'Reported Broken', 
        'Marked Lost', 
        'Manual Update',
        'Admin Update',
        'Created & Received', // הערך שהוספנו קודם
        'Created & Dispatched'  // הערך שצריך להוסיף עכשיו
    ],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  driverName: String,
  vehicleNumber: String,
  notes: String,
});

const AssetSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['box', 'largeCooler'],
    default: 'box',
  },
  status: {
    type: String,
    required: true,
    enum: ['In Warehouse', 'On Mission', 'Broken', 'Lost'],
    default: 'In Warehouse',
  },
  currentLocation: {
    scannedBy: String,    
    vehicleNumber: String,
    actualDriverName: String
  },
  history: [HistoryEventSchema],
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Asset', AssetSchema);