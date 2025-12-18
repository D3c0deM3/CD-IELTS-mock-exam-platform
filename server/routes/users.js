const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// GET /api/users/:id - lookup user by id (ID code)
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id parameter" });

  try {
    const [rows] = await db.execute(
      "SELECT id, phone_number, full_name FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows || rows.length === 0)
      return res.status(404).json({ exists: false });

    const user = rows[0];
    return res.json({
      exists: true,
      id: user.id,
      phone_number: user.phone_number,
      full_name: user.full_name,
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  const { full_name, phone_number, password } = req.body;

  if (!full_name || !phone_number || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if phone number already exists (prevents duplicate entry error)
    const [existingUser] = await db.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        error:
          "An account with this phone number already exists. Please log in instead.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
      "INSERT INTO users (full_name, phone_number, password) VALUES (?, ?, ?)",
      [full_name, phone_number, hashedPassword]
    );

    const userId = result.insertId;

    // Generate JWT token for auto-login after registration
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Create session for the new user with 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await db.execute(
      "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );

    res.status(201).json({
      message: "User created successfully",
      userId,
      token,
      user: { role: "student", full_name, phone_number },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (rows.length === 0) {
      console.log(`Login attempt: User not found for phone ${phone_number}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    console.log(
      `Login attempt: User found - ${user.full_name}, role: ${user.role}, status: ${user.status}`
    );

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(
      `Login attempt: Password ${isMatch ? "matches" : "does not match"}`
    );

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Create session with 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await db.execute(
      "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    console.log(`Login successful: User ${user.id} (${user.full_name})`);
    res.json({
      token,
      user: {
        role: user.role,
        full_name: user.full_name,
        phone_number: user.phone_number,
      },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/make-admin - Make a user an admin (by phone number)
router.post("/make-admin", async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: "phone_number is required" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE users SET role = 'admin' WHERE phone_number = ?",
      [phone_number]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: `User with phone number ${phone_number} is now an admin`,
      phone_number,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/create-admin - Create a new admin user
router.post("/create-admin", async (req, res) => {
  const { full_name, phone_number, password } = req.body;

  if (!full_name || !phone_number || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if phone number already exists
    const [existingUser] = await db.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        error:
          "An account with this phone number already exists. Use /make-admin to promote it.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
      "INSERT INTO users (full_name, phone_number, password, role) VALUES (?, ?, ?, 'admin')",
      [full_name, phone_number, hashedPassword]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Create session with 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.execute(
      "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );

    res.status(201).json({
      message: "Admin user created successfully",
      userId,
      token,
      user: { role: "admin", full_name, phone_number },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
