const Movement = require('../models/quantitative.model.js');

exports.logMovement = async (req, res) => {
  try {
    const { 
        transactionType, 
        driverName, 
        scannedBy, 
        vehicleNumber, 
        largeCoolers, 
        smallCoolers,
        notes 
    } = req.body;

    // Basic validation
    if (!transactionType || !driverName || !scannedBy || !vehicleNumber) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newMovement = new Movement({
        transactionType,
        driverName,
        scannedBy,
        vehicleNumber,
        largeCoolers: largeCoolers || 0,
        smallCoolers: smallCoolers || 0,
        notes
    });

    await newMovement.save();
    res.status(201).json({ message: 'Quantitative movement logged successfully.', data: newMovement });

  } catch (error) {
    console.error("Error logging quantitative movement:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllMovements = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        // Build date query if dates are provided
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set to the end of the day
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endOfDay;
            }
        }

        const movements = await Movement.find(query).sort({ createdAt: -1 });
        res.status(200).json(movements);

    } catch (error) {
        console.error("Error fetching quantitative movements:", error);
        res.status(500).json({ message: error.message });
    }
};