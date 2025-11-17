// routes/sync.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const PickingStats = require('../models/PickingStats');

// POST /api/sync/picking
router.post('/picking', async (req, res) => {
    let sqlConnection;
    try {
        console.log('Received request to sync picking data...');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const SQL_QUERY = `
            SELECT 
                DATE_FORMAT(a.create_at, '%Y-%m-%d') AS date,
                c.owner_name AS ownerName, a.so_no AS orderNumber, f.wave_no AS waveNumber,
                b.sku_code AS skuCode, a.lot_id AS batch, d.locat_code AS location,
                a.trace_id AS container, SUM(a.qty_each) AS quantity, k.sow_area_code AS workstation,
                a.drop_id AS shippingBox, e.dict_list AS temperatureZone, h.create_by AS picker,
                g.end_cargo AS unloadingDock, g.tracking_number AS orderSequenceNumber, m.create_at AS orderReleaseTime
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
                m.create_at BETWEEN ? AND ? AND a.create_at BETWEEN ? AND ?
            GROUP BY 
                date, ownerName, orderNumber, waveNumber, skuCode, batch, location,
                container, workstation, shippingBox, temperatureZone, picker,
                unloadingDock, orderSequenceNumber, orderReleaseTime;
        `;

        sqlConnection = await mysql.createConnection({
            host: process.env.SQL_HOST, user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD, database: 'israelwms',
        });
        
        const [rows] = await sqlConnection.execute(SQL_QUERY, [todayStart, todayEnd, todayStart, todayEnd]);
        
        await PickingStats.deleteMany({ date: { $gte: todayStart, $lte: todayEnd } });
        
        const result = await PickingStats.insertMany(rows);

        console.log(`Sync successful. Inserted ${result.length} documents.`);
        res.status(200).json({ message: 'Sync successful', syncedRecords: result.length });

    } catch (error) {
        console.error('An error occurred during the sync process:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    } finally {
        if (sqlConnection) await sqlConnection.end();
    }
});

module.exports = router;