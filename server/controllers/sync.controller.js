// server/controllers/sync.controller.js

const { mysqlPool } = require('../database'); // ודא שהנתיב נכון
const SyncedInvoice = require('../models/syncedInvoice.model'); // ודא שהנתיב נכון

const syncInvoicesToMongo = async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Please provide a start and end date.' });
    }

    try {
        // --- שלב 1: שליפת הנתונים מ-MySQL (ללא שינוי) ---
        const sqlQuery = `
            SELECT a.so_no, B.customer_city, B.wave_no, B.delivery_start_time
            FROM doc_shipment_packages A
            LEFT JOIN doc_so_master B ON A.so_no = B.so_no
            WHERE a.create_at BETWEEN ? AND ?
            GROUP BY a.so_no, B.customer_city, B.wave_no, B.delivery_start_time;
        `;
        const endDateTime = `${endDate} 23:59:59`;
        const params = [startDate, endDateTime];
        const [mysqlResults] = await mysqlPool.query(sqlQuery, params);

        if (mysqlResults.length === 0) {
            return res.status(200).json([]);
        }

        // --- שלב 2: עדכון הלוגיקה של הסנכרון ---
        const operations = mysqlResults.map(doc => ({
            updateOne: {
                filter: { so_no: doc.so_no },
                // *** התיקון הקריטי נמצא כאן ***
                // במקום $set שדורס תמיד, נשתמש ב-$setOnInsert
                // שמעדכן את הנתונים רק בעת יצירת מסמך חדש.
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


module.exports = {
    syncInvoicesToMongo,
    updateSyncedInvoice
};