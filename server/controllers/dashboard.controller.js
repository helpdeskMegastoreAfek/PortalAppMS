const TestAsset = require('../models/testAsset.model');
const EquipmentLog = require('../models/equipmentLog.model');


exports.getDashboardStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    let start, end;

    // 1. הגדרת טווח תאריכים (עבור סטטיסטיקה כללית, לא עבור השבורים)
    if (from && to) {
        start = new Date(from); start.setHours(0, 0, 0, 0);
        end = new Date(to); end.setHours(23, 59, 59, 999);
    } else {
        const today = new Date();
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    }

    const dateFilter = { updatedAt: { $gte: start, $lte: end } };

    // 2. שינוי: שליפת קופסאות שבורות - ללא תלות בתאריך!
    // הסרנו את dateFilter כדי להביא את כל מה ששבור כרגע במערכת
    const damagedInventory = await TestAsset.find({
        status: { $regex: /Damaged|Broken|Faulty|Returned - Damaged|פגום|שבור/i }
    })
    .sort({ updatedAt: -1 })
    .select('barcode status history currentLocation updatedAt');

    // 3. שליפת פעילות אחרונה (כן תלויה בתאריך, לסטטיסטיקה)
    const recentActivity = await TestAsset.find(dateFilter)
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('barcode status waveNumber currentLocation.scannedBy updatedAt');

    // 4. סטטיסטיקה כללית (כן תלויה בתאריך)
    const waveStats = await TestAsset.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$waveNumber", total: { $sum: 1 } } }
    ]);

    res.status(200).json({ waveStats, recentActivity, damagedInventory });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

exports.getAssetDetails = async (req, res) => {
  const { barcode } = req.params;
  try {
    const asset = await TestAsset.findOne({ barcode });
    
    if (!asset) {
      return res.status(404).json({ message: 'הקופסה לא נמצאה במערכת' });
    }

    // מיון ההיסטוריה מהחדש לישן
    if (asset.history && asset.history.length > 0) {
        asset.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.status(200).json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBoxes = async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    console.log(`Fetching data from TestAsset between ${startDate} and ${endDate}`);

    const boxes = await TestAsset.find({
      "currentLocation.dispatchedAt": {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ "currentLocation.dispatchedAt": -1 });

    res.json(boxes);
  } catch (error) {
    console.error("Error fetching boxes:", error);
    res.status(500).json({ message: "Server Error fetching boxes" });
  }
};

exports.getEquipmentLogs = async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const logs = await EquipmentLog.find({
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: -1 });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching equipment logs" });
  }
};

exports.getAssetBoxes = async (req, res) => {
  try {
    // שליפת כל הקופסאות הרלוונטיות
    // במקום רשימה מצומצמת, אנחנו מושכים הכל ושוללים רק את מה שנגמר
    const rawBoxes = await TestAsset.find({
      status: { 
        $nin: [ // $nin = Not In (לא נמצא ברשימה)
          'Completed', 
          'Archived', 
          'In Warehouse', 
          'Warehouse',
          'Closed'
        ]
        // זה יביא אוטומטית גם את: 'On Mission', 'Active', 'Dispatched', 'Wave Dispatch' וכו'
      }
    })
    .sort({ updatedAt: -1 })
    .lean(); 

    // חישוב נהג לכל קופסה (הבלש)
    const processedBoxes = rawBoxes.map(box => {
        return {
            ...box,
            calculatedDriver: calculateDriver(box) // שימוש בפונקציה שכבר הוספנו קודם
        };
    });

    res.status(200).json(processedBoxes);

  } catch (error) {
    console.error('Get Boxes Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const calculateDriver = (box) => {
    // 1. בדיקה במיקום הנוכחי (הכי אמין)
    if (box.currentLocation && box.currentLocation.actualDriverName) {
        return box.currentLocation.actualDriverName;
    }

    // 2. חיפוש בהיסטוריה
    if (box.history && box.history.length > 0) {
        // מיון מהחדש לישן
        const sortedHistory = box.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // חיפוש האירוע האחרון שיש בו שם של בן אדם
        const lastHumanEvent = sortedHistory.find(h => {
            // אוסף את כל השמות האפשריים מהאירוע
            const name = h.driverName || h.scannedBy || h.user || h.operator;
            
            // אם אין שם, או שזה שם מערכת - דלג
            if (!name) return false;
            const skipNames = ['System', 'Admin', 'Unknown', 'API', 'Warehouse', 'Mazan', 'Logistics'];
            return !skipNames.some(sys => name.includes(sys));
        });

        if (lastHumanEvent) {
            return lastHumanEvent.driverName || lastHumanEvent.scannedBy || lastHumanEvent.user;
        }
    }

    return 'Unknown Driver';
};