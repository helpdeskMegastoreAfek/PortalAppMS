// server/controllers/sync.controller.js

const { mysqlPool } = require('../database'); // ודא שהנתיב נכון
const SyncedInvoice = require('../models/syncedInvoice.model'); // ודא שהנתיב נכון

const syncInvoicesToMongo = async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Please provide a start and end date.' });
    }

    try {
        const endDateTime = `${endDate} 23:59:59`;

        // --- שלב 1: שליפת הנתונים מ-MySQL (רגיל + ארכיון) ---
        const sqlQuery = `
            (SELECT a.so_no, B.customer_city, B.wave_no, B.delivery_start_time
             FROM doc_shipment_packages A
             LEFT JOIN doc_so_master B ON A.so_no = B.so_no
             WHERE a.create_at BETWEEN ? AND ?
             GROUP BY a.so_no, B.customer_city, B.wave_no, B.delivery_start_time)

            UNION

            (SELECT a.so_no, B.customer_city, B.wave_no, B.delivery_start_time
             FROM doc_shipment_packages_bak A
             LEFT JOIN doc_so_master_bak B ON A.so_no = B.so_no
             WHERE a.create_at BETWEEN ? AND ?
             GROUP BY a.so_no, B.customer_city, B.wave_no, B.delivery_start_time)
        `;

        // חשוב: אנחנו שולחים את התאריכים פעמיים - פעם אחת ל-SELECT הראשון ופעם אחת לשני
        const params = [startDate, endDateTime, startDate, endDateTime];

        const [mysqlResults] = await mysqlPool.query(sqlQuery, params);

        if (mysqlResults.length === 0) {
            return res.status(200).json([]);
        }

        // --- שלב 2: עדכון הלוגיקה של הסנכרון ---
        const operations = mysqlResults.map(doc => ({
            updateOne: {
                filter: { so_no: doc.so_no },
                update: { $setOnInsert: doc },
                upsert: true
            }
        }));
        await SyncedInvoice.bulkWrite(operations);

        // --- שלבים 3 ו-4 (ללא שינוי) ---
        const syncedOrderNumbers = mysqlResults.map(doc => doc.so_no);
        const newlySyncedDocs = await SyncedInvoice.find({
            so_no: { $in: syncedOrderNumbers }
        });
        res.status(200).json(newlySyncedDocs);

    } catch (error) {
        console.error('SERVER ERROR in syncInvoicesToMongo:', error);
        res.status(500).json({ message: 'Error during the sync process.' });
    }
};


const updateSyncedInvoice = async (req, res) => {
    try {
        const { so_no } = req.params; // קבלת מספר ההזמנה מה-URL
        const updateData = req.body; // קבלת הנתונים המעודכנים מגוף הבקשה

        // מצא את המסמך לפי so_no ועדכן אותו.
        // { new: true } מחזיר את המסמך המעודכן, לא המקורי.
        const updatedInvoice = await SyncedInvoice.findOneAndUpdate(
            { so_no: so_no },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedInvoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        res.status(200).json(updatedInvoice); // שלח את הרשומה המעודכנת בחזרה

    } catch (error) {
        console.error('SERVER ERROR in updateSyncedInvoice:', error);
        res.status(500).json({ message: 'Error updating invoice.' });
    }
};

const getSalesBySku = async (req, res) => {
    const { startDate, endDate, stockEnv } = req.query;

    if (!startDate || !endDate || !stockEnv) {
        return res.status(400).json({ message: 'Missing parameters' });
    }

    try {
        const endDateTime = `${endDate} 23:59:59`;
        
        let sqlQuery;
        let params;

        // אם stockEnv הוא 'AGV', נכלול את כל ה-Location Codes שמתחילים ב-AGV
        if (stockEnv === 'AGV') {
            sqlQuery = `
                SELECT COALESCE(GROUP_CONCAT(DISTINCT locat_code ORDER BY locat_code SEPARATOR ', '), 'N/A') as locat_code, 
                       sku_id as skuId, sku_id as guid, SUM(qty) as accesQty, sku_name
                FROM (
                    SELECT a.sku_id, SUM(a.picked_qty_each) qty, e.locat_code, d.sku_name
                    FROM doc_alloc_details a
                    INNER JOIN bas_wharea c ON a.work_area_id = c.wh_area_id
                    INNER JOIN bas_sku d ON a.sku_id = d.sku_id
                    LEFT JOIN bas_location e ON a.locat_id = e.locat_id
                    WHERE a.create_at BETWEEN ? AND ?
                    AND e.locat_code LIKE 'AGV%'
                    GROUP BY a.sku_id, e.locat_code, d.sku_name
                ) temp
                GROUP BY sku_id, sku_name
                ORDER BY accesQty DESC
            `;
            params = [startDate, endDateTime];
        } else if (stockEnv === 'BULK') {
            // אם stockEnv הוא 'BULK', נכלול את כל ה-Location Codes שמתחילים ב-MJ
            sqlQuery = `
                SELECT COALESCE(GROUP_CONCAT(DISTINCT locat_code ORDER BY locat_code SEPARATOR ', '), 'N/A') as locat_code, 
                       sku_id as skuId, sku_id as guid, SUM(qty) as accesQty, sku_name
                FROM (
                    SELECT a.sku_id, SUM(a.picked_qty_each) qty, e.locat_code, d.sku_name
                    FROM doc_alloc_details a
                    INNER JOIN bas_wharea c ON a.work_area_id = c.wh_area_id
                    INNER JOIN bas_sku d ON a.sku_id = d.sku_id
                    LEFT JOIN bas_location e ON a.locat_id = e.locat_id
                    WHERE a.create_at BETWEEN ? AND ?
                    AND e.locat_code LIKE 'MJ%'
                    GROUP BY a.sku_id, e.locat_code, d.sku_name
                ) temp
                GROUP BY sku_id, sku_name
                ORDER BY accesQty DESC
            `;
            params = [startDate, endDateTime];
        } else {
            sqlQuery = `
                SELECT COALESCE(GROUP_CONCAT(DISTINCT locat_code ORDER BY locat_code SEPARATOR ', '), 'N/A') as locat_code, 
                       sku_id as skuId, sku_id as guid, SUM(qty) as accesQty, sku_name
                FROM (
                    SELECT a.sku_id, SUM(a.picked_qty_each) qty, e.locat_code, d.sku_name
                    FROM doc_alloc_details a
                    INNER JOIN bas_wharea c ON a.work_area_id = c.wh_area_id
                    INNER JOIN bas_sku d ON a.sku_id = d.sku_id
                    LEFT JOIN bas_location e ON a.locat_id = e.locat_id
                    WHERE a.create_at BETWEEN ? AND ?
                    AND d.stock_env = ?
                    AND (e.locat_code IS NULL OR (e.locat_code NOT LIKE 'AGV%' AND e.locat_code NOT LIKE 'MJ%'))
                    GROUP BY a.sku_id, e.locat_code, d.sku_name
                ) temp
                GROUP BY sku_id, sku_name
                ORDER BY accesQty DESC
            `;
            params = [startDate, endDateTime, stockEnv];
        }

        const [results] = await mysqlPool.query(sqlQuery, params);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching sales by SKU:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const getCancelledOrders = async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Missing startDate or endDate parameters' });
    }

    try {
        const endDateTime = `${endDate} 23:59:59`;
        
        const sqlQuery = `
            SELECT * 
            FROM doc_so_master 
            WHERE (so_cancel_flag = 1 OR so_cancel_status = 1)
            AND create_at BETWEEN ? AND ?
            ORDER BY create_at DESC
        `;
        
        const params = [startDate, endDateTime];
        const [results] = await mysqlPool.query(sqlQuery, params);
        
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching cancelled orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    syncInvoicesToMongo,
    updateSyncedInvoice,
    getSalesBySku,
    getCancelledOrders
};