const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

router.post('/', async (req, res) => {
    try {
        const { inventory, username, vehicleNumber, transactionType, scannedBarcodes, notes } = req.body;

        if (!inventory || username === undefined) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const inventoryDataForDB = {
            username: username,
            vehicleNumber: vehicleNumber,
            boxes: inventory.boxes,
            largeCoolers: inventory.largeCoolers,
            smallCoolers: inventory.smallCoolers, // If you change this to icePacks, update the model too
            transactionType: transactionType,
            scannedBarcodes: scannedBarcodes,
            notes,
        };

        const newInventory = new Inventory(inventoryDataForDB);
        await newInventory.save();

        res.status(201).json(newInventory);

    } catch (error) {
        console.error('Error saving inventory:', error);
        res.status(500).json({ message: 'Error saving inventory', details: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const data = await Inventory.find().sort({ updatedAt: -1 });
        res.json(data);
    } catch (err) {
        console.error("Error fetching inventory:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.put('/:id/barcodes', async (req, res) => {
    try {
        const { id } = req.params;
        const { barcodes } = req.body;

        if (!Array.isArray(barcodes)) {
            return res.status(400).json({ message: 'Barcodes must be an array.' });
        }
        const updates = {
            scannedBarcodes: barcodes,
            // Note: You might want to update counts of boxes/coolers here based on barcode prefixes
        };

        const updatedInventory = await Inventory.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!updatedInventory) {
            return res.status(404).json({ message: 'Inventory record not found' });
        }

        res.status(200).json(updatedInventory);
    } catch (error) {
        console.error('Error updating barcodes:', error);
        res.status(500).json({ message: 'Error updating barcodes', details: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedInventory = await Inventory.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!updatedInventory) {
            return res.status(404).json({ message: 'Inventory record not found' });
        }

        res.status(200).json(updatedInventory);
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ message: 'Error updating inventory', details: error.message });
    }
});

// =================================================================
//  NEW ENDPOINT TO ADD
// =================================================================
router.put('/:id/reconcile', async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode } = req.body;

        if (!barcode) {
            return res.status(400).json({ message: 'Barcode is required' });
        }

        const updatedMission = await Inventory.findByIdAndUpdate(
            id,
            { $addToSet: { manuallyReconciledBarcodes: barcode } },
            { new: true }
        );

        if (!updatedMission) {
            return res.status(404).json({ message: 'Mission record not found' });
        }

        res.status(200).json({ message: 'Barcode reconciled successfully', data: updatedMission });

    } catch (error) {
        console.error('SERVER ERROR reconciling barcode:', error);
        res.status(500).json({ message: 'Error reconciling barcode', error: error.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        const history = await Inventory.find({ username: username })
            .sort({ updatedAt: -1 })
            .limit(5);
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Server error while fetching history' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedInventory = await Inventory.findByIdAndDelete(id);
        if (!deletedInventory) {
            return res.status(404).json({ message: 'Inventory record not found' });
        }
        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory:', error);
        res.status(500).json({ message: 'Error deleting inventory', details: error.message });
    }
});

module.exports = router;