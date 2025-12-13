const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");

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

// ==================== USER MANAGEMENT ====================

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

// ==================== TEST MANAGEMENT ====================

// POST /api/admin/tests - Create a new test
router.post("/tests", async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Test name is required" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO tests (name, description) VALUES (?, ?)",
      [name, description || ""]
    );

    res.status(201).json({
      message: "Test created successfully",
      testId: result.insertId,
      test: { id: result.insertId, name, description },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/tests - Get all tests
router.get("/tests", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, name, description FROM tests ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST SESSION MANAGEMENT ====================

// POST /api/admin/sessions - Create a test session
router.post("/sessions", async (req, res) => {
  const { test_id, session_date, location, max_capacity, admin_notes } =
    req.body;

  if (!test_id || !session_date || !location) {
    return res
      .status(400)
      .json({ error: "test_id, session_date, and location are required" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO test_sessions (test_id, session_date, location, max_capacity, admin_notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [
        test_id,
        session_date,
        location,
        max_capacity || null,
        admin_notes || "",
        req.user.id,
      ]
    );

    res.status(201).json({
      message: "Test session created successfully",
      sessionId: result.insertId,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/sessions - Get all test sessions
router.get("/sessions", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        ts.id,
        ts.test_id,
        t.name as test_name,
        ts.session_date,
        ts.location,
        ts.status,
        ts.max_capacity,
        (SELECT COUNT(*) FROM test_participants WHERE session_id = ts.id) as registered_count,
        ts.created_at
      FROM test_sessions ts
      JOIN tests t ON ts.test_id = t.id
      ORDER BY ts.session_date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/status - Update session status
router.patch("/sessions/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (
    !status ||
    !["scheduled", "ongoing", "completed", "cancelled"].includes(status)
  ) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE test_sessions SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ message: `Session status updated to ${status}` });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST PARTICIPANT MANAGEMENT ====================

// POST /api/admin/sessions/:id/register-participants - Register multiple participants for a session
router.post("/sessions/:id/register-participants", async (req, res) => {
  const { id: session_id } = req.params;
  const { participants } = req.body;

  if (!Array.isArray(participants) || participants.length === 0) {
    return res
      .status(400)
      .json({ error: "participants array is required and must not be empty" });
  }

  try {
    // Verify session exists
    const [sessionRows] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ?",
      [session_id]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const registered = [];
    const errors = [];

    for (const participant of participants) {
      const { full_name, phone_number } = participant;

      if (!full_name) {
        errors.push({
          participant,
          error: "full_name is required",
        });
        continue;
      }

      try {
        // Generate unique participant ID code (e.g., SESS001, SESS002, etc.)
        const [existingCount] = await db.execute(
          "SELECT COUNT(*) as count FROM test_participants WHERE session_id = ?",
          [session_id]
        );

        const nextNumber = (existingCount[0].count + 1)
          .toString()
          .padStart(3, "0");
        const participant_id_code = `P${session_id}${nextNumber}`;

        const [result] = await db.execute(
          "INSERT INTO test_participants (session_id, participant_id_code, full_name, phone_number) VALUES (?, ?, ?, ?)",
          [session_id, participant_id_code, full_name, phone_number || ""]
        );

        registered.push({
          id: result.insertId,
          participant_id_code,
          full_name,
        });
      } catch (err) {
        errors.push({
          participant,
          error: err.message,
        });
      }
    }

    res.status(201).json({
      message: "Participants registered successfully",
      registered_count: registered.length,
      registered,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/sessions/:id/participants - Get all participants for a session
router.get("/sessions/:id/participants", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT 
        id,
        participant_id_code,
        full_name,
        phone_number,
        listening_score,
        speaking_score,
        has_entered_startscreen,
        entered_at,
        test_started,
        test_started_at,
        created_at
      FROM test_participants
      WHERE session_id = ?
      ORDER BY created_at ASC`,
      [session_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/participants/:id/scores - Set listening and speaking scores
router.put("/participants/:id/scores", async (req, res) => {
  const { id } = req.params;
  const { listening_score, speaking_score } = req.body;

  if (
    listening_score === undefined ||
    speaking_score === undefined ||
    listening_score === null ||
    speaking_score === null
  ) {
    return res
      .status(400)
      .json({ error: "listening_score and speaking_score are required" });
  }

  if (listening_score < 0 || listening_score > 9) {
    return res
      .status(400)
      .json({ error: "listening_score must be between 0 and 9" });
  }

  if (speaking_score < 0 || speaking_score > 9) {
    return res
      .status(400)
      .json({ error: "speaking_score must be between 0 and 9" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE test_participants SET listening_score = ?, speaking_score = ? WHERE id = ?",
      [listening_score, speaking_score, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    res.json({
      message: "Scores updated successfully",
      listening_score,
      speaking_score,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/start-all - Start test for all entered participants
router.patch("/sessions/:id/start-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Verify session exists
    const [sessionRows] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ?",
      [session_id]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Update status for all participants who have entered the start screen
    const [result] = await db.execute(
      `UPDATE test_participants 
       SET test_started = 1, test_started_at = NOW() 
       WHERE session_id = ? AND has_entered_startscreen = 1`,
      [session_id]
    );

    res.json({
      message: "Test started for all entered participants",
      updated_count: result.affectedRows,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/sessions/:id/dashboard - Get real-time dashboard data for a session
router.get("/sessions/:id/dashboard", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Get session info
    const [sessionData] = await db.execute(
      `SELECT 
        ts.id,
        ts.test_id,
        t.name as test_name,
        ts.session_date,
        ts.location,
        ts.status,
        ts.max_capacity
      FROM test_sessions ts
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.id = ?`,
      [session_id]
    );

    if (sessionData.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get participants with their status
    const [participants] = await db.execute(
      `SELECT 
        id,
        participant_id_code,
        full_name,
        has_entered_startscreen,
        entered_at,
        test_started,
        test_started_at,
        listening_score,
        speaking_score
      FROM test_participants
      WHERE session_id = ?
      ORDER BY created_at ASC`,
      [session_id]
    );

    const stats = {
      total: participants.length,
      entered_startscreen: participants.filter((p) => p.has_entered_startscreen)
        .length,
      test_started: participants.filter((p) => p.test_started).length,
      scores_pending: participants.filter(
        (p) => p.listening_score === null || p.speaking_score === null
      ).length,
    };

    res.json({
      session: sessionData[0],
      participants,
      stats,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
