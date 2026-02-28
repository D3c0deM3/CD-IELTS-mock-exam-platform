const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { calculateBandScore } = require("../utils/scoreCalculator");

// Middleware to check for center role
const centerMiddleware = async (req, res, next) => {
  try {
    const [rows] = await db.execute("SELECT role FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (rows.length === 0 || rows[0].role !== "center") {
      return res.status(403).json({ error: "Forbidden - Center role required" });
    }

    // Get or create center record
    const [centerRows] = await db.execute(
      "SELECT id, center_name, max_session_users FROM course_centers WHERE user_id = ?",
      [req.user.id]
    );

    if (centerRows.length === 0) {
      // Auto-create center record
      const [userRows] = await db.execute(
        "SELECT full_name FROM users WHERE id = ?",
        [req.user.id]
      );
      const centerName = userRows[0]?.full_name || "Course Center";
      const [result] = await db.execute(
        "INSERT INTO course_centers (user_id, center_name) VALUES (?, ?)",
        [req.user.id, centerName]
      );
      req.center = {
        id: result.insertId,
        center_name: centerName,
        max_session_users: 50,
      };
    } else {
      req.center = centerRows[0];
    }

    next();
  } catch (err) {
    console.error("Center middleware error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// All routes require auth + center role
router.use(authMiddleware);
router.use(centerMiddleware);

// ==================== CENTER PROFILE ====================

// GET /api/center/profile - Get center profile info
router.get("/profile", async (req, res) => {
  try {
    const [userRows] = await db.execute(
      "SELECT id, full_name, phone_number FROM users WHERE id = ?",
      [req.user.id]
    );

    const [studentCount] = await db.execute(
      "SELECT COUNT(*) as count FROM center_students WHERE center_id = ?",
      [req.center.id]
    );

    const [sessionCount] = await db.execute(
      "SELECT COUNT(*) as count FROM test_sessions WHERE center_id = ?",
      [req.center.id]
    );

    res.json({
      user: userRows[0],
      center: req.center,
      stats: {
        total_students: studentCount[0].count,
        total_sessions: sessionCount[0].count,
      },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== STUDENT MANAGEMENT ====================

// GET /api/center/students - Get all students added to this center
router.get("/students", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        cs.id as center_student_id,
        u.id as user_id,
        u.full_name,
        u.phone_number,
        u.status,
        cs.added_at,
        (SELECT COUNT(*) FROM results WHERE student_id = u.id) as total_tests,
        (SELECT AVG(
          (COALESCE(listening_score, 0) + COALESCE(reading_score, 0) + COALESCE(writing_score, 0) + COALESCE(speaking_score, 0)) / 
          GREATEST(1, (CASE WHEN listening_score IS NOT NULL THEN 1 ELSE 0 END + 
                        CASE WHEN reading_score IS NOT NULL THEN 1 ELSE 0 END + 
                        CASE WHEN writing_score IS NOT NULL THEN 1 ELSE 0 END + 
                        CASE WHEN speaking_score IS NOT NULL THEN 1 ELSE 0 END))
        ) FROM results WHERE student_id = u.id) as avg_score,
        (SELECT MAX(created_at) FROM results WHERE student_id = u.id) as last_test_date
      FROM center_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.center_id = ?
      ORDER BY u.full_name ASC`,
      [req.center.id]
    );

    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/center/students/search - Search users to add as students
router.get("/students/search", async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  try {
    const searchTerm = `%${q.trim()}%`;
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.phone_number
       FROM users u
       WHERE u.role = 'student' 
         AND (u.full_name LIKE ? OR u.phone_number LIKE ?)
         AND u.id NOT IN (SELECT student_id FROM center_students WHERE center_id = ?)
       ORDER BY u.full_name ASC
       LIMIT 20`,
      [searchTerm, searchTerm, req.center.id]
    );

    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/center/students - Add a student to this center
router.post("/students", async (req, res) => {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id is required" });
  }

  try {
    // Verify user exists and is a student
    const [userRows] = await db.execute(
      "SELECT id, full_name, phone_number FROM users WHERE id = ? AND role = 'student'",
      [student_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    await db.execute(
      "INSERT INTO center_students (center_id, student_id) VALUES (?, ?)",
      [req.center.id, student_id]
    );

    res.status(201).json({
      message: "Student added successfully",
      student: userRows[0],
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Student already added to this center" });
    }
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/center/students/:id - Remove a student from this center
router.delete("/students/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute(
      "DELETE FROM center_students WHERE id = ? AND center_id = ?",
      [id, req.center.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Student not found in center" });
    }

    res.json({ message: "Student removed from center" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/center/students/:userId/stats - Get detailed stats for a student
router.get("/students/:userId/stats", async (req, res) => {
  const { userId } = req.params;

  try {
    // Verify student belongs to this center
    const [centerCheck] = await db.execute(
      "SELECT id FROM center_students WHERE center_id = ? AND student_id = ?",
      [req.center.id, userId]
    );

    if (centerCheck.length === 0) {
      return res.status(404).json({ error: "Student not found in your center" });
    }

    // Get all results
    const [results] = await db.execute(
      `SELECT r.*, t.name as test_name
       FROM results r
       JOIN tests t ON r.test_id = t.id
       WHERE r.student_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Get user info
    const [userRows] = await db.execute(
      "SELECT id, full_name, phone_number FROM users WHERE id = ?",
      [userId]
    );

    // Calculate statistics
    const totalTests = results.length;
    let totalListening = 0,
      totalReading = 0,
      totalWriting = 0,
      totalSpeaking = 0;
    let countL = 0, countR = 0, countW = 0, countS = 0;

    results.forEach((r) => {
      if (r.listening_score != null) { totalListening += parseFloat(r.listening_score); countL++; }
      if (r.reading_score != null) { totalReading += parseFloat(r.reading_score); countR++; }
      if (r.writing_score != null) { totalWriting += parseFloat(r.writing_score); countW++; }
      if (r.speaking_score != null) { totalSpeaking += parseFloat(r.speaking_score); countS++; }
    });

    res.json({
      student: userRows[0],
      stats: {
        total_tests: totalTests,
        avg_listening: countL > 0 ? (totalListening / countL).toFixed(1) : null,
        avg_reading: countR > 0 ? (totalReading / countR).toFixed(1) : null,
        avg_writing: countW > 0 ? (totalWriting / countW).toFixed(1) : null,
        avg_speaking: countS > 0 ? (totalSpeaking / countS).toFixed(1) : null,
        avg_overall:
          totalTests > 0
            ? (
                ((countL > 0 ? totalListening / countL : 0) +
                  (countR > 0 ? totalReading / countR : 0) +
                  (countW > 0 ? totalWriting / countW : 0) +
                  (countS > 0 ? totalSpeaking / countS : 0)) /
                Math.max(1, (countL > 0 ? 1 : 0) + (countR > 0 ? 1 : 0) + (countW > 0 ? 1 : 0) + (countS > 0 ? 1 : 0))
              ).toFixed(1)
            : null,
      },
      results,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST MANAGEMENT ====================

// GET /api/center/tests - Get all tests
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

// GET /api/center/test-materials - Get all test material sets
router.get("/test-materials", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ms.id, ms.test_id, ms.name, t.name AS test_name
       FROM test_material_sets ms
       JOIN tests t ON ms.test_id = t.id
       ORDER BY ms.updated_at DESC`
    );

    if (rows.length > 0) {
      return res.json({
        materials: rows.map((row) => ({
          mock_id: row.id,
          name: row.name,
          test_id: row.test_id,
          test_name: row.test_name,
        })),
      });
    }

    // Fallback to file-based
    const fs = require("fs");
    const path = require("path");
    const routesDir = path.join(__dirname, "./");
    const files = fs.readdirSync(routesDir);
    const materials = [];

    files.forEach((file) => {
      if (file.startsWith("answers") && file.endsWith(".json")) {
        let mockId = 2;
        let mockName = "Mock 2 - Authentic Test 1";
        if (file === "answers.json") {
          mockId = 2;
          mockName = "Mock 2 - Authentic Test 1";
        } else if (file === "answers_3.json") {
          mockId = 3;
          mockName = "Mock 3 - Authentic Test 2";
        } else {
          const match = file.match(/answers_(\d+)\.json/);
          if (match) {
            mockId = parseInt(match[1]);
            mockName = `Mock ${mockId} - Authentic Test ${mockId - 1}`;
          }
        }
        materials.push({ mock_id: mockId, name: mockName, file });
      }
    });

    materials.sort((a, b) => a.mock_id - b.mock_id);
    res.json({ materials });
  } catch (err) {
    console.error("Error getting test materials:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== SESSION MANAGEMENT ====================

// POST /api/center/sessions - Create a session (center-owned)
router.post("/sessions", async (req, res) => {
  const { test_id, session_date, location, max_capacity, admin_notes, test_materials_id } =
    req.body;

  if (!test_id || !session_date || !location) {
    return res.status(400).json({ error: "test_id, session_date, and location are required" });
  }

  // Enforce max_session_users limit
  const capacity = max_capacity
    ? Math.min(parseInt(max_capacity), req.center.max_session_users)
    : req.center.max_session_users;

  try {
    const notesWithMaterials = admin_notes
      ? `[MOCK_ID:${test_materials_id || 2}] ${admin_notes}`
      : `[MOCK_ID:${test_materials_id || 2}]`;

    const [result] = await db.execute(
      "INSERT INTO test_sessions (test_id, session_date, location, max_capacity, admin_notes, created_by, center_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [test_id, session_date, location, capacity, notesWithMaterials, req.user.id, req.center.id]
    );

    res.status(201).json({
      message: "Session created successfully",
      sessionId: result.insertId,
      max_capacity: capacity,
      center_limit: req.center.max_session_users,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/center/sessions - Get center's sessions only
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
      WHERE ts.center_id = ?
      ORDER BY ts.session_date DESC`,
      [req.center.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/center/sessions/:id - Delete a center-owned session
router.delete("/sessions/:id", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const [sessionCheck] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ? AND center_id = ?",
      [session_id, req.center.id]
    );

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    await db.execute("DELETE FROM test_participants WHERE session_id = ?", [session_id]);
    await db.execute("DELETE FROM test_sessions WHERE id = ?", [session_id]);

    res.json({ message: "Session deleted successfully" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== PARTICIPANT MANAGEMENT ====================

// GET /api/center/sessions/:id/search-students - Search center's students for adding to session
router.get("/sessions/:id/search-students", async (req, res) => {
  const { id: session_id } = req.params;
  const { q } = req.query;

  if (!q || q.trim().length < 1) {
    return res.json([]);
  }

  try {
    // Verify session belongs to this center
    const [sessionCheck] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ? AND center_id = ?",
      [session_id, req.center.id]
    );

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const searchTerm = `%${q.trim()}%`;
    // Only search within center's students
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.phone_number
       FROM center_students cs
       JOIN users u ON cs.student_id = u.id
       WHERE cs.center_id = ?
         AND (u.full_name LIKE ? OR u.phone_number LIKE ?)
         AND u.id NOT IN (
           SELECT tp2.phone_number_user_id FROM (
             SELECT u2.id as phone_number_user_id 
             FROM test_participants tp 
             JOIN users u2 ON tp.phone_number = u2.phone_number 
             WHERE tp.session_id = ?
           ) tp2
         )
       ORDER BY u.full_name ASC
       LIMIT 20`,
      [req.center.id, searchTerm, searchTerm, session_id]
    );

    // If the subquery for excluding existing participants is complex, simplify:
    // Get already-registered phone numbers for this session
    const [existingParticipants] = await db.execute(
      "SELECT phone_number FROM test_participants WHERE session_id = ?",
      [session_id]
    );
    const existingPhones = new Set(existingParticipants.map((p) => p.phone_number));

    const filtered = rows.filter((r) => !existingPhones.has(r.phone_number));

    res.json(filtered);
  } catch (err) {
    console.error("DB error:", err);
    // Fallback simpler query
    try {
      const searchTerm = `%${req.query.q.trim()}%`;
      const [rows] = await db.execute(
        `SELECT u.id, u.full_name, u.phone_number
         FROM center_students cs
         JOIN users u ON cs.student_id = u.id
         WHERE cs.center_id = ?
           AND (u.full_name LIKE ? OR u.phone_number LIKE ?)
         ORDER BY u.full_name ASC
         LIMIT 20`,
        [req.center.id, searchTerm, searchTerm]
      );
      res.json(rows);
    } catch (err2) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// POST /api/center/sessions/:id/register-participant - Register participant for session
router.post("/sessions/:id/register-participant", async (req, res) => {
  const { id: session_id } = req.params;
  const { full_name, phone_number } = req.body;

  if (!full_name || !phone_number) {
    return res.status(400).json({ error: "full_name and phone_number are required" });
  }

  try {
    // Verify session belongs to this center
    const [sessionRows] = await db.execute(
      "SELECT id, max_capacity FROM test_sessions WHERE id = ? AND center_id = ?",
      [session_id, req.center.id]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check capacity
    const [countRows] = await db.execute(
      "SELECT COUNT(*) as count FROM test_participants WHERE session_id = ?",
      [session_id]
    );

    if (
      sessionRows[0].max_capacity &&
      countRows[0].count >= sessionRows[0].max_capacity
    ) {
      return res.status(400).json({
        error: `Session is full (${sessionRows[0].max_capacity} participants max)`,
      });
    }

    // Verify phone number exists in users
    const [userRows] = await db.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (userRows.length === 0) {
      return res.status(400).json({ error: "Phone number not registered in system" });
    }

    // Check duplicate
    const [existing] = await db.execute(
      "SELECT id FROM test_participants WHERE session_id = ? AND phone_number = ?",
      [session_id, phone_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "This participant is already registered for this session" });
    }

    // Generate ID code
    const nextNumber = (countRows[0].count + 1).toString().padStart(3, "0");
    const participant_id_code = `P${session_id}${nextNumber}`;

    const [result] = await db.execute(
      "INSERT INTO test_participants (session_id, participant_id_code, full_name, phone_number) VALUES (?, ?, ?, ?)",
      [session_id, participant_id_code, full_name, phone_number]
    );

    res.status(201).json({
      message: "Participant registered successfully",
      participant: {
        id: result.insertId,
        participant_id_code,
        full_name,
        phone_number,
      },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/center/sessions/:id/participants - Get session participants
router.get("/sessions/:id/participants", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Verify session belongs to this center
    const [sessionCheck] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ? AND center_id = ?",
      [session_id, req.center.id]
    );

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const [rows] = await db.execute(
      `SELECT 
        id, participant_id_code, full_name, phone_number,
        listening_score, reading_score, writing_score, speaking_score,
        has_entered_startscreen, entered_at,
        test_started, test_started_at,
        current_screen, test_status,
        last_activity_at, test_completed_at,
        tab_switch_count, focus_lost_count,
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

// ==================== SESSION DASHBOARD / MONITORING ====================

// GET /api/center/sessions/:id/dashboard - Real-time dashboard data
router.get("/sessions/:id/dashboard", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Verify session belongs to this center
    const [sessionData] = await db.execute(
      `SELECT 
        ts.id, ts.test_id, t.name as test_name, ts.session_date, ts.location,
        ts.status, ts.max_capacity, ts.test_started_at, ts.test_end_at
      FROM test_sessions ts
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.id = ? AND ts.center_id = ?`,
      [session_id, req.center.id]
    );

    if (sessionData.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionData[0];

    // Get test config
    const [configRows] = await db.execute(
      "SELECT listening_minutes, reading_minutes, writing_minutes FROM test_config WHERE test_id = ?",
      [session.test_id]
    );

    const config =
      configRows.length > 0
        ? configRows[0]
        : { listening_minutes: 40, reading_minutes: 60, writing_minutes: 60 };

    // Get participants
    const [participants] = await db.execute(
      `SELECT 
        id, participant_id_code, full_name, phone_number,
        has_entered_startscreen, entered_at,
        test_started, test_started_at,
        current_screen, test_status,
        last_activity_at,
        listening_score, reading_score, writing_score, speaking_score,
        test_completed_at,
        tab_switch_count, focus_lost_count
      FROM test_participants
      WHERE session_id = ?
      ORDER BY created_at ASC`,
      [session_id]
    );

    // Calculate stats
    const now = new Date();
    const OFFLINE_THRESHOLD = 5 * 60 * 1000;

    const stats = {
      total: participants.length,
      entered_startscreen: participants.filter((p) => p.has_entered_startscreen).length,
      test_started: participants.filter((p) => p.test_started && p.test_status !== "completed").length,
      test_completed: participants.filter((p) => p.test_status === "completed").length,
      scores_pending: participants.filter(
        (p) => p.test_completed && (p.writing_score === null || p.speaking_score === null)
      ).length,
      currently_active: participants.filter((p) => {
        if (p.test_status !== "in_progress" && p.test_status !== "paused") return false;
        if (!p.last_activity_at) return false;
        return now - new Date(p.last_activity_at) < OFFLINE_THRESHOLD;
      }).length,
      offline_or_disconnected: participants.filter((p) => {
        if (p.test_status === "completed" || p.test_status === "not_started") return false;
        if (!p.last_activity_at) return true;
        return now - new Date(p.last_activity_at) >= OFFLINE_THRESHOLD;
      }).length,
      paused: participants.filter((p) => p.test_status === "paused").length,
      total_tab_switches: participants.reduce((sum, p) => sum + (p.tab_switch_count || 0), 0),
      total_focus_lost: participants.reduce((sum, p) => sum + (p.focus_lost_count || 0), 0),
    };

    // Get monitoring events for flagged participants
    const [monitoringEvents] = await db.execute(
      `SELECT participant_id, event_type, COUNT(*) as count
       FROM participant_monitoring
       WHERE session_id = ?
       GROUP BY participant_id, event_type`,
      [session_id]
    );

    res.json({
      session: {
        ...session,
        test_started_at: session.test_started_at
          ? new Date(session.test_started_at).toISOString()
          : null,
        test_end_at: session.test_end_at
          ? new Date(session.test_end_at).toISOString()
          : null,
      },
      test_config: config,
      participants,
      stats,
      monitoring: monitoringEvents,
      time_info: {
        now: now.toISOString(),
        test_started_at: session.test_started_at
          ? new Date(session.test_started_at).toISOString()
          : null,
        test_end_at: session.test_end_at
          ? new Date(session.test_end_at).toISOString()
          : null,
      },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST CONTROLS ====================

// PATCH /api/center/sessions/:id/start-all
router.patch("/sessions/:id/start-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const [sessionRows] = await db.execute(
      "SELECT ts.id, ts.test_id FROM test_sessions ts WHERE ts.id = ? AND ts.center_id = ?",
      [session_id, req.center.id]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const test_id = sessionRows[0].test_id;
    const [configRows] = await db.execute(
      "SELECT listening_minutes, reading_minutes, writing_minutes FROM test_config WHERE test_id = ?",
      [test_id]
    );

    let listening = 40, reading = 60, writing = 60;
    if (configRows.length > 0) {
      listening = configRows[0].listening_minutes;
      reading = configRows[0].reading_minutes;
      writing = configRows[0].writing_minutes;
    }

    const totalMinutes = listening + reading + writing + 60;
    const startedAt = new Date();
    const endAt = new Date(startedAt.getTime() + totalMinutes * 60 * 1000);

    await db.execute(
      "UPDATE test_sessions SET test_started_at = ?, test_end_at = ? WHERE id = ?",
      [startedAt, endAt, session_id]
    );

    const [result] = await db.execute(
      `UPDATE test_participants 
       SET test_started = 1, test_started_at = ?, test_status = 'in_progress', current_screen = 'listening'
       WHERE session_id = ? AND has_entered_startscreen = 1`,
      [startedAt, session_id]
    );

    res.json({
      message: "Test started for all entered participants",
      updated_count: result.affectedRows,
      test_started_at: startedAt.toISOString(),
      test_end_at: endAt.toISOString(),
      total_minutes: totalMinutes,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/center/sessions/:id/pause-all
router.patch("/sessions/:id/pause-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const pausedAt = new Date();
    const [result] = await db.execute(
      "UPDATE test_participants SET test_status = 'paused', paused_at = ? WHERE session_id = ? AND test_status = 'in_progress'",
      [pausedAt, session_id]
    );

    // Also set session paused_at
    await db.execute(
      "UPDATE test_sessions SET test_paused_at = ? WHERE id = ? AND center_id = ?",
      [pausedAt, session_id, req.center.id]
    );

    res.json({ message: "All tests paused", paused_count: result.affectedRows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/center/sessions/:id/restart-all
router.patch("/sessions/:id/restart-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const [pausedParticipants] = await db.execute(
      "SELECT id, paused_at, total_pause_duration FROM test_participants WHERE session_id = ? AND test_status = 'paused'",
      [session_id]
    );

    for (const participant of pausedParticipants) {
      const pauseDuration = Math.round((new Date() - new Date(participant.paused_at)) / 1000 / 60);
      const newTotal = (participant.total_pause_duration || 0) + pauseDuration;
      await db.execute(
        "UPDATE test_participants SET test_status = 'in_progress', paused_at = NULL, total_pause_duration = ? WHERE id = ?",
        [newTotal, participant.id]
      );
    }

    // Clear session paused_at
    await db.execute(
      "UPDATE test_sessions SET test_paused_at = NULL WHERE id = ? AND center_id = ?",
      [session_id, req.center.id]
    );

    res.json({ message: "All tests restarted", restarted_count: pausedParticipants.length });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/center/sessions/:id/end-all
router.patch("/sessions/:id/end-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const completedAt = new Date();
    const [result] = await db.execute(
      "UPDATE test_participants SET test_status = 'completed', test_completed_at = ?, current_screen = 'results' WHERE session_id = ? AND test_status IN ('in_progress', 'paused')",
      [completedAt, session_id]
    );

    res.json({ message: "All tests ended", ended_count: result.affectedRows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/center/sessions/:id/participants/:pid/pause
router.patch("/sessions/:id/participants/:pid/pause", async (req, res) => {
  const { id: session_id, pid: participant_id } = req.params;

  try {
    const [participantRows] = await db.execute(
      "SELECT id, test_status FROM test_participants WHERE id = ? AND session_id = ?",
      [participant_id, session_id]
    );

    if (participantRows.length === 0) return res.status(404).json({ error: "Participant not found" });
    if (participantRows[0].test_status === "paused") return res.status(400).json({ error: "Already paused" });

    const pausedAt = new Date();
    await db.execute(
      "UPDATE test_participants SET test_status = 'paused', paused_at = ? WHERE id = ?",
      [pausedAt, participant_id]
    );

    res.json({ message: "Test paused", participant_id, paused_at: pausedAt });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/center/sessions/:id/participants/:pid/restart
router.patch("/sessions/:id/participants/:pid/restart", async (req, res) => {
  const { id: session_id, pid: participant_id } = req.params;

  try {
    const [participantRows] = await db.execute(
      "SELECT id, paused_at, total_pause_duration FROM test_participants WHERE id = ? AND session_id = ?",
      [participant_id, session_id]
    );

    if (participantRows.length === 0) return res.status(404).json({ error: "Participant not found" });
    if (!participantRows[0].paused_at) return res.status(400).json({ error: "Not paused" });

    const pauseDuration = Math.round((new Date() - new Date(participantRows[0].paused_at)) / 1000 / 60);
    const newTotal = (participantRows[0].total_pause_duration || 0) + pauseDuration;

    await db.execute(
      "UPDATE test_participants SET test_status = 'in_progress', paused_at = NULL, total_pause_duration = ? WHERE id = ?",
      [newTotal, participant_id]
    );

    res.json({ message: "Test restarted", participant_id });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/center/sessions/:id/participants/:pid/end
router.patch("/sessions/:id/participants/:pid/end", async (req, res) => {
  const { id: session_id, pid: participant_id } = req.params;

  try {
    const [participantRows] = await db.execute(
      "SELECT id FROM test_participants WHERE id = ? AND session_id = ?",
      [participant_id, session_id]
    );

    if (participantRows.length === 0) return res.status(404).json({ error: "Participant not found" });

    const completedAt = new Date();
    await db.execute(
      "UPDATE test_participants SET test_status = 'completed', test_completed_at = ?, current_screen = 'results' WHERE id = ?",
      [completedAt, participant_id]
    );

    res.json({ message: "Test ended", participant_id });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/center/participants/:id/scores - Set writing/speaking scores
router.put("/participants/:id/scores", async (req, res) => {
  const { id } = req.params;
  const { writing_score, speaking_score } = req.body;

  if (writing_score == null || speaking_score == null) {
    return res.status(400).json({ error: "writing_score and speaking_score required" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE test_participants SET writing_score = ?, speaking_score = ? WHERE id = ?",
      [writing_score, speaking_score, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Participant not found" });

    res.json({ message: "Scores updated", writing_score, speaking_score });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/center/sessions/:id/save-and-end - Save results and end session
router.post("/sessions/:id/save-and-end", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const [sessionData] = await db.execute(
      "SELECT id, test_id, status FROM test_sessions WHERE id = ? AND center_id = ?",
      [session_id, req.center.id]
    );

    if (sessionData.length === 0) return res.status(404).json({ error: "Session not found" });

    const session = sessionData[0];

    const [participants] = await db.execute(
      `SELECT tp.id, tp.full_name, tp.phone_number,
              tp.listening_score, tp.reading_score, tp.writing_score, tp.speaking_score, tp.test_status
       FROM test_participants tp
       WHERE tp.session_id = ? AND tp.test_status = 'completed'`,
      [session_id]
    );

    if (participants.length === 0) {
      return res.status(400).json({ error: "No completed tests to save" });
    }

    const incomplete = participants.filter(
      (p) => p.listening_score == null || p.reading_score == null || p.writing_score == null || p.speaking_score == null
    );

    if (incomplete.length > 0) {
      return res.status(400).json({
        error: `Missing scores for: ${incomplete.map((p) => p.full_name).join(", ")}`,
      });
    }

    let savedCount = 0;
    const errors = [];

    for (const participant of participants) {
      try {
        const [userRows] = await db.execute(
          "SELECT id FROM users WHERE phone_number = ?",
          [participant.phone_number]
        );

        if (userRows.length === 0) {
          errors.push(`User with phone ${participant.phone_number} not found`);
          continue;
        }

        const user_id = userRows[0].id;
        const listeningBand = calculateBandScore(participant.listening_score, "listening");
        const readingBand = calculateBandScore(participant.reading_score, "reading");

        const [existing] = await db.execute(
          "SELECT id FROM results WHERE student_id = ? AND test_id = ?",
          [user_id, session.test_id]
        );

        if (existing.length > 0) {
          await db.execute(
            `UPDATE results SET listening_score = ?, reading_score = ?, writing_score = ?, speaking_score = ?,
             is_writing_scored = 1, is_speaking_scored = 1, updated_at = NOW()
             WHERE student_id = ? AND test_id = ?`,
            [listeningBand, readingBand, participant.writing_score, participant.speaking_score, user_id, session.test_id]
          );
        } else {
          await db.execute(
            `INSERT INTO results (student_id, test_id, listening_score, reading_score, writing_score, speaking_score,
             is_writing_scored, is_speaking_scored, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
            [user_id, session.test_id, listeningBand, readingBand, participant.writing_score, participant.speaking_score]
          );
        }
        savedCount++;
      } catch (err) {
        errors.push(`Error saving ${participant.full_name}: ${err.message}`);
      }
    }

    await db.execute(
      "UPDATE test_sessions SET status = 'completed', updated_at = NOW() WHERE id = ?",
      [session_id]
    );

    res.json({
      message: "Session saved and ended",
      saved_count: savedCount,
      total_participants: participants.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/center/participants/:id/answers - Get participant answers
router.get("/participants/:id/answers", async (req, res) => {
  const { id } = req.params;

  try {
    const [answers] = await db.execute(
      `SELECT question_number, section_type, user_answer, correct_answer, is_correct
       FROM participant_answers WHERE participant_id = ?
       ORDER BY section_type, question_number ASC`,
      [id]
    );

    res.json({ answers });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== RESULTS / STATISTICS ====================

// GET /api/center/results - Get all results for center students
router.get("/results", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.*, t.name as test_name, u.full_name, u.phone_number
       FROM results r
       JOIN tests t ON r.test_id = t.id
       JOIN users u ON r.student_id = u.id
       WHERE r.student_id IN (SELECT student_id FROM center_students WHERE center_id = ?)
       ORDER BY r.created_at DESC`,
      [req.center.id]
    );

    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/center/writing-submissions/:sessionId
router.get("/writing-submissions/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Verify session belongs to center
    const [sessionCheck] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ? AND center_id = ?",
      [sessionId, req.center.id]
    );

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const [rows] = await db.execute(
      `SELECT 
        ws.id,
        ws.participant_id,
        ws.participant_id_code,
        ws.full_name,
        ws.phone_number,
        ws.task_1_content,
        ws.task_2_content,
        ws.task_1_word_count,
        ws.task_2_word_count,
        ws.writing_score,
        ws.admin_notes,
        ws.is_reviewed,
        ws.reviewed_by,
        ws.reviewed_at,
        ws.submitted_at
       FROM writing_submissions ws
       WHERE ws.session_id = ?
       ORDER BY ws.submitted_at DESC`,
      [sessionId]
    );

    res.json({ session_id: sessionId, total_submissions: rows.length, submissions: rows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
