// server/routes/meals.js
const express = require("express");
const router = express.Router();
const Meal = require("../models/Meal");

router.post("/", async (req, res) => {
  const { userId, weekId, meals } = req.body;

  if (!userId || !weekId || !meals) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await Meal.findOneAndUpdate(
      { userId, weekId },
      { meals },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Meal save error:", err);
    res.status(500).json({ error: "Failed to save meal" });
  }
});

router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const meals = await Meal.find({ userId });
    res.json(meals);
  } catch (err) {
    console.error("Meal fetch error:", err);
    res.status(500).json({ error: "Failed to fetch meals" });
  }
});

module.exports = router;
