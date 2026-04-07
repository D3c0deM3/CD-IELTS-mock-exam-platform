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

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/material-images");
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

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
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

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const humanizeKey = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const buildBaseContextLabel = (ctx) => {
  if (ctx.taskLabel) return ctx.taskLabel;
  if (ctx.partLabel) return ctx.partLabel;
  if (ctx.passageLabel) return ctx.passageLabel;
  if (ctx.sectionLabel) return ctx.sectionLabel;
  return "Test Asset";
};

const buildSinglePlaceholderLabel = (ctx, node) => {
  const base = buildBaseContextLabel(ctx);
  const detail =
    node.title ||
    ctx.componentTitle ||
    (node.type ? humanizeKey(node.type) : "") ||
    "Image";

  if (!detail || detail === base) return base;
  return `${base} - ${detail}`;
};

const buildFieldPlaceholderLabel = (ctx, fieldName) => {
  const base = buildBaseContextLabel(ctx);
  return `${base} - ${humanizeKey(fieldName)}`;
};

const extractImageSlots = (content) => {
  const slotsByKey = new Map();

  const addSlot = (placeholderKey, slotData) => {
    if (!placeholderKey || slotsByKey.has(placeholderKey)) return;
    slotsByKey.set(placeholderKey, {
      placeholder_key: placeholderKey,
      ...slotData,
    });
  };

  const visit = (node, ctx = {}) => {
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, ctx));
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    let nextCtx = { ...ctx };

    if (node.type === "listening" || node.type === "reading" || node.type === "writing") {
      nextCtx.sectionLabel =
        node.section_number != null
          ? `${humanizeKey(node.type)} Section ${node.section_number}`
          : humanizeKey(node.type);
    }

    if (node.part_number != null) {
      nextCtx.partLabel = `Listening Section ${node.part_number}`;
    }

    if (node.passage_number != null) {
      nextCtx.passageLabel = `Reading Passage ${node.passage_number}`;
    }

    if (node.task_number != null) {
      nextCtx.taskLabel = `Writing Task ${node.task_number}`;
    }

    if (node.type || node.title) {
      nextCtx.componentType = node.type || nextCtx.componentType;
      nextCtx.componentTitle = node.title || nextCtx.componentTitle;
    }

    if (node.image_placeholder_key) {
      addSlot(node.image_placeholder_key, {
        label: buildSinglePlaceholderLabel(nextCtx, node),
        context_type: node.type || nextCtx.componentType || "image",
        context_label: buildBaseContextLabel(nextCtx),
      });
    }

    if (node.image_placeholder_keys && typeof node.image_placeholder_keys === "object") {
      Object.entries(node.image_placeholder_keys).forEach(([fieldName, placeholderKey]) => {
        addSlot(placeholderKey, {
          label: buildFieldPlaceholderLabel(nextCtx, fieldName),
          context_type: node.visual_type || node.type || nextCtx.componentType || "image",
          context_label: buildBaseContextLabel(nextCtx),
        });
      });
    }

    Object.values(node).forEach((value) => visit(value, nextCtx));
  };

  visit(content);
  return Array.from(slotsByKey.values());
};

const listImageAssets = async (setId) => {
  const [rows] = await db.execute(
    `SELECT
      id,
      set_id,
      placeholder_key,
      label,
      context_type,
      context_label,
      file_name,
      file_url,
      file_size,
      mime_type,
      updated_at
     FROM test_material_set_images
     WHERE set_id = ?
     ORDER BY placeholder_key ASC`,
    [setId]
  );

  return rows;
};

const injectImageAssetsIntoContent = (content, imageAssets) => {
  const clonedContent = cloneJson(content);
  const assetsByKey = Object.fromEntries(
    imageAssets.map((asset) => [asset.placeholder_key, asset])
  );

  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    if (node.image_placeholder_key) {
      const asset = assetsByKey[node.image_placeholder_key];
      if (asset) {
        node.image_url = asset.file_url;
        node.image_asset = asset;
      }
    }

    if (node.image_placeholder_keys && typeof node.image_placeholder_keys === "object") {
      const resolvedUrls = { ...(node.image_urls || {}) };
      Object.entries(node.image_placeholder_keys).forEach(([fieldName, placeholderKey]) => {
        const asset = assetsByKey[placeholderKey];
        if (asset) {
          resolvedUrls[fieldName] = asset.file_url;
        }
      });
      node.image_urls = resolvedUrls;
    }

    if (node.image_ref) {
      const asset = assetsByKey[node.image_ref];
      if (asset) {
        node.image_url = asset.file_url;
      }
    }

    Object.values(node).forEach(visit);
  };

  visit(clonedContent);
  return clonedContent;
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
        (SELECT COUNT(*) FROM test_material_set_images mi WHERE mi.set_id = ms.id) AS image_count,
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

    const materialSet = rows[0];
    const imageAssets = await listImageAssets(setId);
    let imageSlots = [];

    if (materialSet.content_json) {
      try {
        imageSlots = extractImageSlots(JSON.parse(materialSet.content_json));
      } catch (err) {
        imageSlots = [];
      }
    }

    res.json({
      ...materialSet,
      image_assets: imageAssets,
      image_slots: imageSlots,
    });
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

      const imageAssets = await listImageAssets(setId);
      let content = injectImageAssetsIntoContent(
        JSON.parse(rows[0].content_json),
        imageAssets
      );

      // Auto-normalize db formats to client expectations
      if (content && content.sections) {
        const normalizedSections = [];
        
        // 1. Listening
        const listeningSections = content.sections.filter(s => s.type === 'listening');
        if (listeningSections.length > 0) {
          const combinedParts = [];
          listeningSections.forEach(ls => {
            if (ls.parts) {
              ls.parts.forEach(p => combinedParts.push(p));
            }
          });
          normalizedSections.push({
            type: 'listening',
            title: 'Listening',
            section_number: 1,
            total_questions: combinedParts.reduce((sum, p) => sum + (p.questions ? p.questions.length : 0), 0),
            parts: combinedParts
          });
        }

        // 2. Reading
        const readingSections = content.sections.filter(s => s.type === 'reading');
        if (readingSections.length > 0) {
          const combinedPassages = [];
          readingSections.forEach(rs => {
            if (rs.passages) {
              rs.passages.forEach(p => combinedPassages.push(p));
            }
          });
          normalizedSections.push({
              type: 'reading',
              title: 'Reading',
              section_number: 2,
              total_questions: combinedPassages.reduce((sum, p) => sum + (p.questions ? p.questions.length : 0), 0),
              passages: combinedPassages
          });
        }
        
        // 3. Writing
        const writingSections = content.sections.filter(s => s.type === 'writing');
        if (writingSections.length > 0) {
          const combinedTasks = [];
          writingSections.forEach(ws => {
            if (ws.tasks) {
              ws.tasks.forEach(t => combinedTasks.push(t));
            } else if (ws.parts) {
              ws.parts.forEach(t => combinedTasks.push(t));
            }
          });
          normalizedSections.push({
              type: 'writing',
              title: 'Writing',
              section_number: 3,
              tasks: combinedTasks
          });
        }

        // Recursive type normalization
        const typeMap = {
          'true_false_not_given': 'true_false_ng',
          'yes_no_not_given': 'yes_no_ng',
          'note_completion': 'gap_fill',
          'sentence_completion': 'gap_fill',
          'summary_completion': 'gap_fill',
          'form_completion': 'gap_fill',
          'table_completion': 'gap_fill',
          'map_labelling': 'matching',
          'matching_features': 'matching',
          'matching_information': 'matching',
          'matching_headings': 'paragraph_matching',
          'multiple_choice_single': 'multiple_choice'
        };

        const normalizeQuestions = (obj) => {
          if (Array.isArray(obj)) {
            obj.forEach(item => normalizeQuestions(item));
          } else if (obj !== null && typeof obj === 'object') {
            if (obj.type && typeMap[obj.type]) {
              obj.type = typeMap[obj.type];
            }
            if (obj.type === 'matching' && obj.options && (!obj.statement && !obj.prompt) && obj.question) {
               obj.statement = obj.question;
            }
            if (obj.type === 'gap_fill' && !obj.prompt && obj.question) {
               obj.prompt = obj.question;
            }
            
            // Special fix for visual structures that encapsulate question group level types
            if (obj.visual_structure) {
               const vs = obj.visual_structure;
               if (vs.question_groups) {
                   vs.question_groups.forEach(group => {
                       if (group.type && typeMap[group.type]) {
                           group.type = typeMap[group.type];
                       }
                   });
               }
               
               // Let's normalize the new extraction structure to the legacy frontend structure
               // The frontend supports: "structured_notes", "form", "mixed"
               
               if (vs.type === 'note_completion' || vs.type === 'summary_completion' || vs.type === 'table_completion' || vs.layout === 'form' || vs.layout === 'structured_notes') {
                   // Convert to structured_notes
                   vs.type = 'structured_notes';
                   
                   if (!vs.sections || vs.sections.length === 0) {
                       if (vs.items && vs.items.length > 0) {
                           // Try to parse items and extract question IDs if it's just strings
                           const convertedItems = vs.items.map(itemStr => {
                               if (typeof itemStr === 'string') {
                                   const match = itemStr.match(/(\d+)\s*(?:\.{2,}|…+|_{2,})/);
                                   const qId = match ? parseInt(match[1]) : null;
                                   return {
                                       type: qId ? "question" : "text",
                                       question_id: qId,
                                       content: itemStr
                                   };
                               }
                               return itemStr;
                           });
                           
                           vs.sections = [{
                               title: "",
                               items: convertedItems
                           }];
                       }
                   }
               }
               
               if (vs.type && typeMap[vs.type]) {
                   // If there's a different mapping
                   vs.type = typeMap[vs.type];
               }
            }
            
            Object.keys(obj).forEach(k => {
               // Don't recurse into infinite loops or unnecessary properties if not needed, but here it's simple JSON
               normalizeQuestions(obj[k]);
            });
          }
        };

        normalizeQuestions(normalizedSections);
        content.sections = normalizedSections;
      }

      res.json({ content, image_assets: imageAssets });
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
      image_slots: contentJsonValue
        ? extractImageSlots(JSON.parse(contentJsonValue))
        : [],
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

    let imageSlots = [];
    if (content_json !== undefined && content_json !== "" && content_json !== null) {
      imageSlots = extractImageSlots(JSON.parse(normalizeJsonInput(content_json)));
    } else {
      const [rows] = await db.execute(
        "SELECT content_json FROM test_material_sets WHERE id = ?",
        [setId]
      );
      if (rows[0]?.content_json) {
        imageSlots = extractImageSlots(JSON.parse(rows[0].content_json));
      }
    }

    res.json({ success: true, image_slots: imageSlots });
  } catch (err) {
    console.error("Error updating material set:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/materials/sets/:setId/images - Upload image asset for a detected placeholder
router.post(
  "/sets/:setId/images",
  authMiddleware,
  ensureAdmin,
  imageUpload.single("file"),
  async (req, res) => {
    const { setId } = req.params;
    const { placeholder_key, label, context_type, context_label } = req.body;

    if (!placeholder_key) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "placeholder_key is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    if (!IMAGE_MIME_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "Only PNG, JPG, WEBP, GIF, or SVG image files are allowed",
      });
    }

    try {
      const [setRows] = await db.execute(
        "SELECT id, content_json FROM test_material_sets WHERE id = ?",
        [setId]
      );

      if (setRows.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Material set not found" });
      }

      const availableSlots = setRows[0].content_json
        ? extractImageSlots(JSON.parse(setRows[0].content_json)).map(
            (slot) => slot.placeholder_key
          )
        : [];

      if (availableSlots.length > 0 && !availableSlots.includes(placeholder_key)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: `Unknown placeholder_key "${placeholder_key}" for this material set`,
        });
      }

      const [existing] = await db.execute(
        "SELECT id, file_path FROM test_material_set_images WHERE set_id = ? AND placeholder_key = ?",
        [setId, placeholder_key]
      );

      if (existing[0]?.file_path && fs.existsSync(existing[0].file_path)) {
        fs.unlinkSync(existing[0].file_path);
      }

      const fileUrl = `/uploads/material-images/${req.file.filename}`;

      if (existing.length > 0) {
        await db.execute(
          `UPDATE test_material_set_images
           SET label = ?, context_type = ?, context_label = ?, file_name = ?, file_path = ?, file_url = ?, file_size = ?, mime_type = ?, uploaded_by = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            label || null,
            context_type || null,
            context_label || null,
            req.file.originalname,
            req.file.path,
            fileUrl,
            req.file.size,
            req.file.mimetype,
            req.user.id,
            existing[0].id,
          ]
        );
      } else {
        await db.execute(
          `INSERT INTO test_material_set_images
           (set_id, placeholder_key, label, context_type, context_label, file_name, file_path, file_url, file_size, mime_type, uploaded_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            setId,
            placeholder_key,
            label || null,
            context_type || null,
            context_label || null,
            req.file.originalname,
            req.file.path,
            fileUrl,
            req.file.size,
            req.file.mimetype,
            req.user.id,
          ]
        );
      }

      const imageAssets = await listImageAssets(setId);

      res.json({
        success: true,
        placeholder_key,
        file_url: fileUrl,
        image_assets: imageAssets,
      });
    } catch (err) {
      console.error("Image upload error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

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

    const [imageRows] = await db.execute(
      "SELECT file_path FROM test_material_set_images WHERE set_id = ?",
      [setId]
    );
    imageRows.forEach((image) => {
      if (image.file_path && fs.existsSync(image.file_path)) {
        fs.unlinkSync(image.file_path);
      }
    });

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
      deleted_image_files: imageRows.length,
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
