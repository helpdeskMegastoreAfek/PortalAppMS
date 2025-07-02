const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

router.post("/", async (req, res) => {
  try {
    const { boxes, largeCoolers, smallCoolers, username, role, driverName } =
      req.body;

    const newInventory = new Inventory({
      boxes,
      largeCoolers,
      smallCoolers,
      username: username || "unknown",
      role: role,
      driverName,
    });

    await newInventory.save();
    res.status(200).json({ message: "Inventory saved successfully" });
  } catch (error) {
    console.error("Error saving inventory:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

module.exports = router;
