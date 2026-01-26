const router = require("express").Router();
const User = require("../models/User");
const { logSecurityEvent } = require('../utils/securityLogger');

// GET ALL USERS
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    console.error("GetUsers Error:", err);
    res.status(500).send("Error fetching users");
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update", details: err.message });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deletedBy = req.user?.username || 'unknown'; // אם יש middleware של auth

    // Get user info before deletion for logging
    const userToDelete = await User.findById(req.params.id);
    
    if (userToDelete) {
      await User.findByIdAndDelete(req.params.id);
      
      // Log user deletion
      await logSecurityEvent('WARN', 'User deleted', {
        username: userToDelete.username,
        role: userToDelete.role,
        deletedUserId: req.params.id,
        deletedBy,
        ip,
        userAgent
      });
    } else {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
