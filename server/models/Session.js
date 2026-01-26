const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: 'unknown'
  },
  deviceInfo: {
    type: String,
    default: 'unknown'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries (defined once here to avoid duplicates)
// Note: token already has unique: true which creates an index automatically
SessionSchema.index({ userId: 1 });
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ lastActivity: -1 });
SessionSchema.index({ createdAt: -1 });

// Auto-cleanup expired sessions (older than 24 hours)
SessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('Session', SessionSchema);
