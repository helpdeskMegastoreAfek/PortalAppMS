const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['INFO', 'WARN', 'ERROR'],
    default: 'WARN'
  },
  message: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: 'unknown'
  },
  role: {
    type: String,
    default: 'unknown'
  },
  attemptedPath: {
    type: String
  },
  userAgent: {
    type: String
  },
  ip: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster queries
SecurityLogSchema.index({ createdAt: -1 });
SecurityLogSchema.index({ username: 1 });
SecurityLogSchema.index({ level: 1 });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
