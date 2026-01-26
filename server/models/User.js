const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },

  role: {
    type: String,
    enum: ["admin", "user", "developer"],
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
    undoInvoice: {type: Boolean, default: false},
    deleteInvoices: {type: Boolean, default: false},
    csvExport: {type: Boolean, default: false},
  },
  needsPasswordChange: {
    type: Boolean,
    default: true, 
  },
  // IP Tracking
  lastLoginIP: {
    type: String,
    default: null
  },
  knownIPs: [{
    ip: String,
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 1 }
  }]
});

module.exports = mongoose.model("User", userSchema);
