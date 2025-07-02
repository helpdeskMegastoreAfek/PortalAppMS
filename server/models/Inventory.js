const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  username: { type: String, required: true },
  role: { type: String },
  boxes: { type: Number, required: true },
  largeCoolers: { type: Number, required: true },
  smallCoolers: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
  driverName: { type: String },
});

module.exports = mongoose.model("Inventory", inventorySchema);
