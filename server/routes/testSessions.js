const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const {
  processWritingScore,
  calculateListeningScore,
  calculateReadingScore,
} = require("../utils/scoreCalculator");

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
 * Verifies the ID belongs to the user logged in on this device
 */
router.post("/check-in-participant", async (req, res) => {
  const { participant_id_code, full_name } = req.body;

  if (!participant_id_code) {
    return res.status(400).json({ error: "Participant ID code is required" });
  }

  try {
    // Find participant by ID code
    const [participantRows] = await db.execute(
      `SELECT tp.id, tp.session_id, tp.participant_id_code, tp.full_name, tp.listening_score, tp.reading_score, tp.writing_score, tp.speaking_score, tp.participant_status, ts.test_id, t.name as test_name, ts.admin_notes
       FROM test_participants tp
       JOIN test_sessions ts ON tp.session_id = ts.id
       JOIN tests t ON ts.test_id = t.id
       WHERE tp.participant_id_code = ?`,
      [participant_id_code]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({
        error:
          "This participant ID code does not exist. Please check and try again.",
      });
    }

    const participant = participantRows[0];

    // Check if participant code has already been used (expired)
    if (participant.participant_status === "expired") {
      return res.status(403).json({
        error:
          "This participant ID code has already been used and is no longer valid. Each ID code can only be used once.",
      });
    }

    // Verify that the participant's name matches the logged-in user's name
    // Both must match exactly (after trimming whitespace and converting to lowercase)
    const registeredName = (participant.full_name || "").trim().toLowerCase();
    const providedName = (full_name || "").trim().toLowerCase();

    if (registeredName !== providedName) {
      return res.status(403).json({
        error:
          "This ID code is not registered to your account. You are not authorized to use this ID.",
      });
    }

    // Update check-in status and mark as in_progress
    await db.execute(
      "UPDATE test_participants SET has_entered_startscreen = 1, entered_at = NOW(), participant_status = 'in_progress', status_updated_at = NOW() WHERE id = ?",
      [participant.id]
    );

    // Extract test_materials_id from admin_notes if available
    let test_materials_id = 2; // Default to mock 2
    if (participant.admin_notes) {
      const mockIdMatch = participant.admin_notes.match(/\[MOCK_ID:(\d+)\]/);
      if (mockIdMatch) {
        test_materials_id = parseInt(mockIdMatch[1]);
      }
    }

    res.json({
      message: "Check-in successful",
      participant: {
        id: participant.id,
        participant_id_code: participant.participant_id_code,
        full_name: participant.full_name,
        session_id: participant.session_id,
        test_id: participant.test_id,
        test_name: participant.test_name,
        test_materials_id: test_materials_id,
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
 * Verifies the ID belongs to the user logged in on this device
 */
router.get("/participant/:id_code/can-start", async (req, res) => {
  const { id_code } = req.params;
  const { full_name } = req.query;

  try {
    const [participantRows] = await db.execute(
      `SELECT tp.id, tp.test_started, tp.full_name, tp.listening_score, tp.reading_score, tp.writing_score, tp.speaking_score, tp.session_id
       FROM test_participants tp
       WHERE tp.participant_id_code = ?`,
      [id_code]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];

    // Verify that the participant's name matches the user's name from localStorage
    // Both must match exactly (after trimming whitespace and converting to lowercase)
    const registeredName = (participant.full_name || "").trim().toLowerCase();
    const providedName = (full_name || "").trim().toLowerCase();

    if (registeredName !== providedName) {
      return res.status(403).json({
        error: "You are not authorized to access this test.",
      });
    }

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

/**
 * POST /api/test-sessions/submit-listening
 * Submit listening answers and save calculated score to database
 * Body: { participant_id, full_name, listening_answers: { 1: "answer1", 2: "answer2", ... } }
 */
router.post("/submit-listening", async (req, res) => {
  const { participant_id, full_name, listening_answers } = req.body;

  if (!participant_id || !full_name || !listening_answers) {
    return res.status(400).json({
      error:
        "Missing required fields: participant_id, full_name, listening_answers",
    });
  }

  try {
    // Verify participant exists and get test_id and admin_notes for test_materials_id
    const [participantRows] = await db.execute(
      "SELECT tp.id, tp.full_name, ts.test_id, ts.admin_notes FROM test_participants tp JOIN test_sessions ts ON tp.session_id = ts.id WHERE tp.id = ?",
      [participant_id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];
    const testId = participant.test_id || 2; // Default to test 2 if not found

    // Extract test_materials_id from admin_notes if available
    let testMaterialsId = 2; // Default to mock 2
    if (participant.admin_notes) {
      const mockIdMatch = participant.admin_notes.match(/\[MOCK_ID:(\d+)\]/);
      if (mockIdMatch) {
        testMaterialsId = parseInt(mockIdMatch[1]);
      }
    }

    // Verify name matches
    const registeredName = (participant.full_name || "").trim().toLowerCase();
    const providedName = (full_name || "").trim().toLowerCase();

    if (registeredName !== providedName) {
      return res.status(403).json({
        error: "Name does not match registered participant",
      });
    }

    // Calculate listening score using the correct test materials' answer key
    const { rawScore: listeningRawScore, bandScore: listeningBandScore } =
      await calculateListeningScore(listening_answers, testMaterialsId);

    // Load the answer key to get correct answers for each question
    const answersKey = await require("../utils/scoreCalculator").loadAnswersKey(
      testMaterialsId
    );
    const correctAnswers = answersKey.answers.listening;

    // Get session_id and participant_id_code
    const [sessionData] = await db.execute(
      "SELECT session_id, participant_id_code FROM test_participants WHERE id = ?",
      [participant_id]
    );
    const sessionId = sessionData[0].session_id;
    const participantIdCode = sessionData[0].participant_id_code;

    // Save listening answers to database with correctness check
    const { normalizeAnswer } = require("../utils/scoreCalculator");
    for (const question of correctAnswers) {
      const userAnswer = listening_answers[question.question] || "";
      const isCorrect =
        normalizeAnswer(userAnswer) === normalizeAnswer(question.answer);

      try {
        await db.execute(
          `INSERT INTO participant_answers 
           (session_id, participant_id, participant_id_code, full_name, section_type, question_number, user_answer, correct_answer, is_correct, submitted_at)
           VALUES (?, ?, ?, ?, 'listening', ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
           user_answer = ?, correct_answer = ?, is_correct = ?, submitted_at = NOW()`,
          [
            sessionId,
            participant_id,
            participantIdCode,
            full_name,
            question.question,
            userAnswer,
            question.answer,
            isCorrect ? 1 : 0,
            userAnswer,
            question.answer,
            isCorrect ? 1 : 0,
          ]
        );
      } catch (err) {
        console.error("Error saving answer:", err);
        // Continue saving other answers even if one fails
      }
    }

    // Save raw listening score to database (for admin dashboard display)
    await db.execute(
      `UPDATE test_participants 
       SET listening_score = ?, 
           updated_at = NOW()
       WHERE id = ?`,
      [listeningRawScore, participant.id]
    );

    res.json({
      message: "Listening test submitted successfully",
      participant_id: participant.id,
      listening_raw_score: listeningRawScore,
      listening_band_score: listeningBandScore,
      total_questions: 40,
      test_materials_id: testMaterialsId,
    });
  } catch (err) {
    console.error("Error submitting listening answers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/test-sessions/submit-reading
 * Submit reading answers and save calculated score to database
 * Body: { participant_id, full_name, reading_answers: { 1: "answer1", 2: "answer2", ... } }
 */
router.post("/submit-reading", async (req, res) => {
  const { participant_id, full_name, reading_answers } = req.body;

  if (!participant_id || !full_name || !reading_answers) {
    return res.status(400).json({
      error:
        "Missing required fields: participant_id, full_name, reading_answers",
    });
  }

  try {
    // Verify participant exists and get test_id and admin_notes for test_materials_id
    const [participantRows] = await db.execute(
      "SELECT tp.id, tp.full_name, ts.test_id, ts.admin_notes FROM test_participants tp JOIN test_sessions ts ON tp.session_id = ts.id WHERE tp.id = ?",
      [participant_id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];
    const testId = participant.test_id || 2; // Default to test 2 if not found

    // Extract test_materials_id from admin_notes if available
    let testMaterialsId = 2; // Default to mock 2
    if (participant.admin_notes) {
      const mockIdMatch = participant.admin_notes.match(/\[MOCK_ID:(\d+)\]/);
      if (mockIdMatch) {
        testMaterialsId = parseInt(mockIdMatch[1]);
      }
    }

    // Verify name matches
    const registeredName = (participant.full_name || "").trim().toLowerCase();
    const providedName = (full_name || "").trim().toLowerCase();

    if (registeredName !== providedName) {
      return res.status(403).json({
        error: "Name does not match registered participant",
      });
    }

    // Calculate reading score using the correct test materials' answer key
    const { rawScore: readingRawScore, bandScore: readingBandScore } =
      await calculateReadingScore(reading_answers, testMaterialsId);

    // Load the answer key to get correct answers for each question
    const answersKey = await require("../utils/scoreCalculator").loadAnswersKey(
      testMaterialsId
    );
    const correctAnswers = answersKey.answers.reading;

    // Get session_id and participant_id_code
    const [sessionData] = await db.execute(
      "SELECT session_id, participant_id_code FROM test_participants WHERE id = ?",
      [participant_id]
    );
    const sessionId = sessionData[0].session_id;
    const participantIdCode = sessionData[0].participant_id_code;

    // Save reading answers to database with correctness check
    const { normalizeAnswer } = require("../utils/scoreCalculator");
    for (const question of correctAnswers) {
      const userAnswer = reading_answers[question.question] || "";
      const isCorrect =
        normalizeAnswer(userAnswer) === normalizeAnswer(question.answer);

      try {
        await db.execute(
          `INSERT INTO participant_answers 
           (session_id, participant_id, participant_id_code, full_name, section_type, question_number, user_answer, correct_answer, is_correct, submitted_at)
           VALUES (?, ?, ?, ?, 'reading', ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
           user_answer = ?, correct_answer = ?, is_correct = ?, submitted_at = NOW()`,
          [
            sessionId,
            participant_id,
            participantIdCode,
            full_name,
            question.question,
            userAnswer,
            question.answer,
            isCorrect ? 1 : 0,
            userAnswer,
            question.answer,
            isCorrect ? 1 : 0,
          ]
        );
      } catch (err) {
        console.error("Error saving answer:", err);
        // Continue saving other answers even if one fails
      }
    }

    // Save raw reading score to database (for admin dashboard display)
    await db.execute(
      `UPDATE test_participants 
       SET reading_score = ?, 
           updated_at = NOW()
       WHERE id = ?`,
      [readingRawScore, participant.id]
    );

    res.json({
      message: "Reading test submitted successfully",
      participant_id: participant.id,
      reading_raw_score: readingRawScore,
      reading_band_score: readingBandScore,
      total_questions: 40,
      test_materials_id: testMaterialsId,
    });
  } catch (err) {
    console.error("Error submitting reading answers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/test-sessions/submit-writing
 * Submit writing answers and save essay content + calculated scores to database
 * Body: {
 *   participant_id,
 *   participant_id_code,
 *   session_id,
 *   full_name,
 *   phone_number,
 *   writing_answers: { 1: "essay1 text", 2: "essay2 text" },
 *   task_1_word_count,
 *   task_2_word_count
 * }
 */
router.post("/submit-writing", async (req, res) => {
  const {
    participant_id,
    participant_id_code,
    session_id,
    full_name,
    phone_number,
    writing_answers,
    task_1_word_count,
    task_2_word_count,
  } = req.body;

  if (!participant_id || !full_name || !writing_answers) {
    return res.status(400).json({
      error:
        "Missing required fields: participant_id, full_name, writing_answers",
    });
  }

  try {
    // Find participant to verify identity
    const [participantRows] = await db.execute(
      `SELECT tp.id, tp.session_id, tp.participant_id_code, tp.full_name, tp.phone_number
       FROM test_participants tp
       WHERE tp.id = ?`,
      [participant_id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];
    const actualSessionId = session_id || participant.session_id;

    // Verify name matches
    const registeredName = (participant.full_name || "").trim().toLowerCase();
    const providedName = (full_name || "").trim().toLowerCase();

    if (registeredName !== providedName) {
      return res.status(403).json({
        error: "Name does not match registered participant",
      });
    }

    // Calculate writing score
    const scoreData = processWritingScore(writing_answers);

    // Save writing submission to database
    await db.execute(
      `INSERT INTO writing_submissions 
       (session_id, participant_id, participant_id_code, full_name, phone_number, 
        task_1_content, task_2_content, task_1_word_count, task_2_word_count, writing_score, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        actualSessionId,
        participant.id,
        participant.participant_id_code || participant_id_code,
        participant.full_name,
        participant.phone_number || phone_number,
        writing_answers[1] || "",
        writing_answers[2] || "",
        task_1_word_count || 0,
        task_2_word_count || 0,
        0, // 0 = pending admin review
      ]
    );

    // Update test_participants with writing score status (0 = pending review)
    // Also mark participant_status as 'expired' since all tests are now complete
    await db.execute(
      `UPDATE test_participants 
       SET writing_score = 0,
           participant_status = 'expired',
           status_updated_at = NOW(),
           test_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [participant.id]
    );

    res.json({
      message: "Writing test submitted successfully",
      participant_id: participant.id,
      session_id: actualSessionId,
      writing_submission: {
        task_1_words: task_1_word_count || 0,
        task_1_meets_minimum: (task_1_word_count || 0) >= 150,
        task_2_words: task_2_word_count || 0,
        task_2_meets_minimum: (task_2_word_count || 0) >= 250,
        status: "pending_admin_review",
      },
    });
  } catch (err) {
    console.error("Error submitting writing answers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/test-sessions/:session_id/writing-submissions
 * Get all writing submissions for a session with participant details
 * Admin endpoint to view and review all submitted writing essays
 */
router.get("/:session_id/writing-submissions", async (req, res) => {
  const { session_id } = req.params;

  try {
    const [submissions] = await db.execute(
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
        ws.submitted_at,
        u.full_name as reviewed_by_name
       FROM writing_submissions ws
       LEFT JOIN users u ON ws.reviewed_by = u.id
       WHERE ws.session_id = ?
       ORDER BY ws.submitted_at DESC`,
      [session_id]
    );

    res.json({
      session_id,
      total_submissions: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error("Error fetching writing submissions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/test-sessions/:session_id/writing-submissions/:submission_id/review
 * Admin endpoint: Update writing submission with score and admin notes
 */
router.post(
  "/:session_id/writing-submissions/:submission_id/review",
  authMiddleware,
  async (req, res) => {
    const { session_id, submission_id } = req.params;
    const { writing_score, admin_notes } = req.body;

    // Check if user is admin
    const [userRows] = await db.execute("SELECT role FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (userRows.length === 0 || userRows[0].role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can review submissions" });
    }

    if (writing_score === undefined || writing_score === "") {
      return res.status(400).json({ error: "Writing score is required" });
    }

    try {
      // Update writing submission
      await db.execute(
        `UPDATE writing_submissions
       SET writing_score = ?, 
           admin_notes = ?,
           is_reviewed = 1,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ? AND session_id = ?`,
        [
          writing_score,
          admin_notes || null,
          req.user.id,
          submission_id,
          session_id,
        ]
      );

      // Get participant ID and update their score in test_participants
      const [submissionRows] = await db.execute(
        `SELECT participant_id FROM writing_submissions WHERE id = ?`,
        [submission_id]
      );

      if (submissionRows.length > 0) {
        await db.execute(
          `UPDATE test_participants
         SET writing_score = ?
         WHERE id = ?`,
          [writing_score, submissionRows[0].participant_id]
        );
      }

      res.json({
        message: "Writing submission reviewed successfully",
        submission_id,
        writing_score,
      });
    } catch (err) {
      console.error("Error reviewing writing submission:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /api/test-sessions/participant/:id/scores
 * Get calculated/final scores for a participant
 * Returns listening, reading, writing, speaking scores
 */
router.get("/participant/:id/scores", async (req, res) => {
  const { id } = req.params;

  try {
    const [participantRows] = await db.execute(
      `SELECT 
        id,
        listening_score,
        reading_score,
        writing_score,
        speaking_score
       FROM test_participants
       WHERE id = ?`,
      [id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participant = participantRows[0];

    res.json({
      participant_id: participant.id,
      scores: {
        listening_score: participant.listening_score,
        reading_score: participant.reading_score,
        writing_score: participant.writing_score,
        speaking_score: participant.speaking_score,
      },
    });
  } catch (err) {
    console.error("Error fetching participant scores:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
