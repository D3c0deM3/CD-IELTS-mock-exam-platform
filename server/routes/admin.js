const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth'); // Assuming we create this middleware

// Middleware to check for admin role
const adminMiddleware = async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// All routes in this file are protected and require admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, full_name, phone_number, role FROM users');
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
