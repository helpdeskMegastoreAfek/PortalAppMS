const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'City name is required'],
    unique: true, 
    trim: true    
  }
}, { timestamps: true }); 

module.exports = mongoose.model('City', CitySchema);