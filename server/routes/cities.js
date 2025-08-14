
const express = require('express');
const router = express.Router();
const City = require('../models/city');

router.get('/', async (req, res) => {
    try {
        const cities = await City.find().sort({ name: 1 }); 
        res.json(cities);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'City name is required' });
    }
    
    try {
        const existingCity = await City.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (existingCity) {
            return res.status(409).json({ message: 'City already exists' }); // 409 = Conflict
        }

        const newCity = new City({ name });
        await newCity.save();
        res.status(201).json(newCity); // 201 = Created
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const city = await City.findByIdAndDelete(req.params.id);
        if (!city) {
            return res.status(404).json({ message: 'City not found' });
        }
        res.json({ message: 'City deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;