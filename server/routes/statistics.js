// server/routes/statistics.js

const express = require('express');
const router = express.Router();
const PickingStats = require('../models/PickingStats');
const { mysqlPool } = require('../database');

// GET /api/statistics/picking
router.get('/picking', async (req, res) => {
    try {
        const stats = await PickingStats.find({}).sort({ date: -1 });
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch stats from MongoDB", error: err.message });
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
        
        const UNIFIED_SQL_QUERY = `
            (SELECT 
                DATE_FORMAT(a.create_at, '%Y-%m-%d') AS date, c.owner_name AS ownerName, a.so_no AS orderNumber,
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
            GROUP BY date, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime)
            
            UNION ALL 
            
            (SELECT 
                DATE_FORMAT(a.create_at, '%Y-%m-%d') AS date, c.owner_name AS ownerName, a.so_no AS orderNumber,
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
            GROUP BY date, ownerName, orderNumber, waveNumber, skuCode, batch, location, container, workstation, 
                     shippingBox, temperatureZone, picker, unloadingDock, orderSequenceNumber, orderReleaseTime);
        `;

        console.log(`Querying with dual-key join (task_id + drop_id) for range: ${start.toISOString()} to ${end.toISOString()}`);
        
        const params = [start, end, start, end];
        const [rows] = await mysqlPool.execute(UNIFIED_SQL_QUERY, params);
        
        console.log(`Fetched a total of ${rows.length} records from SQL.`);
        
        await PickingStats.deleteMany({ date: { $gte: start, $lte: end } });
        const result = await PickingStats.insertMany(rows);

        res.status(200).json({ 
            message: `Refresh successful`, 
            syncedRecords: result.length 
        });

    } catch (error) {
        console.error('An error occurred during the refresh process:', error);
        res.status(500).json({ message: 'Refresh process failed', error: error.message });
    }
});

module.exports = router;