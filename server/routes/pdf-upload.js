const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PythonShell } = require("python-shell");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/pdfs");
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
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// POST /api/pdf-upload - Upload and convert PDF
router.post(
  "/upload",
  authMiddleware,
  upload.single("pdf"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const pdfPath = req.file.path;
    const fileName = req.file.originalname;

    try {
      // Check user is admin (optional - can be based on role)
      const [user] = await db.execute("SELECT role FROM users WHERE id = ?", [
        req.user.id,
      ]);

      if (user.length === 0 || user[0].role !== "admin") {
        fs.unlinkSync(pdfPath); // Clean up file
        return res.status(403).json({ error: "Only admins can upload tests" });
      }

      // Call Python converter
      const pythonScriptPath = path.join(
        __dirname,
        "../pdf_converter/node_interface.py"
      );

      let conversionOutput = "";
      let conversionError = "";

      const pyshell = new PythonShell(pythonScriptPath, {
        args: [pdfPath],
        pythonOptions: ["-u"],
        scriptPath: path.dirname(pythonScriptPath),
      });

      // Collect output
      pyshell.on("message", (message) => {
        conversionOutput += message;
      });

      pyshell.on("error", (error) => {
        conversionError += error.message + "\n";
      });

      pyshell.end((err) => {
        if (err) {
          fs.unlinkSync(pdfPath);
          return res.status(500).json({
            error: "PDF conversion failed",
            details: conversionError || err.message,
          });
        }

        try {
          const conversionResult = JSON.parse(conversionOutput);

          if (!conversionResult.success) {
            fs.unlinkSync(pdfPath);
            return res.status(400).json({
              error: "PDF conversion validation failed",
              validation: conversionResult.validation,
              errors: conversionResult.errors,
              warnings: conversionResult.warnings,
            });
          }

          // Store conversion result for preview/confirmation before database insertion
          const conversionData = {
            fileName,
            pdfPath,
            originalFile: req.file.originalname,
            timestamp: new Date(),
            uploadedBy: req.user.id,
            conversionResult: conversionResult,
          };

          // Return success with conversion preview
          res.json({
            success: true,
            message: "PDF converted successfully",
            preview: {
              testName: conversionResult.data.test.name,
              testType: conversionResult.data.test.type,
              sections: conversionResult.data.test.sections?.length || 0,
              questions: conversionResult.data.test.questions?.length || 0,
              metadata: conversionResult.data.test.metadata,
            },
            conversionId: uuidv4(),
            conversionData, // Send full data for next step (database insertion)
            warnings: conversionResult.warnings,
          });
        } catch (parseErr) {
          fs.unlinkSync(pdfPath);
          res.status(500).json({
            error: "Failed to parse conversion output",
            details: parseErr.message,
          });
        }
      });
    } catch (err) {
      console.error("Upload error:", err);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      res.status(500).json({
        error: "Internal server error",
        details: err.message,
      });
    }
  }
);

// POST /api/pdf-upload/confirm - Confirm and insert converted test into database
router.post("/confirm", authMiddleware, async (req, res) => {
  const { conversionData } = req.body;

  if (!conversionData || !conversionData.conversionResult) {
    return res.status(400).json({ error: "Invalid conversion data" });
  }

  const pdfPath = conversionData.pdfPath;

  try {
    const testJson = conversionData.conversionResult.data;

    // Start database transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert test
      const testName = testJson.test.name;
      const testDescription = testJson.test.type;

      const [testResult] = await connection.execute(
        "INSERT INTO tests (name, description, created_at) VALUES (?, ?, ?)",
        [testName, testDescription, new Date()]
      );

      const testId = testResult.insertId;

      let questionsInserted = 0;
      let answersInserted = 0;

      // Insert sections and questions
      for (const section of testJson.test.sections || []) {
        const [sectionResult] = await connection.execute(
          "INSERT INTO sections (test_id, type, content, ordering) VALUES (?, ?, ?, ?)",
          [
            testId,
            section.type || "Unknown",
            (section.content || "").substring(0, 5000),
            section.order || 1,
          ]
        );

        const sectionId = sectionResult.insertId;

        // Insert questions for this section
        const sectionQuestions = (testJson.test.questions || []).filter(
          (q) => String(q.section_id) === String(section.id)
        );

        for (const question of sectionQuestions) {
          const [questionResult] = await connection.execute(
            "INSERT INTO questions (section_id, question_text, question_type) VALUES (?, ?, ?)",
            [sectionId, question.prompt || "", question.type || "unknown"]
          );

          const questionId = questionResult.insertId;
          questionsInserted++;

          // Insert answer options
          if (question.options && Array.isArray(question.options)) {
            for (const option of question.options) {
              await connection.execute(
                "INSERT INTO answers (question_id, answer_text, is_correct, option_label) VALUES (?, ?, ?, ?)",
                [
                  questionId,
                  option.text || "",
                  option.is_correct || false,
                  option.id || "",
                ]
              );
              answersInserted++;
            }
          }
        }
      }

      await connection.commit();
      connection.release();

      // Clean up PDF file
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }

      res.json({
        success: true,
        message: "Test inserted into database successfully",
        testId,
        summary: {
          sections: testJson.test.sections?.length || 0,
          questions: questionsInserted,
          answers: answersInserted,
        },
      });
    } catch (txnErr) {
      await connection.rollback();
      connection.release();
      throw txnErr;
    }
  } catch (err) {
    console.error("Database insertion error:", err);
    res.status(500).json({
      error: "Failed to insert test into database",
      details: err.message,
    });
  }
});

// GET /api/pdf-upload/status/:uploadId - Check conversion status
router.get("/status/:uploadId", authMiddleware, (req, res) => {
  // This could track conversion progress if needed
  res.json({
    status: "completed",
    message: "Conversion status endpoint",
  });
});

module.exports = router;
