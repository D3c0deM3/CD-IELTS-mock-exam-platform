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
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
      "INSERT INTO users (full_name, phone_number, password) VALUES (?, ?, ?)",
      [full_name, phone_number, hashedPassword]
    );

    res
      .status(201)
      .json({ message: "User created successfully", userId: result.insertId });
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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    await db.execute(
      "INSERT INTO user_sessions (user_id, token) VALUES (?, ?)",
      [user.id, token]
    );

    res.json({ token, user: { role: user.role } });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
