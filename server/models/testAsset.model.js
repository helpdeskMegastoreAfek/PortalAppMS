const mongoose = require('mongoose');

const TestAssetSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true }, // זה ה-drop_id מה-SQL
  status: { type: String, default: 'On Mission' },       // ברירת מחדל: יצא למשימה
  
  // שדות לוגיסטיים מה-ERP
  gateNumber: String,  // end_cargo
  orderNumber: String, // so_no
  waveNumber: String,  // wave_no
  destinationCity: String, // customer_city
  
  // מי לקח ומתי
  currentLocation: {
    scannedBy: String,
    vehicleNumber: String,
    actualDriverName: String,
    dispatchedAt: Date
  },

  history: [{
    eventType: String, // למשל: "Dispatched from Gate"
    timestamp: Date,
    driverName: String,
    vehicleNumber: String,
    notes: String,
    orderNumber: String,
    gateNumber: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('TestAsset', TestAssetSchema);