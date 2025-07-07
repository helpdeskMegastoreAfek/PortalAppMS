// server/models/Meal.js
const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  userId: String,
  weekId: String,
  username: { type: String, required: true },
  meals: [
    {
      day: String,
      catering: String,
      main: String,
      salad1: String,
      salad2: String,
      side1: String,
      side2: String,
    },
  ],
});
module.exports = mongoose.model("Meal", mealSchema);
