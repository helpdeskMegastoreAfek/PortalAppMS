const TestAsset = require('../models/testAsset.model');
const EquipmentLog = require('../models/equipmentLog.model');
const { mysqlPool } = require('../database'); 

exports.getGateManifest = async (req, res) => {
  const { waveNumber } = req.query;

  console.log(`📡 Fetching manifest for Wave input: "${waveNumber || 'ALL'}"`);

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // --- בדיקה ב-MongoDB: האם הגל יצא היום? ---
    if (waveNumber) {
        const cleanWave = String(waveNumber).trim();
        
        // תיקון קריטי: חיפוש באמצעות REGEX (סיומת)
        // אנחנו מחפשים מחרוזת שנגמרת ב-"0" + המספר שהזנת + סוף השורה ($)
        // למשל: עבור "1" נחפש מחרוזת שנגמרת ב-"01"
        // זה ימצא את WAVE...001 אבל לא את WAVE...011
        const waveRegex = new RegExp(`0${cleanWave}$`);

        const existingWave = await TestAsset.findOne({ 
            // שימוש ב-Regex במקום השוואה ישירה
            waveNumber: { $regex: waveRegex }, 
            status: 'On Mission',
            'currentLocation.dispatchedAt': {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        // הוספתי לוג כדי שתראה מה הוא מצא (אם מצא)
        if (existingWave) {
            console.log(`🔒 BLOCKING: Found existing wave today. ID: ${existingWave.waveNumber}`);
            return res.status(409).json({ 
                code: 'WAVE_LOCKED',
                message: `גל ליקוט ${cleanWave} כבר יצא להפצה היום!`
            });
        } else {
             console.log(`✅ Wave ${cleanWave} is clean (not processed today).`);
        }
    }
    // ---------------------------------------------

    // --- שאר הקוד (SQL Query) נשאר ללא שינוי ---
    const dateStr = today.toLocaleDateString('en-CA'); 
    const startStrSQL = `${dateStr} 00:00:00`;
    const endStrSQL = `${dateStr} 23:59:59`;

    let query = `
      SELECT
          a.drop_id,
          a.end_cargo,
          B.customer_city,
          B.wave_no,
          a.so_no,
          a.package_status
      FROM
          doc_shipment_packages A
      LEFT JOIN
          doc_so_master B ON A.so_no = B.so_no
      WHERE
          a.create_at BETWEEN ? AND ?
          AND a.end_cargo IS NOT NULL 
          AND a.end_cargo != ''
          AND a.end_cargo != 'null'
    `;

    const queryParams = [startStrSQL, endStrSQL];

    if (waveNumber) {
      const searchWave = String(waveNumber).trim();
      query += ` AND B.wave_no LIKE ?`;
      queryParams.push(`%0${searchWave}`); 
    }

    query += ` ORDER BY B.wave_no;`;

    const [rows] = await mysqlPool.execute(query, queryParams);

    if (!rows || rows.length === 0) {
      return res.status(200).json([]);
    }

    const mappedData = rows.map(row => ({
      barcode: String(row.drop_id),       
      gateNumber: String(row.end_cargo),
      orderNumber: row.so_no,
      waveNumber: String(row.wave_no),
      description: row.customer_city,     
      status: row.package_status
    }));

    res.status(200).json(mappedData);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
};

exports.submitBulkExit = async (req, res) => {
  // הוספנו את logistics לרשימת הפרמטרים שמקבלים מהפרונט
  const { assets, vehicleNumber, driverName, username, logistics } = req.body;
  
  if (!assets || assets.length === 0) return res.status(400).json({ message: 'No data' });
  
  const savedBarcodes = [];

  try {
    // 1. שמירת לוג הציוד (החלק החדש)
    if (logistics && (logistics.coolers > 0 || logistics.ice > 0)) {
        await new EquipmentLog({
            type: 'DISPATCH',
            driverName,
            vehicleNumber,
            coolers: logistics.coolers,
            ice: logistics.ice,
            recordedBy: username
        }).save();
    }

    // 2. שמירת הקופסאות (הלוגיקה הקיימת שלך)
    await Promise.all(assets.map(async (item) => {
        // ... (הקוד הקיים של שמירת הקופסאות נשאר כאן ללא שינוי) ...
        // העתק לכאן את תוכן ה-Promise מהקוד המקורי שלך
         await TestAsset.findOneAndUpdate(
             { barcode: item.barcode },
             {
               $set: {
                 status: 'On Mission',
                 orderNumber: item.orderNumber,
                 waveNumber: item.waveNumber,
                 gateNumber: item.gateNumber,
                 destinationCity: item.description,
                 currentLocation: {
                   scannedBy: username,
                   vehicleNumber: vehicleNumber,
                   actualDriverName: driverName,
                   dispatchedAt: new Date()
                 }
               },
               $push: {
                 history: {
                   eventType: 'Wave Dispatch',
                   timestamp: new Date(),
                   driverName: driverName,
                   vehicleNumber: vehicleNumber,
                   notes: `יצא בהפצה (לפי גל ${item.waveNumber})`
                 }
               }
             },
             { upsert: true, new: true }
         );
         savedBarcodes.push(item.barcode);
    }));

    res.status(200).json({ count: savedBarcodes.length });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Submit Error' });
  }
};

exports.returnBox = async (req, res) => {
  // מוסיפים פרמטר חדש: isDamaged
  const { barcode, username, isDamaged } = req.body; 

  if (!barcode) return res.status(400).json({ message: 'חובה לסרוק ברקוד' });

  try {
    const asset = await TestAsset.findOne({ barcode });
    if (!asset) return res.status(404).json({ message: 'קופסה לא נמצאה' });
    if (asset.status.includes('Returned')) return res.status(400).json({ message: 'הקופסה כבר הוחזרה' });

    // שליפת הנהג האחרון (זה שאחראי על הנזק)
    const responsibleDriver = asset.currentLocation?.actualDriverName || 'לא ידוע';
    const responsibleVehicle = asset.currentLocation?.vehicleNumber || '';

    // קביעת הסטטוס וההערה לפי סוג ההחזרה
    const newStatus = isDamaged ? 'Returned - Damaged' : 'Returned';
    const historyNote = isDamaged 
      ? `הוחזר שבור/פגום ע"י נהג: ${responsibleDriver}` 
      : 'הוחזר למלאי תקין';

    const updatedAsset = await TestAsset.findOneAndUpdate(
      { barcode },
      {
        $set: {
          status: newStatus,
          currentLocation: {
            scannedBy: username,
            location: isDamaged ? 'Warehouse (Damaged Area)' : 'Warehouse (Returns)',
            returnedAt: new Date(),
            previousDriver: responsibleDriver
          }
        },
        $push: {
          history: {
            eventType: isDamaged ? 'Damage Report' : 'Return from Driver',
            timestamp: new Date(),
            driverName: responsibleDriver,
            vehicleNumber: responsibleVehicle,
            notes: historyNote
          }
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      barcode: updatedAsset.barcode,
      returnedFromDriver: responsibleDriver,
      city: updatedAsset.destinationCity,
      isDamaged: isDamaged // מחזירים ללקוח אישור שזה נקלט כשבור
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאה בביצוע החזרה' });
  }
};

exports.logEquipmentReturn = async (req, res) => {
  const { driverName, coolers, ice, username } = req.body;

  try {
    const log = new EquipmentLog({
      type: 'RETURN',
      driverName,
      coolers,
      ice,
      recordedBy: username
    });

    await log.save();

    res.status(200).json({ message: 'Equipment return logged successfully', data: log });
  } catch (error) {
    console.error('Equipment Log Error:', error);
    res.status(500).json({ message: 'Error logging equipment' });
  }
};