// syncData.js
require('dotenv').config(); // טעינת משתני סביבה מהקובץ .env
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const PickingStats = require('./models/PickingStats'); // נניח שקובץ המודל נמצא ב-models/PickingStats.js

// השאילתה שלך
const SQL_QUERY = `
    SELECT 
        DATE_FORMAT(a.create_at,'%Y-%m-%d') AS date,
        c.owner_name AS ownerName, 
        a.so_no AS orderNumber,
        f.wave_no AS waveNumber,
        b.sku_code AS skuCode,
        a.lot_id AS batch,
        d.locat_code AS location,
        a.trace_id AS container,
        SUM(a.qty_each) AS quantity,
        k.sow_area_code AS workstation,
        e.dict_list AS temperatureZone,
        h.create_by AS picker,
        g.end_cargo AS unloadingDock,
        g.tracking_number AS orderSequenceNumber,
        m.create_at AS orderReleaseTime,
        '' AS stagingCompletionTime
    FROM doc_alloc_details a 
    INNER JOIN bas_sku b ON a.sku_id = b.sku_id
    INNER JOIN bas_owner c ON a.owner_id = c.owner_id
    LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
    LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
    INNER JOIN doc_so_master f ON a.so_no = f.so_no 
    LEFT JOIN doc_shipment_packages g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
    LEFT JOIN doc_task_container h ON a.task_id = h.task_id AND a.drop_id = h.drop_id
    LEFT JOIN bas_sow_locat j ON h.sow_collection_locat_id = j.sow_locat_id
    LEFT JOIN bas_sow_area k ON j.sow_area_id = k.sow_area_id
    LEFT JOIN doc_wave_master m ON f.wave_no = m.wave_no
    WHERE 
        m.create_at >= CURDATE()
        AND m.create_at < CURDATE() + INTERVAL 1 DAY
        AND a.create_at >= CURDATE()
        AND a.create_at < CURDATE() + INTERVAL 1 DAY
    GROUP BY 
        DATE_FORMAT(a.create_at,'%Y-%m-%d'),
        c.owner_name, 
        a.so_no,
        f.wave_no,
        b.sku_code,
        a.lot_id,
        d.locat_code,
        a.trace_id,
        k.sow_area_code,
        e.dict_list,
        h.create_by,
        g.end_cargo,
        g.tracking_number,
        m.create_at;
`;

// פונקציה ראשית לביצוע הסנכרון
async function syncData() {
    let sqlConnection;
    try {
        // 1. התחברות ל-MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully.');

        // 2. התחברות ל-MySQL
        sqlConnection = await mysql.createConnection({
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DATABASE,
        });
        console.log('SQL database connected successfully.');

        // 3. הרצת השאילתה ושליפת הנתונים
        console.log('Fetching data from SQL database...');
        const [rows] = await sqlConnection.execute(SQL_QUERY);
        console.log(`Found ${rows.length} records to sync.`);

        if (rows.length === 0) {
            console.log('No new data to sync. Exiting.');
            return;
        }

        // 4. ניקוי המידע הישן (אופציונלי, תלוי במקרה השימוש)
        // לדוגמה, אם נרצה למחוק את נתוני היום ולהכניס מחדש
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await PickingStats.deleteMany({ date: { $gte: today } });
        console.log('Cleared today\'s old data from MongoDB.');
        
        // 5. שמירת הנתונים החדשים ב-MongoDB
        console.log('Inserting new data into MongoDB...');
        // insertMany היא הדרך היעילה ביותר להכניס כמות גדולה של מסמכים
        const result = await PickingStats.insertMany(rows);
        console.log(`Successfully inserted ${result.length} documents into MongoDB.`);

    } catch (error) {
        console.error('An error occurred during the sync process:', error);
    } finally {
        // 6. סגירת החיבורים
        if (sqlConnection) {
            await sqlConnection.end();
            console.log('SQL connection closed.');
        }
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
}

// הרצת הפונקציה
syncData();