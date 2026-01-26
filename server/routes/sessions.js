const router = require("express").Router();
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const User = require("../models/User");
const { logSecurityEvent } = require('../utils/securityLogger');

// Middleware to verify token and get user
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if session exists and is active
    const session = await Session.findOne({ token, userId: user._id, isActive: true });
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    req.user = user;
    req.session = session;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all active sessions for current user
router.get('/my-sessions', verifyToken, async (req, res) => {
  try {
    // Get both active and inactive sessions for history
    const allSessions = await Session.find({
      userId: req.user._id
    }).sort({ lastActivity: -1 }).limit(50); // Limit to last 50 sessions

    const activeSessions = allSessions.filter(s => s.isActive);
    const currentSessionId = req.session._id.toString();

    const sessionsWithCurrent = allSessions.map(session => ({
      _id: session._id.toString(),
      ip: session.ip,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isActive: session.isActive,
      isCurrent: session._id.toString() === currentSessionId
    }));

    res.json({ 
      sessions: sessionsWithCurrent,
      activeCount: activeSessions.length,
      totalCount: allSessions.length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
  }
});

// Get all active sessions (admin only)
router.get('/all', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sessions = await Session.find({
      isActive: true
    }).sort({ lastActivity: -1 })
      .populate('userId', 'username email role')
      .limit(100);

    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching all sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
  }
});

// Get all sessions for a user (admin only)
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sessions = await Session.find({
      userId: req.params.userId
    }).sort({ lastActivity: -1 }).populate('userId', 'username email');

    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
  }
});

// Terminate a specific session
router.delete('/:sessionId', verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user owns this session or is admin
    if (session.userId.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if terminating current session
    const isCurrentSession = session._id.toString() === req.session._id.toString();
    
    session.isActive = false;
    await session.save();

    // Log session termination
    await logSecurityEvent('INFO', isCurrentSession ? 'Current session terminated by user' : 'Session terminated', {
      username: req.user.username,
      role: req.user.role,
      terminatedSessionId: session._id.toString(),
      terminatedBy: req.user._id.toString(),
      isCurrentSession: isCurrentSession,
      ip: req.ip || 'unknown'
    });

    res.json({ 
      message: 'Session terminated successfully',
      isCurrentSession: isCurrentSession
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ message: 'Failed to terminate session', error: error.message });
  }
});

// Terminate all other sessions (keep current one)
router.delete('/terminate-all-others', verifyToken, async (req, res) => {
  try {
    const result = await Session.updateMany(
      {
        userId: req.user._id,
        _id: { $ne: req.session._id },
        isActive: true
      },
      { isActive: false }
    );

    // Log action
    await logSecurityEvent('INFO', 'All other sessions terminated', {
      username: req.user.username,
      role: req.user.role,
      terminatedCount: result.modifiedCount,
      ip: req.ip || 'unknown'
    });

    res.json({ 
      message: 'All other sessions terminated successfully',
      terminatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error terminating sessions:', error);
    res.status(500).json({ message: 'Failed to terminate sessions', error: error.message });
  }
});

// Logout - terminate current session
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.session._id, { isActive: false });

    // Log logout
    await logSecurityEvent('INFO', 'User logged out', {
      username: req.user.username,
      role: req.user.role,
      sessionId: req.session._id.toString(),
      ip: req.ip || 'unknown'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Failed to logout', error: error.message });
  }
});

// Check session validity and update last activity
router.post('/ping', verifyToken, async (req, res) => {
  try {
    // Session is already updated in middleware
    res.json({ 
      valid: true,
      lastActivity: req.session.lastActivity,
      expiresAt: new Date(req.session.createdAt.getTime() + 60 * 60 * 1000) // 1 hour from creation
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid session' });
  }
});

module.exports = router;
