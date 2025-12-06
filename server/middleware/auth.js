const jwt = require('jsonwebtoken');
const db = require('../db');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the session is still valid in the database
    const [rows] = await db.execute('SELECT * FROM user_sessions WHERE user_id = ? AND token = ?', [decoded.id, token]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error('JWT error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
