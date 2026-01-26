const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const { randomBytes } = require('crypto');
const { logSecurityEvent } = require('../utils/securityLogger');

// Helper function to extract device info from user agent
const getDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  // Simple device detection
  if (userAgent.includes('Mobile')) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android';
    return 'Mobile';
  }
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Desktop';
};


//changePassword
router.put("/changePassword", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!userId)
    return res.status(400).json({ success: false, error: "Missing userId" });

  const user = await User.findOne({ _id: userId });
  if (!user) {
    await logSecurityEvent('WARN', 'Password change attempted for non-existent user', {
      username: 'unknown',
      role: 'unknown',
      userId,
      ip,
      userAgent
    });
    return res.status(404).json({ success: false, error: "User not found" });
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    await logSecurityEvent('WARN', 'Password change failed - incorrect old password', {
      username: user.username,
      role: user.role,
      userId: user._id.toString(),
      ip,
      userAgent
    });
    return res.json({ success: false, error: "Old password is incorrect" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  // Log successful password change
  await logSecurityEvent('INFO', 'Password changed successfully', {
    username: user.username,
    role: user.role,
    userId: user._id.toString(),
    ip,
    userAgent
  });

  res.json({ success: true });
});

//reset pwd
router.post('/resetPassword', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tempPassword = randomBytes(6).toString('hex').slice(0, 8);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);

    user.mustChangePassword = true;

    await user.save();

    return res.json({ tempPassword });
  } catch (err) {
    console.error('Error in changePassword:', err);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      role,
      allowedApps,
      status,
      orgUnit,
      permissions
    } = req.body;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ error: "Missing username, password or email" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashed,
      email,
      role:       role       || "user",
      status:     status     || "Active",
      allowedApps:allowedApps|| [],
      orgUnit:    orgUnit    || "",
      permissions:permissions || {},
      needsPasswordChange: true,   
      updatedAt: new Date()
    });

    await user.save();

    // Log user creation
    await logSecurityEvent('INFO', 'New user created', {
      username: user.username,
      role: user.role,
      email: user.email,
      status: user.status,
      createdBy: req.user?.username || 'system', // אם יש middleware של auth
      userId: user._id.toString(),
      ip,
      userAgent
    });

    res.status(201).json({
      message: "User created",
      user: {
        username: user.username,
        email:    user.email,
        role:     user.role,
        status:   user.status,
        allowedApps: user.allowedApps,
        orgUnit:  user.orgUnit,
        updatedAt: user.updatedAt,
        needsPasswordChange: user.needsPasswordChange
      }
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(400).json({ error: err.message || "Error creating user" });
  }
});


// LOGIN with rate limiting
const { loginLimiter } = require('../middleware/rateLimiter');
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const user = await User.findOne({ username });
  if (!user) {
    // Log failed login attempt - user not found
    await logSecurityEvent('WARN', 'Failed login attempt - user not found', {
      username: username || 'unknown',
      role: 'unknown',
      ip,
      userAgent,
      reason: 'User not found'
    });
    return res.status(400).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    // Log failed login attempt - wrong password
    await logSecurityEvent('WARN', 'Failed login attempt - invalid password', {
      username: user.username,
      role: user.role,
      ip,
      userAgent,
      reason: 'Invalid password'
    });
    return res.status(401).json({ message: "Invalid password" });
  }

  if (user.status !== "Active") {
    // Log failed login attempt - disabled account
    await logSecurityEvent('WARN', 'Failed login attempt - account disabled', {
      username: user.username,
      role: user.role,
      ip,
      userAgent,
      reason: 'Account disabled'
    });
    return res.status(403).json({ message: "Your account is disabled" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  // IP Tracking - Check if this is a new IP
  const isNewIP = !user.knownIPs || !user.knownIPs.some(known => known.ip === ip);
  
  // Update IP tracking
  if (!user.knownIPs) {
    user.knownIPs = [];
  }
  
  const existingIP = user.knownIPs.find(known => known.ip === ip);
  if (existingIP) {
    existingIP.lastSeen = new Date();
    existingIP.loginCount += 1;
  } else {
    user.knownIPs.push({
      ip,
      firstSeen: new Date(),
      lastSeen: new Date(),
      loginCount: 1
    });
  }
  
  user.lastLoginIP = ip;
  await user.save();

  // Create session
  const deviceInfo = getDeviceInfo(userAgent);
  const session = new Session({
    userId: user._id,
    token,
    ip,
    userAgent,
    deviceInfo,
    lastActivity: new Date(),
    isActive: true
  });
  await session.save();

  // Log successful login with IP tracking info
  await logSecurityEvent(isNewIP ? 'WARN' : 'INFO', isNewIP ? 'Successful login from new IP' : 'Successful login', {
    username: user.username,
    role: user.role,
    userId: user._id.toString(),
    ip,
    userAgent,
    isNewIP: isNewIP,
    sessionId: session._id.toString()
  });

  res.json({
    token,
    user: {
      _id: user._id.toString(), // send id to localStorage for user
      username: user.username,
      role: user.role,
      allowedApps: user.allowedApps,
      permissions: user.permissions,
      needsPasswordChange: user.needsPasswordChange
    },
  });
});

module.exports = router;
