const mongoose = require('mongoose');

// It's safer to check if the model already exists before trying to create it.
// This prevents errors in some environments (like with nodemon).
const Inventory = mongoose.models.Inventory || require('../models/inventory.model');
const CorrectionLog = require('../models/CorrectionLog.model.js');

// This function gets the most recent transactions, used for the history log.
exports.getHistory = async (req, res) => {
  try {
    // Make sure the Inventory model is valid before using it
    if (!Inventory || typeof Inventory.find !== 'function') {
        console.error("Inventory model is not loaded correctly.");
        return res.status(500).json({ message: "Server configuration error: Inventory model not found." });
    }

    const { username, limit = 15 } = req.query;
    const query = username ? { username } : {};
    
    console.log(`Fetching history with query: ${JSON.stringify(query)} and limit: ${limit}`);

    const history = await Inventory.find(query)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));
      
    console.log(`Found ${history.length} history items.`);
    res.status(200).json(history);

  } catch (error) {
    // Log the full error to the server console for debugging
    console.error("FATAL ERROR in getHistory:", error);
    
    // Send a more informative error message to the client
    res.status(500).json({ message: "Failed to fetch history due to a server error.", error: error.message });
  }
};

exports.logCorrections = async (req, res) => {
  try {
    // קבלת המידע מגוף הבקשה
    const { corrections, username, vehicleNumber, driverName } = req.body;

    // ולידציה בסיסית
    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      return res.status(400).json({ message: 'לא נשלח מידע לתיעוד.' });
    }

    // הכנת המידע לשמירה במסד הנתונים
    const logEntries = corrections.map(log => ({
      oldBarcode: log.oldBarcode,
      newBarcode: log.newBarcode,
      reason: log.reason,
      clientTimestamp: log.timestamp,
      changedBy: username,
      vehicleNumber: vehicleNumber,
      driverName: driverName
    }));

    // שמירת כל הרשומות בבת אחת במסד הנתונים
    await CorrectionLog.insertMany(logEntries);

    // שליחת תשובת הצלחה
    res.status(200).json({ message: 'יומן התיקונים נשמר בהצלחה.' });

  } catch (error) {
    console.error('שגיאה בשמירת יומן התיקונים:', error);
    res.status(500).json({ message: 'שגיאת שרת בעת שמירת התיעוד.' });
  }
};