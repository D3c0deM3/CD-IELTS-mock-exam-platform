const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { calculateBandScore } = require("../utils/scoreCalculator");

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

// ==================== COURSE CENTER MANAGEMENT ====================

// GET /api/admin/centers - List all course centers
router.get("/centers", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT cc.id, cc.user_id, cc.center_name, cc.max_session_users, cc.created_at,
              u.full_name, u.phone_number, u.status,
              (SELECT COUNT(*) FROM center_students cs WHERE cs.center_id = cc.id) AS student_count,
              (SELECT COUNT(*) FROM test_sessions ts WHERE ts.center_id = cc.id) AS session_count
       FROM course_centers cc
       JOIN users u ON cc.user_id = u.id
       ORDER BY cc.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/centers - Create a new course center account
router.post("/centers", async (req, res) => {
  const { full_name, phone_number, password, center_name, max_session_users } = req.body;

  if (!full_name || !phone_number || !password || !center_name) {
    return res.status(400).json({ error: "full_name, phone_number, password, and center_name are required" });
  }

  try {
    // Check if phone number already exists
    const [existing] = await db.execute(
      "SELECT id, role FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (existing.length > 0) {
      // If user exists but isn't a center, offer to promote
      if (existing[0].role !== "center") {
        return res.status(409).json({
          error: `A user with this phone number already exists (role: ${existing[0].role}). Use the promote option instead.`,
          existing_user_id: existing[0].id,
        });
      }
      return res.status(409).json({ error: "A center account with this phone number already exists." });
    }

    const bcrypt = require("bcrypt");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [userResult] = await db.execute(
      "INSERT INTO users (full_name, phone_number, password, role) VALUES (?, ?, ?, 'center')",
      [full_name, phone_number, hashedPassword]
    );

    const userId = userResult.insertId;

    await db.execute(
      "INSERT INTO course_centers (user_id, center_name, max_session_users) VALUES (?, ?, ?)",
      [userId, center_name, max_session_users || 30]
    );

    res.status(201).json({
      message: "Course center created successfully",
      userId,
      center_name,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/centers/promote - Promote an existing student to center role
router.post("/centers/promote", async (req, res) => {
  const { user_id, center_name, max_session_users } = req.body;

  if (!user_id || !center_name) {
    return res.status(400).json({ error: "user_id and center_name are required" });
  }

  try {
    const [rows] = await db.execute("SELECT id, role, full_name FROM users WHERE id = ?", [user_id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    if (rows[0].role === "center") {
      return res.status(409).json({ error: "User is already a center admin" });
    }
    if (rows[0].role === "admin") {
      return res.status(400).json({ error: "Cannot demote an admin to center role" });
    }

    await db.execute("UPDATE users SET role = 'center' WHERE id = ?", [user_id]);

    // Create course_centers record if not exists
    const [existingCenter] = await db.execute(
      "SELECT id FROM course_centers WHERE user_id = ?",
      [user_id]
    );
    if (existingCenter.length === 0) {
      await db.execute(
        "INSERT INTO course_centers (user_id, center_name, max_session_users) VALUES (?, ?, ?)",
        [user_id, center_name, max_session_users || 30]
      );
    }

    res.json({ message: `User "${rows[0].full_name}" promoted to center admin`, user_id });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/centers/:id - Update center settings
router.patch("/centers/:id", async (req, res) => {
  const { id } = req.params;
  const { center_name, max_session_users } = req.body;

  try {
    const updates = [];
    const params = [];

    if (center_name !== undefined) {
      updates.push("center_name = ?");
      params.push(center_name);
    }
    if (max_session_users !== undefined) {
      updates.push("max_session_users = ?");
      params.push(max_session_users);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    params.push(id);
    await db.execute(`UPDATE course_centers SET ${updates.join(", ")} WHERE id = ?`, params);

    res.json({ message: "Center updated successfully" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/centers/:id - Delete a center (reverts user to student role)
router.delete("/centers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [center] = await db.execute("SELECT user_id FROM course_centers WHERE id = ?", [id]);
    if (center.length === 0) return res.status(404).json({ error: "Center not found" });

    const userId = center[0].user_id;

    // Remove center students association
    await db.execute("DELETE FROM center_students WHERE center_id = ?", [id]);
    // Remove course center record
    await db.execute("DELETE FROM course_centers WHERE id = ?", [id]);
    // Revert user to student
    await db.execute("UPDATE users SET role = 'student' WHERE id = ?", [userId]);

    res.json({ message: "Center deleted and user reverted to student role" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST MANAGEMENT ====================

// GET /api/admin/test-materials - Get available test materials (mocks)
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

    const fs = require("fs");
    const path = require("path");

    // Fallback to file-based materials if DB has none
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

        materials.push({
          mock_id: mockId,
          name: mockName,
          file: file,
        });
      }
    });

    materials.sort((a, b) => a.mock_id - b.mock_id);

    res.json({
      materials:
        materials.length > 0
          ? materials
          : [
              {
                mock_id: 2,
                name: "Mock 2 - Authentic Test 1",
                file: "answers.json",
              },
            ],
    });
  } catch (err) {
    console.error("Error getting test materials:", err);
    res.json({
      materials: [
        { mock_id: 2, name: "Mock 2 - Authentic Test 1", file: "answers.json" },
        {
          mock_id: 3,
          name: "Mock 3 - Authentic Test 2",
          file: "answers_3.json",
        },
      ],
    });
  }
});

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

// ==================== TEST CONFIG MANAGEMENT ====================

// POST /api/admin/tests/:id/config - Set test section durations
router.post("/tests/:id/config", async (req, res) => {
  const { id: test_id } = req.params;
  const {
    listening_minutes,
    reading_minutes,
    writing_minutes,
    speaking_minutes,
  } = req.body;

  // Validate inputs
  const listening = listening_minutes || 40;
  const reading = reading_minutes || 60;
  const writing = writing_minutes || 60;
  const speaking = speaking_minutes || 15;

  if (listening < 0 || reading < 0 || writing < 0 || speaking < 0) {
    return res.status(400).json({ error: "All durations must be positive" });
  }

  try {
    // Check if test exists
    const [testRows] = await db.execute("SELECT id FROM tests WHERE id = ?", [
      test_id,
    ]);
    if (testRows.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Insert or update config
    await db.execute(
      `INSERT INTO test_config (test_id, listening_minutes, reading_minutes, writing_minutes, speaking_minutes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       listening_minutes = VALUES(listening_minutes),
       reading_minutes = VALUES(reading_minutes),
       writing_minutes = VALUES(writing_minutes),
       speaking_minutes = VALUES(speaking_minutes),
       updated_at = NOW()`,
      [test_id, listening, reading, writing, speaking]
    );

    res.json({
      message: "Test configuration updated successfully",
      config: {
        test_id,
        listening_minutes: listening,
        reading_minutes: reading,
        writing_minutes: writing,
        speaking_minutes: speaking,
        total_minutes: listening + reading + writing + 60,
      },
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/tests/:id/config - Get test configuration
router.get("/tests/:id/config", async (req, res) => {
  const { id: test_id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT test_id, listening_minutes, reading_minutes, writing_minutes, speaking_minutes, total_minutes
       FROM test_config WHERE test_id = ?`,
      [test_id]
    );

    if (rows.length === 0) {
      return res.json({
        test_id,
        listening_minutes: 40,
        reading_minutes: 60,
        writing_minutes: 60,
        speaking_minutes: 15,
        total_minutes: 235,
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST SESSION MANAGEMENT ====================

// POST /api/admin/sessions - Create a test session
router.post("/sessions", async (req, res) => {
  const {
    test_id,
    session_date,
    location,
    max_capacity,
    admin_notes,
    test_materials_id,
  } = req.body;

  if (!test_id || !session_date || !location) {
    return res
      .status(400)
      .json({ error: "test_id, session_date, and location are required" });
  }

  try {
    // Combine admin_notes with test_materials_id
    const notesWithMaterials = admin_notes
      ? `[MOCK_ID:${test_materials_id || 2}] ${admin_notes}`
      : `[MOCK_ID:${test_materials_id || 2}]`;

    const [result] = await db.execute(
      "INSERT INTO test_sessions (test_id, session_date, location, max_capacity, admin_notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [
        test_id,
        session_date,
        location,
        max_capacity || null,
        notesWithMaterials,
        req.user.id,
      ]
    );

    res.status(201).json({
      message: "Test session created successfully",
      sessionId: result.insertId,
      test_materials_id: test_materials_id || 2,
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

// DELETE /api/admin/sessions/:id - Delete a test session and all related data
router.delete("/sessions/:id", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Check if session exists
    const [sessionCheck] = await db.execute(
      "SELECT id FROM test_sessions WHERE id = ?",
      [session_id]
    );

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Delete all test_participants for this session
    await db.execute("DELETE FROM test_participants WHERE session_id = ?", [
      session_id,
    ]);

    // Delete the session itself
    await db.execute("DELETE FROM test_sessions WHERE id = ?", [session_id]);

    res.json({
      message: "Session and all related data deleted successfully",
      deleted_session_id: session_id,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== TEST PARTICIPANT MANAGEMENT ====================

// POST /api/admin/sessions/:id/register-participant - Register single participant for a session
router.post("/sessions/:id/register-participant", async (req, res) => {
  const { id: session_id } = req.params;
  const { full_name, phone_number } = req.body;

  if (!full_name || !phone_number) {
    return res
      .status(400)
      .json({ error: "full_name and phone_number are required" });
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

    // Verify phone number exists in users table
    const [userRows] = await db.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (userRows.length === 0) {
      return res
        .status(400)
        .json({ error: "Phone number not registered in system" });
    }

    // Check if participant with this phone already registered for this session
    const [existingParticipant] = await db.execute(
      "SELECT id FROM test_participants WHERE session_id = ? AND phone_number = ?",
      [session_id, phone_number]
    );

    if (existingParticipant.length > 0) {
      return res.status(400).json({
        error: "This participant is already registered for this session",
      });
    }

    // Generate unique participant ID code
    const [existingCount] = await db.execute(
      "SELECT COUNT(*) as count FROM test_participants WHERE session_id = ?",
      [session_id]
    );

    const nextNumber = (existingCount[0].count + 1).toString().padStart(3, "0");
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

// POST /api/admin/sessions/:id/register-participants - Register multiple participants for a session (bulk)
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
        reading_score,
        writing_score,
        speaking_score,
        has_entered_startscreen,
        entered_at,
        test_started,
        test_started_at,
        current_screen,
        test_status,
        last_activity_at,
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

// PUT /api/admin/participants/:id/scores - Set writing and speaking scores
router.put("/participants/:id/scores", async (req, res) => {
  const { id } = req.params;
  const { writing_score, speaking_score } = req.body;

  if (
    writing_score === undefined ||
    speaking_score === undefined ||
    writing_score === null ||
    speaking_score === null
  ) {
    return res
      .status(400)
      .json({ error: "writing_score and speaking_score are required" });
  }

  if (writing_score < 0 || writing_score > 9) {
    return res
      .status(400)
      .json({ error: "writing_score must be between 0 and 9" });
  }

  if (speaking_score < 0 || speaking_score > 9) {
    return res
      .status(400)
      .json({ error: "speaking_score must be between 0 and 9" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE test_participants SET writing_score = ?, speaking_score = ? WHERE id = ?",
      [writing_score, speaking_score, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    res.json({
      message: "Scores updated successfully",
      writing_score,
      speaking_score,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/pending-scores/:session_id - Get participants pending score review (writing/speaking)
router.get("/pending-scores/:session_id", async (req, res) => {
  const { session_id } = req.params;

  try {
    // Get all participants for this session that need writing/speaking scores
    const [participants] = await db.execute(
      `SELECT 
        tp.id,
        tp.participant_id_code,
        tp.full_name,
        tp.listening_score,
        tp.reading_score,
        tp.writing_score,
        tp.speaking_score,
        tp.is_writing_scored,
        tp.is_speaking_scored,
        tp.test_status,
        tp.test_completed_at
       FROM test_participants tp
       WHERE tp.session_id = ? AND tp.test_status = 'completed'
       ORDER BY tp.full_name ASC`,
      [session_id]
    );

    // Separate into categories
    const pendingWriting = participants.filter(
      (p) => p.listening_score && p.reading_score && !p.is_writing_scored
    );
    const pendingSpeaking = participants.filter(
      (p) => p.listening_score && p.reading_score && !p.is_speaking_scored
    );
    const allScored = participants.filter(
      (p) => p.is_writing_scored && p.is_speaking_scored
    );

    res.json({
      session_id,
      summary: {
        total_participants: participants.length,
        completed_tests: participants.length,
        pending_writing_review: pendingWriting.length,
        pending_speaking_review: pendingSpeaking.length,
        all_scored: allScored.length,
      },
      pending_writing: pendingWriting,
      pending_speaking: pendingSpeaking,
      completed: allScored,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/start-all - Start test for all entered participants with timer
router.patch("/sessions/:id/start-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Verify session exists and get test config
    const [sessionRows] = await db.execute(
      "SELECT ts.id, ts.test_id FROM test_sessions ts WHERE ts.id = ?",
      [session_id]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const test_id = sessionRows[0].test_id;

    // Get test config (with defaults if not configured)
    const [configRows] = await db.execute(
      "SELECT listening_minutes, reading_minutes, writing_minutes FROM test_config WHERE test_id = ?",
      [test_id]
    );

    let listening = 40,
      reading = 60,
      writing = 60;
    if (configRows.length > 0) {
      listening = configRows[0].listening_minutes;
      reading = configRows[0].reading_minutes;
      writing = configRows[0].writing_minutes;
    }

    // Calculate total test duration (in minutes)
    const totalMinutes = listening + reading + writing + 60; // +60 for 1 hour buffer

    // Set test_started_at and test_end_at
    const startedAt = new Date();
    const endAt = new Date(startedAt.getTime() + totalMinutes * 60 * 1000);

    // Update session
    await db.execute(
      "UPDATE test_sessions SET test_started_at = ?, test_end_at = ? WHERE id = ?",
      [startedAt, endAt, session_id]
    );

    // Update participants
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

// PATCH /api/admin/sessions/:id/participants/:pid/pause - Pause test for individual participant
router.patch("/sessions/:id/participants/:pid/pause", async (req, res) => {
  const { id: session_id, pid: participant_id } = req.params;

  try {
    // Verify participant exists and belongs to session
    const [participantRows] = await db.execute(
      "SELECT id, test_status FROM test_participants WHERE id = ? AND session_id = ?",
      [participant_id, session_id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    if (participantRows[0].test_status === "paused") {
      return res.status(400).json({ error: "Test is already paused" });
    }

    const pausedAt = new Date();
    await db.execute(
      "UPDATE test_participants SET test_status = 'paused', paused_at = ? WHERE id = ?",
      [pausedAt, participant_id]
    );

    res.json({
      message: "Test paused successfully",
      participant_id,
      paused_at: pausedAt,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/participants/:pid/restart - Restart paused test
router.patch("/sessions/:id/participants/:pid/restart", async (req, res) => {
  const { id: session_id, pid: participant_id } = req.params;

  try {
    // Verify participant exists
    const [participantRows] = await db.execute(
      "SELECT id, paused_at, total_pause_duration FROM test_participants WHERE id = ? AND session_id = ?",
      [participant_id, session_id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];
    if (!participant.paused_at) {
      return res.status(400).json({ error: "Test is not paused" });
    }

    // Calculate pause duration
    const pauseDuration = Math.round(
      (new Date() - participant.paused_at) / 1000 / 60
    ); // in minutes
    const newTotalPauseDuration =
      (participant.total_pause_duration || 0) + pauseDuration;

    await db.execute(
      "UPDATE test_participants SET test_status = 'in_progress', paused_at = NULL, total_pause_duration = ? WHERE id = ?",
      [newTotalPauseDuration, participant_id]
    );

    res.json({
      message: "Test restarted successfully",
      participant_id,
      pause_duration_added: pauseDuration,
      total_pause_duration: newTotalPauseDuration,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/participants/:pid/end - End test for participant
router.patch("/sessions/:id/participants/:pid/end", async (req, res) => {
  const { id: session_id, pid: participant_id } = req.params;

  try {
    // Verify participant exists
    const [participantRows] = await db.execute(
      "SELECT id FROM test_participants WHERE id = ? AND session_id = ?",
      [participant_id, session_id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const completedAt = new Date();
    await db.execute(
      "UPDATE test_participants SET test_status = 'completed', test_completed_at = ?, current_screen = 'results' WHERE id = ?",
      [completedAt, participant_id]
    );

    res.json({
      message: "Test ended successfully",
      participant_id,
      test_completed_at: completedAt,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/pause-all - Pause all active tests in session
router.patch("/sessions/:id/pause-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const pausedAt = new Date();
    const [result] = await db.execute(
      "UPDATE test_participants SET test_status = 'paused', paused_at = ? WHERE session_id = ? AND test_status = 'in_progress'",
      [pausedAt, session_id]
    );

    res.json({
      message: "All tests paused successfully",
      paused_count: result.affectedRows,
      paused_at: pausedAt,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/restart-all - Restart all paused tests in session
router.patch("/sessions/:id/restart-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Get all paused participants and calculate their pause duration
    const [pausedParticipants] = await db.execute(
      "SELECT id, paused_at, total_pause_duration FROM test_participants WHERE session_id = ? AND test_status = 'paused'",
      [session_id]
    );

    // Update each participant's pause duration
    for (const participant of pausedParticipants) {
      const pauseDuration = Math.round(
        (new Date() - participant.paused_at) / 1000 / 60
      );
      const newTotalPauseDuration =
        (participant.total_pause_duration || 0) + pauseDuration;

      await db.execute(
        "UPDATE test_participants SET test_status = 'in_progress', paused_at = NULL, total_pause_duration = ? WHERE id = ?",
        [newTotalPauseDuration, participant.id]
      );
    }

    res.json({
      message: "All tests restarted successfully",
      restarted_count: pausedParticipants.length,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/sessions/:id/end-all - End all active/paused tests in session
router.patch("/sessions/:id/end-all", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    const completedAt = new Date();
    const [result] = await db.execute(
      "UPDATE test_participants SET test_status = 'completed', test_completed_at = ?, current_screen = 'results' WHERE session_id = ? AND test_status IN ('in_progress', 'paused')",
      [completedAt, session_id]
    );

    res.json({
      message: "All tests ended successfully",
      ended_count: result.affectedRows,
      test_completed_at: completedAt,
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
    // Get session info with test config
    const [sessionData] = await db.execute(
      `SELECT 
        ts.id,
        ts.test_id,
        t.name as test_name,
        ts.session_date,
        ts.location,
        ts.status,
        ts.max_capacity,
        ts.test_started_at,
        ts.test_end_at
      FROM test_sessions ts
      JOIN tests t ON ts.test_id = t.id
      WHERE ts.id = ?`,
      [session_id]
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
        : {
            listening_minutes: 40,
            reading_minutes: 60,
            writing_minutes: 60,
          };

    // Get participants with their status
    const [participants] = await db.execute(
      `SELECT 
        id,
        participant_id_code,
        full_name,
        phone_number,
        has_entered_startscreen,
        entered_at,
        test_started,
        test_started_at,
        current_screen,
        test_status,
        last_activity_at,
        listening_score,
        reading_score,
        writing_score,
        speaking_score,
        tab_switch_count,
        focus_lost_count,
        test_completed_at
      FROM test_participants
      WHERE session_id = ?
      ORDER BY created_at ASC`,
      [session_id]
    );

    // Calculate dynamic stats
    const now = new Date();
    const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

    const stats = {
      total: participants.length,
      entered_startscreen: participants.filter((p) => p.has_entered_startscreen)
        .length,
      test_started: participants.filter(
        (p) => p.test_started && p.test_status !== "completed"
      ).length,
      test_completed: participants.filter((p) => p.test_status === "completed")
        .length,
      scores_pending: participants.filter(
        (p) =>
          p.test_completed &&
          (p.writing_score === null || p.speaking_score === null)
      ).length,
      currently_active: participants.filter((p) => {
        if (p.test_status !== "in_progress" && p.test_status !== "paused")
          return false;
        if (!p.last_activity_at) return false;
        const timeSinceActivity = now - new Date(p.last_activity_at);
        return timeSinceActivity < OFFLINE_THRESHOLD;
      }).length,
      offline_or_disconnected: participants.filter((p) => {
        if (p.test_status === "completed" || p.test_status === "not_started")
          return false;
        if (!p.last_activity_at) return true;
        const timeSinceActivity = now - new Date(p.last_activity_at);
        return timeSinceActivity >= OFFLINE_THRESHOLD;
      }).length,
      paused: participants.filter((p) => p.test_status === "paused").length,
      left_test: participants.filter((p) => p.test_status === "abandoned")
        .length,
      total_tab_switches: participants.reduce(
        (sum, p) => sum + (p.tab_switch_count || 0),
        0
      ),
      total_focus_lost: participants.reduce(
        (sum, p) => sum + (p.focus_lost_count || 0),
        0
      ),
    };

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

// POST /api/admin/sessions/:id/save-and-end - Save all participant results and end session
router.post("/sessions/:id/save-and-end", async (req, res) => {
  const { id: session_id } = req.params;

  try {
    // Get session info
    const [sessionData] = await db.execute(
      "SELECT id, test_id, status FROM test_sessions WHERE id = ?",
      [session_id]
    );

    if (sessionData.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionData[0];

    // Get all participants with all their scores (listening, reading, writing, speaking)
    const [participants] = await db.execute(
      `SELECT 
        tp.id,
        tp.full_name,
        tp.phone_number,
        tp.listening_score,
        tp.reading_score,
        tp.writing_score,
        tp.speaking_score,
        tp.test_status
      FROM test_participants tp
      WHERE tp.session_id = ? AND tp.test_status = 'completed'`,
      [session_id]
    );

    if (participants.length === 0) {
      return res.status(400).json({
        error:
          "No completed tests to save. Please ensure all participants have completed all test sections (listening, reading, writing, speaking) first.",
      });
    }

    // Check if all participants have all scores (listening, reading, writing, speaking)
    const incompleteParticipants = participants.filter(
      (p) =>
        p.listening_score === null ||
        p.reading_score === null ||
        p.writing_score === null ||
        p.speaking_score === null
    );

    if (incompleteParticipants.length > 0) {
      const incompleteNames = incompleteParticipants
        .map((p) => p.full_name)
        .join(", ");
      return res.status(400).json({
        error: `Cannot save session. The following participants are missing scores: ${incompleteNames}. Ensure all test sections (listening, reading, writing, speaking) are completed and scored.`,
      });
    }

    let savedCount = 0;
    const errors = [];

    // Save results for each participant with all four scores
    for (const participant of participants) {
      try {
        // Get user_id from phone number
        const [userRows] = await db.execute(
          "SELECT id FROM users WHERE phone_number = ?",
          [participant.phone_number]
        );

        if (userRows.length === 0) {
          errors.push(`User with phone ${participant.phone_number} not found`);
          continue;
        }

        const user_id = userRows[0].id;

        // Convert raw scores to band scores for listening and reading
        const listeningBandScore = calculateBandScore(
          participant.listening_score,
          "listening"
        );
        const readingBandScore = calculateBandScore(
          participant.reading_score,
          "reading"
        );

        // Check if result already exists for this user and test
        const [existingResult] = await db.execute(
          "SELECT id FROM results WHERE student_id = ? AND test_id = ?",
          [user_id, session.test_id]
        );

        if (existingResult.length > 0) {
          // Update existing result with all four scores (listening and reading as band scores)
          await db.execute(
            `UPDATE results 
             SET listening_score = ?, reading_score = ?, writing_score = ?, speaking_score = ?, 
                 is_writing_scored = 1, is_speaking_scored = 1,
                 updated_at = NOW()
             WHERE student_id = ? AND test_id = ?`,
            [
              listeningBandScore,
              readingBandScore,
              participant.writing_score,
              participant.speaking_score,
              user_id,
              session.test_id,
            ]
          );
        } else {
          // Create new result with all four scores (listening and reading as band scores)
          await db.execute(
            `INSERT INTO results 
             (student_id, test_id, listening_score, reading_score, writing_score, speaking_score, 
              is_writing_scored, is_speaking_scored, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
            [
              user_id,
              session.test_id,
              listeningBandScore,
              readingBandScore,
              participant.writing_score,
              participant.speaking_score,
            ]
          );
        }

        savedCount++;
      } catch (err) {
        errors.push(
          `Error saving result for ${participant.full_name}: ${err.message}`
        );
      }
    }

    // Update session status to completed
    await db.execute(
      "UPDATE test_sessions SET status = 'completed', updated_at = NOW() WHERE id = ?",
      [session_id]
    );

    res.json({
      message: "Session saved and ended successfully",
      saved_count: savedCount,
      total_participants: participants.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/participants/:id/answers - Get all answers for a participant
router.get("/participants/:id/answers", async (req, res) => {
  const { id } = req.params;

  try {
    const [answers] = await db.execute(
      `SELECT 
        question_number,
        section_type,
        user_answer,
        correct_answer,
        is_correct
       FROM participant_answers
       WHERE participant_id = ?
       ORDER BY section_type, question_number ASC`,
      [id]
    );

    res.json({ answers });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
