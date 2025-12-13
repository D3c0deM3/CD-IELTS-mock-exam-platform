const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");

/**
 * POST /api/test-sessions/register-students
 * Admin endpoint: Register multiple students for a test session
 * Body: { session_id, student_ids: [1, 2, 3, ...] }
 */
router.post("/register-students", authMiddleware, async (req, res) => {
  const { session_id, student_ids } = req.body;

  // Check if user is admin
  const [userRows] = await db.execute("SELECT role FROM users WHERE id = ?", [
    req.user.id,
  ]);
  if (userRows.length === 0 || userRows[0].role !== "admin") {
    return res.status(403).json({ error: "Only admins can register students" });
  }

  if (!session_id || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: "Invalid session_id or student_ids" });
  }

  try {
    // Verify session exists and get test info for validation
    const [sessionRows] = await db.execute(
      "SELECT ts.id, ts.test_id, ts.session_date, ts.location, t.name FROM test_sessions ts JOIN tests t ON ts.test_id = t.id WHERE ts.id = ?",
      [session_id]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "Test session not found" });
    }

    // Register each student
    const registered = [];
    const errors = [];

    for (const student_id of student_ids) {
      try {
        await db.execute(
          "INSERT INTO test_registrations (student_id, session_id, registration_status) VALUES (?, ?, 'registered') ON DUPLICATE KEY UPDATE registration_status = 'registered', updated_at = NOW()",
          [student_id, session_id]
        );
        registered.push(student_id);
      } catch (err) {
        errors.push({ student_id, error: err.message });
      }
    }

    res.json({
      message: "Students registered for test session",
      registered_count: registered.length,
      registered,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error registering students:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/test-sessions/available
 * Get all available test sessions (not yet started/completed)
 * User sees all upcoming test sessions to request registration
 */
router.get("/available", authMiddleware, async (req, res) => {
  try {
    const [sessions] = await db.execute(
      `SELECT 
        ts.id,
        ts.test_id,
        t.name as test_name,
        t.description,
        ts.session_date,
        ts.location,
        ts.status,
        ts.max_capacity,
        (SELECT COUNT(*) FROM test_registrations WHERE session_id = ts.id) as registered_count
      FROM test_sessions ts
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.status IN ('scheduled', 'ongoing')
      ORDER BY ts.session_date ASC`
    );

    res.json({ sessions });
  } catch (err) {
    console.error("Error fetching available sessions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/test-sessions/my-registrations
 * Get all test sessions the authenticated user is registered for
 */
router.get("/my-registrations", authMiddleware, async (req, res) => {
  try {
    const [registrations] = await db.execute(
      `SELECT 
        ts.id as session_id,
        ts.test_id,
        t.name as test_name,
        t.description,
        ts.session_date,
        ts.location,
        ts.status as session_status,
        tr.registration_status,
        tr.registered_at
      FROM test_registrations tr
      JOIN test_sessions ts ON tr.session_id = ts.id
      JOIN tests t ON ts.test_id = t.id
      WHERE tr.student_id = ?
      ORDER BY ts.session_date ASC`,
      [req.user.id]
    );

    res.json({ registrations });
  } catch (err) {
    console.error("Error fetching user registrations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/test-sessions/create
 * Admin endpoint: Create a new test session
 * Body: { test_id, session_date, location, max_capacity, admin_notes }
 */
router.post("/create", authMiddleware, async (req, res) => {
  const { test_id, session_date, location, max_capacity, admin_notes } =
    req.body;

  // Check if user is admin
  const [userRows] = await db.execute("SELECT role FROM users WHERE id = ?", [
    req.user.id,
  ]);
  if (userRows.length === 0 || userRows[0].role !== "admin") {
    return res.status(403).json({ error: "Only admins can create sessions" });
  }

  if (!test_id || !session_date || !location) {
    return res.status(400).json({
      error: "Missing required fields: test_id, session_date, location",
    });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO test_sessions (test_id, session_date, location, max_capacity, admin_notes, created_by, status) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')",
      [
        test_id,
        session_date,
        location,
        max_capacity || null,
        admin_notes || null,
        req.user.id,
      ]
    );

    res.status(201).json({
      message: "Test session created successfully",
      session_id: result.insertId,
    });
  } catch (err) {
    console.error("Error creating test session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/test-sessions/:id/status
 * Admin endpoint: Update test session status
 * Body: { status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' }
 */
router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Check if user is admin
  const [userRows] = await db.execute("SELECT role FROM users WHERE id = ?", [
    req.user.id,
  ]);
  if (userRows.length === 0 || userRows[0].role !== "admin") {
    return res.status(403).json({ error: "Only admins can update sessions" });
  }

  const validStatuses = ["scheduled", "ongoing", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  try {
    await db.execute(
      "UPDATE test_sessions SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );

    res.json({ message: `Test session status updated to ${status}` });
  } catch (err) {
    console.error("Error updating test session status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/test-sessions/:id
 * Get detailed information about a specific test session
 */
router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const [sessions] = await db.execute(
      `SELECT 
        ts.id,
        ts.test_id,
        t.name as test_name,
        t.description,
        ts.session_date,
        ts.location,
        ts.status,
        ts.max_capacity,
        ts.admin_notes,
        (SELECT COUNT(*) FROM test_registrations WHERE session_id = ts.id AND registration_status = 'registered') as registered_count,
        (SELECT COUNT(*) FROM test_registrations WHERE session_id = ts.id AND registration_status = 'attended') as attended_count
      FROM test_sessions ts
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.id = ?`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Test session not found" });
    }

    res.json({ session: sessions[0] });
  } catch (err) {
    console.error("Error fetching test session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/test-sessions/check-in-participant
 * Participant enters their ID code on the start screen
 */
router.post("/check-in-participant", async (req, res) => {
  const { participant_id_code } = req.body;

  if (!participant_id_code) {
    return res.status(400).json({ error: "participant_id_code is required" });
  }

  try {
    // Find participant and update their check-in status
    const [participantRows] = await db.execute(
      `SELECT tp.id, tp.session_id, tp.participant_id_code, tp.full_name, tp.listening_score, tp.reading_score, tp.writing_score, tp.speaking_score, ts.test_id, t.name as test_name
       FROM test_participants tp
       JOIN test_sessions ts ON tp.session_id = ts.id
       JOIN tests t ON ts.test_id = t.id
       WHERE tp.participant_id_code = ?`,
      [participant_id_code]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant ID code not found" });
    }

    const participant = participantRows[0];

    // Update check-in status
    await db.execute(
      "UPDATE test_participants SET has_entered_startscreen = 1, entered_at = NOW() WHERE id = ?",
      [participant.id]
    );

    res.json({
      message: "Check-in successful",
      participant: {
        id: participant.id,
        participant_id_code: participant.participant_id_code,
        full_name: participant.full_name,
        session_id: participant.session_id,
        test_id: participant.test_id,
        test_name: participant.test_name,
        listening_score: participant.listening_score,
        reading_score: participant.reading_score,
        writing_score: participant.writing_score,
        speaking_score: participant.speaking_score,
      },
    });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/test-sessions/participant/:id_code/can-start
 * Check if participant can start the test
 */
router.get("/participant/:id_code/can-start", async (req, res) => {
  const { id_code } = req.params;

  try {
    const [participantRows] = await db.execute(
      `SELECT tp.id, tp.test_started, tp.listening_score, tp.reading_score, tp.writing_score, tp.speaking_score, tp.session_id
       FROM test_participants tp
       WHERE tp.participant_id_code = ?`,
      [id_code]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];

    res.json({
      can_start:
        participant.test_started === 1 || participant.test_started === true,
      listening_score: participant.listening_score,
      reading_score: participant.reading_score,
      writing_score: participant.writing_score,
      speaking_score: participant.speaking_score,
      test_started:
        participant.test_started === 1 || participant.test_started === true,
    });
  } catch (err) {
    console.error("Error checking start status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/test-sessions/:id/can-take-test
 * Check if user is registered for this session and if session is currently ongoing
 */
router.get("/:id/can-take-test", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user is registered for this session
    const [registrations] = await db.execute(
      "SELECT registration_status FROM test_registrations WHERE session_id = ? AND student_id = ? AND registration_status = 'registered'",
      [id, req.user.id]
    );

    if (registrations.length === 0) {
      return res.json({
        can_take: false,
        reason: "not_registered",
      });
    }

    // Check if session is currently ongoing
    const [sessions] = await db.execute(
      "SELECT status, session_date FROM test_sessions WHERE id = ?",
      [id]
    );

    if (sessions.length === 0) {
      return res.json({
        can_take: false,
        reason: "session_not_found",
      });
    }

    const session = sessions[0];
    const now = new Date();
    const sessionDate = new Date(session.session_date);

    // Allow taking test only if session status is 'ongoing'
    const can_take = session.status === "ongoing" && sessionDate <= now;

    res.json({
      can_take,
      reason: can_take
        ? "authorized"
        : session.status === "ongoing"
        ? "test_not_started_yet"
        : `session_${session.status}`,
      session_status: session.status,
      session_date: sessionDate,
    });
  } catch (err) {
    console.error("Error checking test availability:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
