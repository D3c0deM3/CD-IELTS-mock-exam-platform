const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth"); // Assuming we create this middleware

// Middleware to check for admin role
const adminMiddleware = async (req, res, next) => {
  try {
    const [rows] = await db.execute("SELECT role FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (rows.length === 0 || rows[0].role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// All routes in this file are protected and require admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/users - Get all users
router.get("/users", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, full_name, phone_number, role, status FROM users"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id/status - Update user status (active/inactive)
router.patch("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["active", "inactive"].includes(status)) {
    return res
      .status(400)
      .json({ error: 'Invalid status. Must be "active" or "inactive"' });
  }

  try {
    const [result] = await db.execute(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: `User status updated to ${status}`,
      userId: id,
      status,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
