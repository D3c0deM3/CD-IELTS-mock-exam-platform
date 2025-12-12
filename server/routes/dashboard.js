const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");

/**
 * GET /api/dashboard/profile
 * Get user profile information
 * Returns: { user: { id, full_name, phone_number, role } }
 */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, full_name, phone_number, role FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    res.json({ user });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/dashboard/results
 * Get all test results for the authenticated user
 * Returns results ordered by created_at DESC (latest first)
 * Joins with tests table to get test names
 * Returns: { results: [ { id, student_id, test_id, test_name, reading_score, listening_score, writing_score, speaking_score, total_score, is_writing_scored, is_speaking_scored, created_at }, ... ] }
 */
router.get("/results", authMiddleware, async (req, res) => {
  try {
    const [results] = await db.execute(
      `SELECT 
        r.id,
        r.student_id,
        r.test_id,
        t.name as test_name,
        r.reading_score,
        r.listening_score,
        r.writing_score,
        r.speaking_score,
        r.total_score,
        r.reading_completed,
        r.listening_completed,
        r.writing_completed,
        r.speaking_completed,
        r.is_writing_scored,
        r.is_speaking_scored,
        r.created_at,
        r.updated_at
      FROM results r
      LEFT JOIN tests t ON r.test_id = t.id
      WHERE r.student_id = ?
      ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json({ results });
  } catch (err) {
    console.error("Error fetching user results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/dashboard/latest-result
 * Get the latest test result for the authenticated user
 * Returns: { result: { ... } | null }
 */
router.get("/latest-result", authMiddleware, async (req, res) => {
  try {
    const [results] = await db.execute(
      `SELECT 
        r.id,
        r.student_id,
        r.test_id,
        t.name as test_name,
        r.reading_score,
        r.listening_score,
        r.writing_score,
        r.speaking_score,
        r.total_score,
        r.reading_completed,
        r.listening_completed,
        r.writing_completed,
        r.speaking_completed,
        r.is_writing_scored,
        r.is_speaking_scored,
        r.created_at,
        r.updated_at
      FROM results r
      LEFT JOIN tests t ON r.test_id = t.id
      WHERE r.student_id = ?
      ORDER BY r.created_at DESC
      LIMIT 1`,
      [req.user.id]
    );

    const result = results.length > 0 ? results[0] : null;
    res.json({ result });
  } catch (err) {
    console.error("Error fetching latest result:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/dashboard/available-tests
 * Get all available tests that user can take
 * Returns: { tests: [ { id, name, description }, ... ] }
 */
router.get("/available-tests", authMiddleware, async (req, res) => {
  try {
    const [tests] = await db.execute("SELECT id, name, description FROM tests");

    res.json({ tests });
  } catch (err) {
    console.error("Error fetching available tests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 * Returns: {
 *   totalTests: number,
 *   completedTests: number,
 *   averageScore: number | null,
 *   recentResults: [ ... ]
 * }
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    // Get total tests available
    const [totalTestsResult] = await db.execute(
      "SELECT COUNT(*) as count FROM tests"
    );
    const totalTests = totalTestsResult[0]?.count || 0;

    // Get completed tests for user
    const [completedResult] = await db.execute(
      "SELECT COUNT(*) as count FROM results WHERE student_id = ?",
      [req.user.id]
    );
    const completedTests = completedResult[0]?.count || 0;

    // Get average score for user
    const [avgResult] = await db.execute(
      "SELECT AVG(total_score) as avg FROM results WHERE student_id = ? AND total_score IS NOT NULL",
      [req.user.id]
    );
    const averageScore = avgResult[0]?.avg || null;

    // Get recent results (last 5)
    const [recentResults] = await db.execute(
      `SELECT 
        r.id,
        r.test_id,
        t.name as test_name,
        r.total_score,
        r.created_at
      FROM results r
      LEFT JOIN tests t ON r.test_id = t.id
      WHERE r.student_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5`,
      [req.user.id]
    );

    res.json({
      totalTests,
      completedTests,
      averageScore: averageScore ? Number(averageScore).toFixed(2) : null,
      recentResults,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
