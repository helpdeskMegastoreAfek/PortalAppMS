const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },

  role: {
    type: String,
    enum: ["admin", "user", "analyst", "manager"],
    default: "user",
  },

  status: {
    type: String,
    enum: ["Active", "Disable"],
    default: "Active",
  },

  allowedApps: [String],

  orgUnit: { type: String, default: "" },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
