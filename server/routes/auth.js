const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

//changePassword
router.put("/changePassword", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId)
    return res.status(400).json({ success: false, error: "Missing userId" });

  const user = await User.findOne({ _id: userId });
  if (!user)
    return res.status(404).json({ success: false, error: "User not found" });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch)
    return res.json({ success: false, error: "Old password is incorrect" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ success: true });
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, role, allowedApps, status, orgUnit } =
      req.body;

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
      role: role || "user",
      status: status || "Active",
      allowedApps: allowedApps || [],
      orgUnit: orgUnit || "",
      updatedAt: new Date(),
    });

    await user.save();

    res.status(201).json({
      message: "User created",
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        allowedApps: user.allowedApps,
        orgUnit: user.orgUnit,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(400).json({ error: err.message || "Error creating user" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid password" });

  if (user.status !== "Active") {
    return res.status(403).json({ message: "Your account is disabled" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({
    token,
    user: {
      _id: user._id.toString(), // send id to localStorage for user
      username: user.username,
      role: user.role,
      allowedApps: user.allowedApps,
    },
  });
});

module.exports = router;
