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
