// server/routes/statistics.js

const express = require('express');
const router = express.Router();
const PickingStats = require('../models/PickingStats');
const InboundStats = require('../models/InboundStats');
const { mysqlPool } = require('../database');

// GET /api/statistics/picking
router.get('/picking', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Projection - רק השדות הנדרשים (מפחית את גודל התגובה)
        const stats = await PickingStats.find({})
            .select('date ownerName orderNumber waveNumber skuCode batch location container quantity workstation shippingBox temperatureZone picker unloadingDock orderSequenceNumber orderReleaseTime')
            .sort({ date: -1 })
            .lean(); // lean() מחזיר plain JavaScript objects במקום Mongoose documents (מהיר יותר)
        
        const endTime = Date.now();
        console.log(`GET /picking: Fetched ${stats.length} records in ${(endTime - startTime) / 1000} seconds`);
        
        res.json(stats);
    } catch (err) {
        console.error('Error fetching picking stats:', err);
        res.status(500).json({ message: "Failed to fetch stats from MongoDB", error: err.message });
    }
});

// GET /api/statistics/picking/direct - טעינה ישירה מ-SQL ללא שמירה ב-MongoDB
router.get('/picking/direct', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        
        const startTime = Date.now();
        
        const UNIFIED_SQL_QUERY = `
            (SELECT 
                a.create_at AS createAt, c.owner_name AS ownerName, a.so_no AS orderNumber,
                f.wave_no AS waveNumber, b.sku_code AS skuCode, a.lot_id AS batch, d.locat_code AS location,
                a.trace_id AS container, SUM(a.qty_each) AS quantity, k.sow_area_code AS workstation,
                a.drop_id AS shippingBox, e.dict_list AS temperatureZone, h.create_by AS picker,
                g.end_cargo AS unloadingDock, g.tracking_number AS orderSequenceNumber, m.create_at AS orderReleaseTime
            FROM doc_alloc_details a 
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            LEFT JOIN doc_so_master f ON a.so_no = f.so_no 
            LEFT JOIN doc_shipment_packages g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
            LEFT JOIN doc_task_container h ON a.task_id = h.task_id AND a.drop_id = h.drop_id
            LEFT JOIN bas_sow_locat j ON h.sow_collection_locat_id = j.sow_locat_id
            LEFT JOIN bas_sow_area k ON j.sow_area_id = k.sow_area_id
            LEFT JOIN doc_wave_master m ON f.wave_no = m.wave_no
            WHERE a.create_at BETWEEN ? AND ?
            GROUP BY a.create_at, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime)
            
            UNION ALL 
            
            (SELECT 
                a.create_at AS createAt, c.owner_name AS ownerName, a.so_no AS orderNumber,
                f.wave_no AS waveNumber, b.sku_code AS skuCode, a.lot_id AS batch, d.locat_code AS location,
                a.trace_id AS container, SUM(a.qty_each) AS quantity, k.sow_area_code AS workstation,
                a.drop_id AS shippingBox, e.dict_list AS temperatureZone, h.create_by AS picker,
                g.end_cargo AS unloadingDock, g.tracking_number AS orderSequenceNumber, m.create_at AS orderReleaseTime
            FROM doc_alloc_details_bak a 
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            LEFT JOIN doc_so_master_bak f ON a.so_no = f.so_no 
            LEFT JOIN doc_shipment_packages_bak g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
            LEFT JOIN doc_task_container_bak h ON a.task_id = h.task_id AND a.drop_id = h.drop_id
            LEFT JOIN bas_sow_locat j ON h.sow_collection_locat_id = j.sow_locat_id
            LEFT JOIN bas_sow_area k ON j.sow_area_id = k.sow_area_id
            LEFT JOIN doc_wave_master_bak m ON f.wave_no = m.wave_no
            WHERE a.create_at BETWEEN ? AND ?
            GROUP BY a.create_at, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime)
            
            UNION ALL
            
            (SELECT 
                a.create_at AS createAt, 
                c.owner_name AS ownerName, 
                a.so_no AS orderNumber,
                f.wave_no AS waveNumber, 
                b.sku_code AS skuCode, 
                a.lot_id AS batch, 
                d.locat_code AS location,
                a.trace_id AS container, 
                SUM(a.qty_each) AS quantity, 
                'עמדות (M2G)' AS workstation,
                a.drop_id AS shippingBox, 
                e.dict_list AS temperatureZone, 
                COALESCE(u.login_name, a.change_task_id) AS picker,
                g.end_cargo AS unloadingDock, 
                g.tracking_number AS orderSequenceNumber, 
                m.create_at AS orderReleaseTime
            FROM doc_alloc_details a 
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            LEFT JOIN doc_so_master f ON a.so_no = f.so_no 
            LEFT JOIN doc_shipment_packages g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
            LEFT JOIN sys_user u ON a.change_task_id = u.user_id
            LEFT JOIN doc_wave_master m ON f.wave_no = m.wave_no
            WHERE a.work_area_id = 'WHAREA00031'
                AND a.create_at BETWEEN ? AND ?
            GROUP BY a.create_at, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime);
        `;

        const params = [start, end, start, end, start, end];
        const [rows] = await mysqlPool.execute(UNIFIED_SQL_QUERY, params);
        
        // המרת הנתונים לפורמט הנדרש
        const stats = rows.map(row => ({
            ...row,
            date: row.createAt ? new Date(row.createAt).toISOString().split('T')[0] : new Date(start).toISOString().split('T')[0],
            quantity: Number(row.quantity) || 0  // וידוא ש-quantity הוא מספר
        }));
        
        const endTime = Date.now();
        console.log(`GET /picking/direct: Fetched ${stats.length} records from SQL in ${(endTime - startTime) / 1000} seconds`);
        
        res.json(stats);
    } catch (err) {
        console.error('Error fetching picking stats directly from SQL:', err);
        res.status(500).json({ message: "Failed to fetch stats from SQL", error: err.message });
    }
});

// POST /api/statistics/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'A start date and end date are required.' });
        }

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        
        // בדיקת טווח תאריכים מקסימלי (30 ימים)
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
            return res.status(400).json({ 
                message: `טווח תאריכים גדול מדי. מקסימום 30 ימים, התקבל: ${daysDiff} ימים` 
            });
        }
        
       
        const UNIFIED_SQL_QUERY = `
            (SELECT 
                a.create_at AS createAt, c.owner_name AS ownerName, a.so_no AS orderNumber,
                f.wave_no AS waveNumber, b.sku_code AS skuCode, a.lot_id AS batch, d.locat_code AS location,
                a.trace_id AS container, SUM(a.qty_each) AS quantity, k.sow_area_code AS workstation,
                a.drop_id AS shippingBox, e.dict_list AS temperatureZone, h.create_by AS picker,
                g.end_cargo AS unloadingDock, g.tracking_number AS orderSequenceNumber, m.create_at AS orderReleaseTime
            FROM doc_alloc_details a 
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            LEFT JOIN doc_so_master f ON a.so_no = f.so_no 
            LEFT JOIN doc_shipment_packages g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
            LEFT JOIN doc_task_container h ON a.task_id = h.task_id AND a.drop_id = h.drop_id
            LEFT JOIN bas_sow_locat j ON h.sow_collection_locat_id = j.sow_locat_id
            LEFT JOIN bas_sow_area k ON j.sow_area_id = k.sow_area_id
            LEFT JOIN doc_wave_master m ON f.wave_no = m.wave_no
            WHERE a.create_at BETWEEN ? AND ?
            GROUP BY a.create_at, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime)
            
            UNION ALL 
            
            (SELECT 
                a.create_at AS createAt, c.owner_name AS ownerName, a.so_no AS orderNumber,
                f.wave_no AS waveNumber, b.sku_code AS skuCode, a.lot_id AS batch, d.locat_code AS location,
                a.trace_id AS container, SUM(a.qty_each) AS quantity, k.sow_area_code AS workstation,
                a.drop_id AS shippingBox, e.dict_list AS temperatureZone, h.create_by AS picker,
                g.end_cargo AS unloadingDock, g.tracking_number AS orderSequenceNumber, m.create_at AS orderReleaseTime
            FROM doc_alloc_details_bak a 
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            LEFT JOIN doc_so_master_bak f ON a.so_no = f.so_no 
            LEFT JOIN doc_shipment_packages_bak g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
            LEFT JOIN doc_task_container_bak h ON a.task_id = h.task_id AND a.drop_id = h.drop_id
            LEFT JOIN bas_sow_locat j ON h.sow_collection_locat_id = j.sow_locat_id
            LEFT JOIN bas_sow_area k ON j.sow_area_id = k.sow_area_id
            LEFT JOIN doc_wave_master_bak m ON f.wave_no = m.wave_no
            WHERE a.create_at BETWEEN ? AND ?
            GROUP BY a.create_at, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime)
            
            UNION ALL
            
            -- ליקוט ידני M2G (עמדות M2G)
            (SELECT 
                a.create_at AS createAt, 
                c.owner_name AS ownerName, 
                a.so_no AS orderNumber,
                f.wave_no AS waveNumber, 
                b.sku_code AS skuCode, 
                a.lot_id AS batch, 
                d.locat_code AS location,
                a.trace_id AS container, 
                SUM(a.qty_each) AS quantity, 
                'עמדות (M2G)' AS workstation,
                a.drop_id AS shippingBox, 
                e.dict_list AS temperatureZone, 
                COALESCE(u.login_name, a.change_task_id) AS picker,
                g.end_cargo AS unloadingDock, 
                g.tracking_number AS orderSequenceNumber, 
                m.create_at AS orderReleaseTime
            FROM doc_alloc_details a 
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.locat_id = d.locat_id 
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            LEFT JOIN doc_so_master f ON a.so_no = f.so_no 
            LEFT JOIN doc_shipment_packages g ON a.so_no = g.so_no AND a.pack_age_sn = g.package_sn
            LEFT JOIN sys_user u ON a.change_task_id = u.user_id
            LEFT JOIN doc_wave_master m ON f.wave_no = m.wave_no
            WHERE a.work_area_id = 'WHAREA00031'
                AND a.create_at BETWEEN ? AND ?
            GROUP BY a.create_at, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime);
        `;

        console.log(`Processing range: ${start.toISOString()} to ${end.toISOString()} (${daysDiff} days)`);
        
        // מחיקת נתונים קיימים לפני התחלה
        const deleteStartTime = Date.now();
        await PickingStats.deleteMany({ date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] } });
        const deleteEndTime = Date.now();
        console.log(`Delete took ${(deleteEndTime - deleteStartTime) / 1000} seconds.`);
        
        // חלוקה לפי ימים - מטפלים בכל יום בנפרד כדי להפחית שימוש בזיכרון
        const BATCH_SIZE = 300; // הקטנה נוספת
        let totalInserted = 0;
        const processStartTime = Date.now();
        
        // לולאה על כל יום בטווח
        for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
            const dayStart = new Date(currentDate);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setUTCHours(23, 59, 59, 999);
            
            const dayStr = dayStart.toISOString().split('T')[0];
            console.log(`Processing day: ${dayStr}`);
            
            try {
                // שאילתה ליום אחד בלבד - 6 פרמטרים (2 לכל UNION: doc_alloc_details, doc_alloc_details_bak, M2G)
                const dayParams = [dayStart, dayEnd, dayStart, dayEnd, dayStart, dayEnd];
                const [dayRows] = await mysqlPool.execute(UNIFIED_SQL_QUERY, dayParams);
                
                if (dayRows.length === 0) {
                    console.log(`No data for ${dayStr}`);
                    continue;
                }
                
                console.log(`Fetched ${dayRows.length} records for ${dayStr}`);
                
                // ניקוי זיכרון אחרי כל שאילתה
                if (global.gc && dayRows.length > 5000) {
                    global.gc();
                }
                
                // עיבוד והכנסה בחבילות קטנות
                for (let i = 0; i < dayRows.length; i += BATCH_SIZE) {
                    const batchEnd = Math.min(i + BATCH_SIZE, dayRows.length);
                    const batch = dayRows.slice(i, batchEnd);
                    const batchSize = batch.length;
                    
                    // המרת createAt ל-date
                    const processedBatch = [];
                    for (const row of batch) {
                        processedBatch.push({
                            ...row,
                            date: row.createAt ? new Date(row.createAt).toISOString().split('T')[0] : dayStr
                        });
                    }
                    
                    try {
                        await PickingStats.insertMany(processedBatch, { ordered: false });
                        totalInserted += batchSize;
                    } catch (error) {
                        console.error(`Error inserting batch for ${dayStr}:`, error.message);
                        if (error.writeErrors) {
                            const successful = batchSize - error.writeErrors.length;
                            totalInserted += successful;
                        }
                    }
                    
                    // ניקוי זיכרון מיידי
                    processedBatch.length = 0;
                    batch.length = 0;
                    
                    // ניקוי זיכרון כל 3 חבילות
                    if (global.gc && (i / BATCH_SIZE) % 3 === 0) {
                        global.gc();
                    }
                }
                
                // שחרור נתוני היום מהזיכרון
                dayRows.length = 0;
                
                // ניקוי זיכרון אחרי כל יום
                if (global.gc) {
                    global.gc();
                }
                
            } catch (dayError) {
                console.error(`Error processing day ${dayStr}:`, dayError.message);
                // ממשיכים ליום הבא גם אם יש שגיאה
            }
        }
        
        // ניקוי זיכרון סופי
        if (global.gc) {
            global.gc();
            console.log('Final GC called');
        }
        
        const processEndTime = Date.now();
        console.log(`Total processing took ${(processEndTime - processStartTime) / 1000} seconds. Total inserted: ${totalInserted}`);

        res.status(200).json({ 
            message: `Refresh successful`, 
            syncedRecords: totalInserted,
            totalFetched: totalInserted
        });

    } catch (error) {
        console.error('An error occurred during the refresh process:', error);
        res.status(500).json({ message: 'Refresh process failed', error: error.message });
    }
});


// server/routes/statistics.js

router.get('/inbound', async (req, res) => {
    try {
        const { 
            startDate, endDate, 
            page = 1, limit = 10, 
            orderBy = 'create_at', order = 'desc',
            // קבלת הפרמטרים לסינון
            receiver, owner, workArea, location, searchTerm 
        } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }

        // 1. בניית שאילתת הבסיס (תאריכים)
        const query = {
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        // 2. הוספת תנאים דינמיים אם נבחרו פילטרים
        if (receiver && receiver !== 'all') {
            query.receiver = receiver;
        }
        if (owner && owner !== 'all') {
            query.owner = owner;
        }
        if (workArea && workArea !== 'all') {
            query.workArea = workArea;
        }
        if (location && location !== 'all') {
            query.location = location;
        }

        if (searchTerm) {
            const regex = new RegExp(searchTerm, 'i');
            query.$or = [
                { orderNumber: regex },
                { skuCode: regex },
                { container: regex },
                { batch: regex },
                { receiver: regex }
            ];
        }

        const sortOptions = {};
        sortOptions[orderBy] = order === 'asc' ? 1 : -1;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [data, totalCount] = await Promise.all([
            InboundStats.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            InboundStats.countDocuments(query)
        ]);

        res.json({ data, totalCount });

    } catch (err) {
        console.error("Error fetching inbound stats from MongoDB:", err);
        res.status(500).json({ message: "Failed to fetch inbound stats from MongoDB", error: err.message });
    }
});

// GET /api/statistics/inbound/direct - טעינה ישירה מ-SQL ללא שמירה ב-MongoDB
router.get('/inbound/direct', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        
        const startTime = Date.now();
        
        const sqlQuery = `
            SELECT 
                DATE_FORMAT(a.create_at, '%Y-%m-%d') AS date,
                c.owner_name AS owner,
                a.asn_no AS orderNumber,
                b.sku_code AS skuCode,
                b.pricing_type AS pricingType,
                a.lot_id AS batch,
                d.locat_code AS location,
                a.trace_id AS container,
                SUM(a.put_qty_each) AS quantity,
                a.pallet_area AS workArea,
                e.dict_list AS temperatureZone,
                a.create_by AS receiver,
                (
                    SELECT GROUP_CONCAT(DISTINCT t.create_by)
                    FROM doc_task_change_container t
                    WHERE t.task_id = a.receipt_no AND t.target_container = a.trace_id
                ) AS containerChanger,
                MAX(a.create_at) as lastActivityTime
            FROM doc_putaway_details a
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.put_locat_id = d.locat_id
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            WHERE 
                a.create_at BETWEEN ? AND ? 
                AND a.put_line_status != 7
                AND (d.locat_code != 'M2G-STAGE' OR d.locat_code IS NULL)
                AND (
                    a.trace_id NOT LIKE 'BL%'
                    OR a.pallet_area = 'AGVSTAGE'
                    OR a.pallet_area = 'PA M-2-G'
                    OR d.locat_code REGEXP '^[0-9]+-[0-9]+-[0-9]+'
                )
            GROUP BY 
                date, owner, orderNumber, skuCode, pricingType, batch, location, 
                container, workArea, temperatureZone, receiver, containerChanger;
        `;

        const [rows] = await mysqlPool.execute(sqlQuery, [start, end]);
        
        // המרת quantity למספר בכל שורה
        const processedRows = rows.map(row => ({
            ...row,
            quantity: Number(row.quantity) || 0
        }));
        
        const endTime = Date.now();
        console.log(`GET /inbound/direct: Fetched ${processedRows.length} records from SQL in ${(endTime - startTime) / 1000} seconds`);
        
        res.json({ data: processedRows, totalCount: processedRows.length });
    } catch (err) {
        console.error('Error fetching inbound stats directly from SQL:', err);
        res.status(500).json({ message: "Failed to fetch inbound stats from SQL", error: err.message });
    }
});

// GET Endpoint for Inbound (Putaway) Statistics
router.post('/inbound/refresh', async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // בדיקת טווח תאריכים מקסימלי (30 ימים)
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
        return res.status(400).json({ 
            message: `טווח תאריכים גדול מדי. מקסימום 30 ימים, התקבל: ${daysDiff} ימים` 
        });
    }

    console.log(`Starting INBOUND refresh for corrected date range: ${start.toISOString()} to ${end.toISOString()}`);

    try {
        const sqlQuery = `
            SELECT 
                DATE_FORMAT(a.create_at, '%Y-%m-%d') AS date,
                c.owner_name AS owner,
                a.asn_no AS orderNumber,
                b.sku_code AS skuCode,
                b.pricing_type AS pricingType,
                a.lot_id AS batch,
                d.locat_code AS location,
                a.trace_id AS container,
                SUM(a.put_qty_each) AS quantity,
                a.pallet_area AS workArea,
                e.dict_list AS temperatureZone,
                a.create_by AS receiver,
                (
                    SELECT GROUP_CONCAT(DISTINCT t.create_by)
                    FROM doc_task_change_container t
                    WHERE t.task_id = a.receipt_no AND t.target_container = a.trace_id
                ) AS containerChanger,
                MAX(a.create_at) as lastActivityTime
            FROM doc_putaway_details a
            INNER JOIN bas_sku b ON a.sku_id = b.sku_id
            INNER JOIN bas_owner c ON a.owner_id = c.owner_id
            LEFT JOIN bas_location d ON a.put_locat_id = d.locat_id
            LEFT JOIN sys_dictionary_list e ON e.dict_code = 'stockEnv' AND b.stock_env = e.dict_value
            WHERE 
                a.create_at BETWEEN ? AND ? 
                AND a.put_line_status != 7
                AND (d.locat_code != 'M2G-STAGE' OR d.locat_code IS NULL)
                
                -- === השינוי כאן ===
                AND (
                    a.trace_id NOT LIKE 'BL%'           -- תביא כל מה שהוא לא BL
                    OR a.pallet_area = 'AGVSTAGE'       -- או BL שנמצא ב-AGV
                    OR a.pallet_area = 'PA M-2-G'       -- או BL שנמצא ב-M2G
                    
                    -- או BL שנמצא במיקום מדף (למשל 1-02-01)
                    -- התבנית אומרת: מספר, מקף, מספר, מקף, מספר
                    OR d.locat_code REGEXP '^[0-9]+-[0-9]+-[0-9]+'
                )
                -- ==================

            GROUP BY 
                date, owner, orderNumber, skuCode, pricingType, batch, location, 
                container, workArea, temperatureZone, receiver, containerChanger;
        `;
        
        // מחיקת נתונים קיימים לפני התחלה
        await InboundStats.deleteMany({ date: { $gte: start, $lte: end } });
        
        // חלוקה לפי ימים - מטפלים בכל יום בנפרד כדי להפחית שימוש בזיכרון
        const BATCH_SIZE = 300; // הקטנה נוספת
        let totalInserted = 0;
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        // לולאה על כל יום בטווח
        for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
            const dayStart = new Date(currentDate);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setUTCHours(23, 59, 59, 999);
            
            const dayStr = dayStart.toISOString().split('T')[0];
            console.log(`Processing INBOUND day: ${dayStr}`);
            
            try {
                // שאילתה ליום אחד בלבד
                const [dayResults] = await mysqlPool.execute(sqlQuery, [dayStart, dayEnd]);
                
                if (dayResults.length === 0) {
                    console.log(`No INBOUND data for ${dayStr}`);
                    continue;
                }
                
                console.log(`Fetched ${dayResults.length} INBOUND records for ${dayStr}`);
                
                // ניקוי זיכרון אחרי כל שאילתה
                if (global.gc && dayResults.length > 5000) {
                    global.gc();
                }
                
                // עיבוד והכנסה בחבילות קטנות
                for (let i = 0; i < dayResults.length; i += BATCH_SIZE) {
                    const batchEnd = Math.min(i + BATCH_SIZE, dayResults.length);
                    const batch = dayResults.slice(i, batchEnd);
                    const batchSize = batch.length;
                    
                    try {
                        await InboundStats.insertMany(batch, { ordered: false });
                        totalInserted += batchSize;
                    } catch (error) {
                        console.error(`Error inserting INBOUND batch for ${dayStr}:`, error.message);
                        if (error.writeErrors) {
                            const successful = batchSize - error.writeErrors.length;
                            totalInserted += successful;
                        }
                    }
                    
                    // ניקוי זיכרון מיידי
                    batch.length = 0;
                    
                    // ניקוי זיכרון כל 3 חבילות
                    if (global.gc && (i / BATCH_SIZE) % 3 === 0) {
                        global.gc();
                    }
                }
                
                // שחרור נתוני היום מהזיכרון
                dayResults.length = 0;
                
                // ניקוי זיכרון אחרי כל יום
                if (global.gc) {
                    global.gc();
                }
                
            } catch (dayError) {
                console.error(`Error processing INBOUND day ${dayStr}:`, dayError.message);
                // ממשיכים ליום הבא גם אם יש שגיאה
            }
        }
        
        // ניקוי זיכרון סופי
        if (global.gc) {
            global.gc();
            console.log('Final GC called for INBOUND');
        }

        console.log(`Successfully refreshed ${totalInserted} inbound records.`);
        
        res.status(200).json({ 
            message: 'Inbound statistics refreshed successfully.', 
            syncedRecords: totalInserted,
            totalFetched: totalInserted
        });

    } catch (error) {
        console.error('Error during INBOUND statistics refresh:', error);
        res.status(500).json({ message: 'Failed to refresh inbound statistics.', error: error.message });
    }
});


module.exports = router;