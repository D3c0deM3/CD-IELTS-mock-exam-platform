const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const { PythonShell } = require("python-shell");
// Store last conversion result for debugging
let lastConversionResult = null;

const ensureAdmin = async (req, res, next) => {
  try {
    const [user] = await db.execute("SELECT role FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (user.length === 0 || user[0].role !== "admin") {
      return res.status(403).json({ error: "Only admins can perform this action" });
    }

    return next();
  } catch (err) {
    console.error("Admin check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Configure multer for material uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/materials");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept all files here - validation will happen in the route handler
  // after multer has parsed the form data fields (type, name, test_id, etc.)
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/audio");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

const normalizeJsonInput = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  throw new Error("Invalid JSON input");
};

// POST /api/materials/upload - Upload material file
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { test_id, name, type } = req.body;

    if (!test_id || !name || !type) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Missing test_id, name, or type" });
    }

    // Validate file type matches the material type
    if (type === "audio") {
      const audioTypes = [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/x-m4a",
      ];
      if (!audioTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: "Only audio files (MP3, WAV, OGG, M4A) are allowed for audio",
        });
      }
    } else if (type === "passages" || type === "answers") {
      if (req.file.mimetype !== "application/pdf") {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: "Only PDF files are allowed for passages and answers",
        });
      }
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Invalid material type" });
    }

    try {
      // Verify user is admin
      const [user] = await db.execute("SELECT role FROM users WHERE id = ?", [
        req.user.id,
      ]);

      if (user.length === 0 || user[0].role !== "admin") {
        fs.unlinkSync(req.file.path);
        return res
          .status(403)
          .json({ error: "Only admins can upload materials" });
      }

      // Verify test exists
      const [testExists] = await db.execute(
        "SELECT id FROM tests WHERE id = ?",
        [test_id]
      );

      if (testExists.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Test not found" });
      }

      // For PDF files (passages/answers), automatically convert to JSON and insert test data
      let conversionResult = null;
      if (type === "passages" || type === "answers") {
        try {
          // Call Python conversion via python-shell
          const pythonScript = path.join(
            __dirname,
            "../pdf_converter/node_interface.py"
          );

          console.log("Starting PDF conversion for:", req.file.filename);

          conversionResult = await new Promise((resolve, reject) => {
            const pyshell = new PythonShell(pythonScript, {
              args: [req.file.path],
              pythonOptions: ["-u"],
              timeout: 120000, // 2 minutes
              env: { PYTHONIOENCODING: "utf-8" }, // Ensure Python uses UTF-8
            });

            let output = "";

            pyshell.on("message", (message) => {
              // Don't log messages directly to avoid encoding issues - just accumulate
              output += message;
            });

            pyshell.on("error", (error) => {
              console.error("Python process error:", error.toString());
              reject(error);
            });

            pyshell.end((err) => {
              if (err) {
                reject(err);
              } else {
                try {
                  const result = JSON.parse(output);
                  console.log(
                    `\nPDF conversion completed - Confidence: ${(
                      result.confidence * 100
                    ).toFixed(1)}%`
                  );

                  // Log the complete converted test data as formatted JSON
                  if (result.testData) {
                    console.log("\n" + "=".repeat(100));
                    console.log("COMPLETE CONVERTED TEST DATA (JSON)");
                    console.log("=".repeat(100));
                    console.log(JSON.stringify(result.testData, null, 2));
                    console.log("=".repeat(100) + "\n");
                  }

                  resolve(result);
                } catch (parseErr) {
                  console.error("Failed to parse Python output");
                  reject(parseErr);
                }
              }
            });
          });

          // Store the conversion result for debugging
          lastConversionResult = conversionResult;

          // If conversion successful, try to insert test data
          if (
            conversionResult.success &&
            conversionResult.testData &&
            type === "passages"
          ) {
            try {
              // Insert converted test data into database
              const testData = conversionResult.testData;

              // Get test name from document or use uploaded file name
              const testName = testData.test_info?.title || name;

              // Note: We store the material reference, not duplicate test insertion
              // The test already exists (user selected it), we just store the material
              // Skipping duplicate test creation to avoid conflicts

              // Note: Full test structure insertion (sections, questions, etc.)
              // would be done here using the database_inserter module
              // For now, we're just storing the material reference
            } catch (dbErr) {
              console.warn("Failed to auto-insert test data:", dbErr.message);
              // Continue with material upload even if insertion fails
            }
          }
        } catch (convErr) {
          console.warn("PDF conversion error (conversion will continue)");
          conversionResult = {
            success: false,
            message: "PDF conversion attempted but incomplete",
          };
        }
      }

      // Insert material record
      const fileUrl = `/uploads/materials/${req.file.filename}`;
      const [result] = await db.execute(
        `INSERT INTO test_materials 
         (test_id, material_type, file_name, file_path, file_url, file_size, uploaded_by, uploaded_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          test_id,
          type,
          name,
          req.file.path,
          fileUrl,
          req.file.size,
          req.user.id,
          new Date(),
        ]
      );

      res.json({
        success: true,
        message:
          "Material uploaded successfully" +
          (conversionResult?.success
            ? " and PDF converted to test format"
            : ""),
        material: {
          id: result.insertId,
          test_id,
          name,
          type,
          file_url: fileUrl,
          file_size: req.file.size,
          uploaded_at: new Date(),
        },
        conversion: conversionResult
          ? {
              success: conversionResult.success,
              confidence: conversionResult.confidence || 0,
              message: conversionResult.message,
              testData: conversionResult.testData
                ? {
                    title: conversionResult.testData.test_info?.title,
                    test_type: conversionResult.testData.test_info?.test_type,
                    num_sections:
                      conversionResult.testData.test_info?.num_sections,
                    total_questions:
                      conversionResult.testData.test_info?.total_questions,
                    sections:
                      conversionResult.testData.sections?.map((s) => ({
                        type: s.type,
                        section_number: s.section_number,
                        title: s.title,
                        total_questions: s.total_questions,
                      })) || [],
                  }
                : null,
              validation: conversionResult.validation,
            }
          : null,
      });
    } catch (err) {
      console.error("Upload error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        error: err.message || "Internal server error",
      });
    }
  }
);

// GET /api/materials/sets - List material sets (admin)
router.get("/sets", authMiddleware, ensureAdmin, async (req, res) => {
  const { test_id } = req.query;

  try {
    let query = `
      SELECT 
        ms.id,
        ms.test_id,
        t.name AS test_name,
        ms.name,
        ms.audio_file_url,
        ms.audio_file_size,
        ms.updated_at,
        (ms.content_json IS NOT NULL AND ms.content_json <> '') AS has_content,
        (ms.answer_key_json IS NOT NULL AND ms.answer_key_json <> '') AS has_answers
      FROM test_material_sets ms
      JOIN tests t ON ms.test_id = t.id
    `;
    const params = [];

    if (test_id) {
      query += " WHERE ms.test_id = ?";
      params.push(test_id);
    }

    query += " ORDER BY ms.updated_at DESC";

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching material sets:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/materials/sets/:setId - Get material set details (admin)
router.get("/sets/:setId", authMiddleware, ensureAdmin, async (req, res) => {
  const { setId } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT 
        ms.id,
        ms.test_id,
        t.name AS test_name,
        ms.name,
        ms.content_json,
        ms.answer_key_json,
        ms.audio_file_name,
        ms.audio_file_url,
        ms.audio_file_size,
        ms.updated_at
       FROM test_material_sets ms
       JOIN tests t ON ms.test_id = t.id
       WHERE ms.id = ?`,
      [setId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Material set not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching material set:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/materials/sets/:setId/content - Get content JSON (auth)
router.get("/sets/:setId/content", authMiddleware, async (req, res) => {
  const { setId } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT content_json FROM test_material_sets WHERE id = ?",
      [setId]
    );

    if (rows.length === 0 || !rows[0].content_json) {
      return res.status(404).json({ error: "Content not found" });
    }

    const content = JSON.parse(rows[0].content_json);
    res.json({ content });
  } catch (err) {
    console.error("Error fetching content JSON:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/materials/sets/:setId/answers - Get answer key JSON (auth)
router.get("/sets/:setId/answers", authMiddleware, async (req, res) => {
  const { setId } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT answer_key_json FROM test_material_sets WHERE id = ?",
      [setId]
    );

    if (rows.length === 0 || !rows[0].answer_key_json) {
      return res.status(404).json({ error: "Answer key not found" });
    }

    const answers = JSON.parse(rows[0].answer_key_json);
    res.json({ answers });
  } catch (err) {
    console.error("Error fetching answer key JSON:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/materials/sets/:setId/audio - Get audio metadata (auth)
router.get("/sets/:setId/audio", authMiddleware, async (req, res) => {
  const { setId } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT audio_file_name, audio_file_url, audio_file_size 
       FROM test_material_sets 
       WHERE id = ?`,
      [setId]
    );

    if (rows.length === 0 || !rows[0].audio_file_url) {
      return res.status(404).json({ error: "Audio not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching audio metadata:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/materials/sets - Create material set (admin)
router.post("/sets", authMiddleware, ensureAdmin, async (req, res) => {
  const { test_id, name, content_json, answer_key_json } = req.body;

  if (!test_id || !name) {
    return res.status(400).json({ error: "test_id and name are required" });
  }

  let contentJsonValue = null;
  let answersJsonValue = null;

  try {
    contentJsonValue = normalizeJsonInput(content_json);
    answersJsonValue = normalizeJsonInput(answer_key_json);
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON format" });
  }

  try {
    const [testExists] = await db.execute(
      "SELECT id FROM tests WHERE id = ?",
      [test_id]
    );

    if (testExists.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }

    const [result] = await db.execute(
      `INSERT INTO test_material_sets
       (test_id, name, content_json, answer_key_json, uploaded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [test_id, name, contentJsonValue, answersJsonValue, req.user.id]
    );

    res.json({
      id: result.insertId,
      test_id,
      name,
      has_content: Boolean(contentJsonValue),
      has_answers: Boolean(answersJsonValue),
    });
  } catch (err) {
    console.error("Error creating material set:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/materials/sets/:setId - Update material set (admin)
router.put("/sets/:setId", authMiddleware, ensureAdmin, async (req, res) => {
  const { setId } = req.params;
  const { name, content_json, answer_key_json } = req.body;

  const updates = [];
  const params = [];

  try {
    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }

    if (content_json !== undefined) {
      if (content_json === "" || content_json === null) {
        updates.push("content_json = NULL");
      } else {
        updates.push("content_json = ?");
        params.push(normalizeJsonInput(content_json));
      }
    }

    if (answer_key_json !== undefined) {
      if (answer_key_json === "" || answer_key_json === null) {
        updates.push("answer_key_json = NULL");
      } else {
        updates.push("answer_key_json = ?");
        params.push(normalizeJsonInput(answer_key_json));
      }
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON format" });
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No updates provided" });
  }

  try {
    const query = `UPDATE test_material_sets SET ${updates.join(
      ", "
    )}, updated_at = NOW() WHERE id = ?`;
    params.push(setId);

    const [result] = await db.execute(query, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Material set not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating material set:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/materials/sets/:setId/audio - Upload audio file (admin)
router.post(
  "/sets/:setId/audio",
  authMiddleware,
  ensureAdmin,
  audioUpload.single("file"),
  async (req, res) => {
    const { setId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const audioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
    ];

    if (!audioTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "Only audio files (MP3, WAV, OGG, M4A) are allowed",
      });
    }

    try {
      const [existing] = await db.execute(
        "SELECT audio_file_path FROM test_material_sets WHERE id = ?",
        [setId]
      );

      if (existing.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Material set not found" });
      }

      if (existing[0].audio_file_path && fs.existsSync(existing[0].audio_file_path)) {
        fs.unlinkSync(existing[0].audio_file_path);
      }

      const fileUrl = `/uploads/audio/${req.file.filename}`;

      await db.execute(
        `UPDATE test_material_sets
         SET audio_file_name = ?, audio_file_path = ?, audio_file_url = ?, audio_file_size = ?, updated_at = NOW()
         WHERE id = ?`,
        [req.file.originalname, req.file.path, fileUrl, req.file.size, setId]
      );

      res.json({
        success: true,
        audio_file_url: fileUrl,
        audio_file_name: req.file.originalname,
        audio_file_size: req.file.size,
      });
    } catch (err) {
      console.error("Audio upload error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /api/materials/sets/:setId - Delete material set and audio (admin)
router.delete("/sets/:setId", authMiddleware, ensureAdmin, async (req, res) => {
  const { setId } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT test_id, audio_file_path FROM test_material_sets WHERE id = ?",
      [setId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Material set not found" });
    }

    const { test_id: testId, audio_file_path: audioPath } = rows[0];
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    const [materials] = await db.execute(
      "SELECT id, file_path FROM test_materials WHERE test_id = ?",
      [testId]
    );

    for (const material of materials) {
      if (material.file_path && fs.existsSync(material.file_path)) {
        fs.unlinkSync(material.file_path);
      }
    }

    if (materials.length > 0) {
      await db.execute("DELETE FROM test_materials WHERE test_id = ?", [testId]);
    }

    await db.execute("DELETE FROM test_material_sets WHERE id = ?", [setId]);

    res.json({
      success: true,
      deleted_material_files: materials.length,
    });
  } catch (err) {
    console.error("Error deleting material set:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/materials/test/:testId - Get materials for a test
router.get("/test/:testId", authMiddleware, async (req, res) => {
  const { testId } = req.params;
  const { type } = req.query; // optional filter by type

  try {
    let query =
      "SELECT id, test_id, material_type, file_name, file_url, file_size, uploaded_at FROM test_materials WHERE test_id = ?";
    const params = [testId];

    if (type) {
      query += " AND material_type = ?";
      params.push(type);
    }

    query += " ORDER BY uploaded_at DESC";

    const [materials] = await db.execute(query, params);

    res.json(materials);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/materials/:materialId - Get material details
router.get("/:materialId", authMiddleware, async (req, res) => {
  const { materialId } = req.params;

  try {
    const [materials] = await db.execute(
      "SELECT * FROM test_materials WHERE id = ?",
      [materialId]
    );

    if (materials.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json(materials[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/materials/:materialId - Delete material
router.delete("/:materialId", authMiddleware, async (req, res) => {
  const { materialId } = req.params;

  try {
    // Verify user is admin
    const [user] = await db.execute("SELECT role FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (user.length === 0 || user[0].role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can delete materials" });
    }

    // Get material to delete the file
    const [materials] = await db.execute(
      "SELECT file_path FROM test_materials WHERE id = ?",
      [materialId]
    );

    if (materials.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Delete from database
    await db.execute("DELETE FROM test_materials WHERE id = ?", [materialId]);

    // Delete physical file
    const filePath = materials[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: "Material deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DEBUG ENDPOINT - GET /api/materials/debug/last-conversion - View last PDF conversion result
router.get("/debug/last-conversion", authMiddleware, async (req, res) => {
  if (!lastConversionResult) {
    return res.status(404).json({
      error: "No conversion result available. Upload a PDF first.",
    });
  }

  res.json({
    timestamp: new Date().toISOString(),
    conversion: lastConversionResult,
  });
});

// GET /api/materials/stats/test/:testId - Get material statistics for a test
router.get("/stats/test/:testId", authMiddleware, async (req, res) => {
  const { testId } = req.params;

  try {
    const [stats] = await db.execute(
      `SELECT 
        material_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM test_materials 
      WHERE test_id = ?
      GROUP BY material_type`,
      [testId]
    );

    res.json(stats);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
