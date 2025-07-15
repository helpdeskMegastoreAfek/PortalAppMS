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
  permissions: {
    viewFinancials: { type: Boolean, default: false },
    editInvoices: { type: Boolean, default: false },
  },
  needsPasswordChange: {
    type: Boolean,
    default: true, 
  },
});

module.exports = mongoose.model("User", userSchema);
