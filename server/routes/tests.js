const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// GET /api/tests - Get all tests
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, description FROM tests');
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tests/:id - Get a single test with sections and questions
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [testRows] = await db.execute('SELECT * FROM tests WHERE id = ?', [id]);
    if (testRows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    const test = testRows[0];

    const [sectionRows] = await db.execute('SELECT * FROM sections WHERE test_id = ?', [id]);
    test.sections = sectionRows;

    for (const section of test.sections) {
      const [questionRows] = await db.execute('SELECT * FROM questions WHERE section_id = ?', [section.id]);
      section.questions = questionRows;
    }

    res.json(test);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tests/:id/submit - Submit answers for a test
router.post('/:id/submit', async (req, res) => {
  const { id: testId } = req.params;
  const { answers } = req.body; // Expecting an array of { question_id, answer_id, answer_text }

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid answers format' });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    for (const answer of answers) {
      await connection.execute(
        'INSERT INTO user_answers (user_id, question_id, answer_id, answer_text) VALUES (?, ?, ?, ?)',
        [req.user.id, answer.question_id, answer.answer_id, answer.answer_text]
      );
    }

    await connection.commit();
    connection.release();

    res.json({ message: 'Answers submitted successfully' });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
