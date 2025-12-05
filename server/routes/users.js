const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users/:id - lookup user by id (ID code)
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });

  try {
    const [rows] = await db.execute(
      'SELECT id, email, full_name FROM users WHERE id = ? LIMIT 1',
      [id]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ exists: false });

    const user = rows[0];
    return res.json({ exists: true, id: user.id, email: user.email, full_name: user.full_name });
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
