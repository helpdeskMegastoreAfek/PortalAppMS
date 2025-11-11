// This file is now 100% compatible with your provided asset.model.js
const Asset = require('../models/asset.model');
// Assuming you have a correctionLog model, make sure its path is correct.
// If not, you can comment out this line and the logic in getAssetByBarcode.
const CorrectionLog = require('../models/CorrectionLog.model.js'); 


// ===================================================================================
// UPDATED & IMPROVED FUNCTION: scanAsset
// This now includes the corrective scan logic.
// ===================================================================================
// בתוך server/controllers/asset.controller.js

exports.scanAsset = async (req, res) => {
  console.log("--- Executing FINAL v3 scanAsset function ---");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));

  const { assets, transactionType, username, vehicleNumber, actualDriverName, notes } = req.body;

  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ message: 'No asset data provided.' });
  }

  const results = [];
  const errors = [];

  for (const assetData of assets) {
    try {
      const { barcode, scannedAt } = assetData;
      if (!barcode) continue;

      let asset = await Asset.findOne({ barcode });
      const eventTimestamp = scannedAt || new Date();

      if (!asset) {
        // --- CASE 1: ASSET IS NEW ---
        console.log(`[${barcode}] Asset is NEW. Transaction: ${transactionType}`);

        if (transactionType === 'incoming') {
            asset = new Asset({
                barcode,
                type: 'box',
                status: 'In Warehouse',
                currentLocation: { scannedBy: username }
            });
            asset.history.push({
                eventType: 'Created & Received',
                notes: 'Asset registered on first warehouse entry.',
                driverName: username,
                timestamp: eventTimestamp,
            });
        } else { // transactionType is 'outgoing'
            asset = new Asset({
                barcode,
                type: 'box',
                status: 'On Mission',
                currentLocation: {
                    scannedBy: username,
                    vehicleNumber: vehicleNumber,
                    actualDriverName: actualDriverName || username,
                },
            });
            asset.history.push({
                eventType: 'Created & Dispatched',
                notes: 'Asset created on first dispatch.',
                driverName: actualDriverName || username,
                vehicleNumber: vehicleNumber,
                timestamp: eventTimestamp,
            });
        }
      } else {
        // --- CASE 2: ASSET EXISTS ---
        console.log(`[${barcode}] Asset EXISTS. Status: ${asset.status}. Transaction: ${transactionType}`);

        if (transactionType === 'incoming') {
          if (asset.status === 'In Warehouse') {
            errors.push({ barcode, message: 'Asset is already in the warehouse.' });
            continue;
          }
          asset.status = 'In Warehouse';
          asset.currentLocation = { scannedBy: null, vehicleNumber: null, actualDriverName: null };
          asset.history.push({
            eventType: 'Returned',
            notes: notes || 'Returned to warehouse.',
            driverName: username,
            vehicleNumber: vehicleNumber,
            timestamp: eventTimestamp,
          });

        } else { // transactionType is 'outgoing'
          
          if (asset.status !== 'In Warehouse') {
            // --- AUTOMATIC CORRECTION LOGIC ---
            console.log(`[${barcode}] CORRECTIVE SCAN: Asset is already ${asset.status}. Performing automatic return first.`);
            
            // Step 1: Perform automatic return
            asset.status = 'In Warehouse';
            asset.currentLocation = { scannedBy: null, vehicleNumber: null, actualDriverName: null };
            asset.history.push({
              eventType: 'Returned',
              notes: 'Automatic corrective return before new dispatch.',
              driverName: username, // The user scanning is the one correcting
              // Use a slightly earlier timestamp for logical consistency
              timestamp: new Date(new Date(eventTimestamp).getTime() - 1000) 
            });
          }

          // --- Step 2: Proceed with the new dispatch (always happens for 'outgoing') ---
          asset.status = 'On Mission';
          asset.currentLocation = {
            scannedBy: username,
            vehicleNumber: vehicleNumber,
            actualDriverName: actualDriverName || username,
          };
          asset.history.push({
            eventType: 'Dispatched',
            notes: notes || 'Dispatched from warehouse.',
            driverName: actualDriverName || username,
            vehicleNumber: vehicleNumber,
            timestamp: eventTimestamp,
          });
        }
      }

      await asset.save();
      console.log(`[${barcode}] Asset saved successfully. New status: ${asset.status}`);
      results.push(asset);

    } catch (error) {
      const barcodeFromData = assetData ? assetData.barcode : 'Unknown';
      console.error(`[${barcodeFromData}] CRITICAL ERROR:`, error);
      errors.push({ barcode: barcodeFromData, message: error.message });
    }
  }

  console.log("--- Scan finished. Processed:", results.length, "Errors:", errors.length);
  res.status(200).json({ message: 'Scan processed', results, errors });
};


// --- All other functions remain unchanged ---
exports.adminUpdateAsset = async (req, res) => {
  try {
    const originalBarcode = req.params.barcode;
    const { newBarcode, status, driverName, vehicleNumber, notes } = req.body;
    const asset = await Asset.findOne({ barcode: originalBarcode });
    if (!asset) { return res.status(404).json({ message: 'Asset not found.' }); }
    asset.history.push({ eventType: 'Admin Update', driverName: driverName, vehicleNumber: vehicleNumber, notes: notes || `Admin changed status to ${status}`, timestamp: new Date() });
    asset.status = status;
    if (newBarcode && newBarcode !== originalBarcode) {
      const existing = await Asset.findOne({ barcode: newBarcode });
      if (existing) { return res.status(400).json({ message: `Barcode ${newBarcode} already exists.` }); }
      asset.barcode = newBarcode;
    }
    if (status === 'On Mission') {
      asset.currentLocation = { actualDriverName: driverName, vehicleNumber: vehicleNumber, scannedBy: 'Admin' };
    } else {
      asset.currentLocation = { actualDriverName: null, vehicleNumber: null, scannedBy: null };
    }
    const updatedAsset = await asset.save();
    res.status(200).json(updatedAsset);
  } catch (error) {
    console.error("Admin update error:", error);
    res.status(500).json({ message: 'Error updating asset', error: error.message });
  }
};
exports.getAssetByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const asset = await Asset.findOne({ barcode: barcode }).lean();
    if (!asset) { return res.status(404).json({ message: 'Asset not found.' }); }
    const correctionLogs = await CorrectionLog.find({ $or: [{ newBarcode: barcode }, { oldBarcode: barcode }] }).sort({ createdAt: -1 });
    if (asset.history) {
      asset.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    const responsePayload = { ...asset, correctionLogs: correctionLogs };
    console.log(`Found ${correctionLogs.length} correction logs for barcode ${barcode}.`);
    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find(req.query).sort({ updatedAt: -1 }).lean();
    const replacedBarcodes = await CorrectionLog.distinct('oldBarcode');
    const replacedBarcodeSet = new Set(replacedBarcodes);

    assets.forEach(asset => {
      // Add 'wasReplaced' flag
      if (replacedBarcodeSet.has(asset.barcode)) {
        asset.wasReplaced = true;
      }
      
      // --- NEW LOGIC: Find the event just BEFORE it was marked 'Broken' ---
      if (asset.status === 'Broken' && asset.history && asset.history.length > 0) {
        // Sort history oldest to newest to find the event sequence
        const sortedHistory = [...asset.history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Find the index of the first 'Broken' event
        const brokenEventIndex = sortedHistory.findIndex(h => 
            h.eventType.includes('Broken') || (h.status === 'Broken')
        );

        if (brokenEventIndex > 0) {
          // Get the event right before it was marked broken and attach it
          asset.contextEvent = sortedHistory[brokenEventIndex - 1];
        }
      }
    });

    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getHistoryLog = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const historyLog = await Asset.aggregate([
      { $unwind: '$history' },
      { $sort: { 'history.timestamp': -1 } },
      { $limit: limit },
      { $project: { _id: '$history._id', barcode: '$barcode', eventType: '$history.eventType', timestamp: '$history.timestamp', driverName: '$history.driverName', vehicleNumber: '$history.vehicleNumber', notes: '$history.notes' } }
    ]);
    res.status(200).json(historyLog);
  } catch (error) {
    console.error("Error fetching asset history log:", error);
    res.status(500).json({ message: "Failed to fetch asset history log", error: error.message });
  }
};
exports.deleteAsset = async (req, res) => {
    try {
        const { barcode } = req.params;
        const result = await Asset.findOneAndDelete({ barcode });
        if (!result) { return res.status(404).json({ message: 'Asset not found.' }); }
        res.status(200).json({ message: `Asset ${barcode} deleted successfully.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAssetStatus = async (req, res) => {
  try {
    const { barcode } = req.params;
    const { status, notes } = req.body;
    if (!status) { return res.status(400).json({ message: 'Status is required.' }); }
    const updatedAsset = await Asset.findOneAndUpdate(
      { barcode: barcode },
      [ 
        { $set: { status: status, lastStatusUpdate: new Date(), notes: notes, history: { $concatArrays: [ { $ifNull: ["$history", []] }, [{ eventType: status === 'Broken' ? 'Reported Broken' : 'Status Update', notes: notes || `Status changed to ${status}`, timestamp: new Date() }] ] } } },
        { $set: { type: { $ifNull: ["$type", "box"] } } }
      ],
      { new: true, upsert: true, runValidators: true }
    );
    console.log(`Asset ${barcode} status updated to ${status}. Upsert successful.`);
    res.status(200).json(updatedAsset);
  } catch (error) {
    console.error(`Error in updateAssetStatus for ${req.params.barcode}:`, error);
    res.status(500).json({ message: 'Server error while updating asset status.' });
  }
};

// This function now also fetches related correction logs
exports.getAssetByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const asset = await Asset.findOne({ barcode: barcode }).lean();

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    // --- THIS IS THE FIX ---
    // We are now searching with the correct field names: newBarcode and oldBarcode
    const correctionLogs = await CorrectionLog.find({
      $or: [
        { newBarcode: barcode }, 
        { oldBarcode: barcode }
      ]
    }).sort({ createdAt: -1 });

    if (asset.history) {
      asset.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    const responsePayload = { 
      ...asset, 
      correctionLogs: correctionLogs 
    };
    
    // DEBUGGING LOG: This will show you in the server terminal what is being sent.
    console.log(`Found ${correctionLogs.length} correction logs for barcode ${barcode}.`);
    
    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- Your other functions ---

exports.getAllAssets = async (req, res) => {
  try {
    // Using .lean() to make the objects mutable
    const assets = await Asset.find(req.query).sort({ updatedAt: -1 }).lean();

    // Find all unique barcodes from the correction logs where a box was replaced
    const replacedBarcodes = await CorrectionLog.distinct('oldBarcode');
    const replacedBarcodeSet = new Set(replacedBarcodes);

    // Add a flag to each asset if it was part of a replacement
    assets.forEach(asset => {
      if (replacedBarcodeSet.has(asset.barcode)) {
        asset.wasReplaced = true;
      }
    });

    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHistoryLog = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const historyLog = await Asset.aggregate([
      { $unwind: '$history' },
      { $sort: { 'history.timestamp': -1 } },
      { $limit: limit },
      {
        $project: {
          _id: '$history._id', barcode: '$barcode', eventType: '$history.eventType',
          timestamp: '$history.timestamp', driverName: '$history.driverName',
          vehicleNumber: '$history.vehicleNumber', notes: '$history.notes',
        }
      }
    ]);
    res.status(200).json(historyLog);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch asset history log", error: error.message });
  }
};

exports.deleteAsset = async (req, res) => {
    try {
        const { barcode } = req.params;
        const result = await Asset.findOneAndDelete({ barcode });
        if (!result) { return res.status(404).json({ message: 'Asset not found.' }); }
        res.status(200).json({ message: `Asset ${barcode} deleted successfully.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAssetStatus = async (req, res) => {
  try {
    const { barcode } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const updatedAsset = await Asset.findOneAndUpdate(
      { barcode: barcode }, // התנאי לחיפוש
      [ 
        { 
          $set: { 
            status: status,
            lastStatusUpdate: new Date(),
            notes: notes,

            history: {
              $concatArrays: [
                { $ifNull: ["$history", []] },
                [{
                  eventType: status === 'Broken' ? 'Reported Broken' : 'Status Update',
                  notes: notes || `Status changed to ${status}`,
                  timestamp: new Date()
                }]
              ]
            }
          }
        },
        {
          $set: {
            type: { $ifNull: ["$type", "box"] }
          }
        }
      ],
      { 
        new: true,       
        upsert: true,   
        runValidators: true
      }
    );

    console.log(`Asset ${barcode} status updated to ${status}. Upsert successful.`);
    res.status(200).json(updatedAsset);

  } catch (error) {
    console.error(`Error in updateAssetStatus for ${req.params.barcode}:`, error);
    res.status(500).json({ message: 'Server error while updating asset status.' });
  }
};