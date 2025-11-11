const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  username: String,
  vehicleNumber: String,
  transactionType: String,
  notes: String,
  scannedBarcodes: [String],
  boxes: Number,
  largeCoolers: Number,
  smallCoolers: Number,
}, {
  timestamps: true,       // This will add createdAt and updatedAt fields
  strict: false,          // This will prevent errors if the DB has extra fields
  collection: 'inventories' // **THIS IS THE IMPORTANT FIX**. Specify the exact collection name
});

// IMPORTANT: Make sure 'inventories' is the correct name of your collection in MongoDB Atlas.
// It might be 'inventory', 'inventorydatas', etc. Check your database!

module.exports = mongoose.model('Inventory', InventorySchema);