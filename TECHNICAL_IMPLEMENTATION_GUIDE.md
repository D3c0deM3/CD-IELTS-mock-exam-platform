# Detailed Technical Implementation Guide

## 1. Gap Fill Rendering Fix - Technical Details

### Problem Analysis

**Before Fix:**

```
JSON: "garage has 1........."
Renders as: "garage has [input field]........." ❌ (extra dots visible)
```

**After Fix:**

```
JSON: "garage has 1........."
Renders as: "garage has [input field]" ✅ (clean, no extra dots)
```

### Root Cause Analysis

The original regex pattern was non-anchored:

```javascript
// OLD - INCORRECT
part.match(/(\d+)\s*(?:\.{2,}|…+)/);
// This would match "1......" but wouldn't prevent
// the remaining dots from being rendered in other parts
```

The split operation was preserving the matched patterns in the array, but not all gap patterns were being identified, especially when there were edge cases.

### Complete Solution

#### Step 1: Enhanced Helper Function (Optional but recommended)

```javascript
// Helper function to extract gap content
const extractGapContent = (text) => {
  const gapMatch = text.match(/^(\d+)\s*(?:\.{2,}|…+|_+)$/);
  if (gapMatch) {
    return { isGap: true, gapNum: parseInt(gapMatch[1], 10) };
  }
  return { isGap: false };
};
```

#### Step 2: Improved Regex Pattern

**Pattern Evolution:**

```javascript
// Level 1: Original (too loose)
/(\d+\s*(?:\.{2,}|…+))/

// Level 2: Added underscores
/(\d+\s*(?:\.{2,}|…+|_{2,}))/

// Level 3: Strict anchoring for matching
/^(\d+)\s*(?:\.{2,}|…+|_{2,})$/  // Use this for match()

// Level 4: For split operations (capture group)
/(\d+\s*(?:\.{2,}|…+|_{2,}))/    // Use this for split()
```

#### Step 3: TableRenderer Implementation

```javascript
const TableRenderer = ({ tableData, questions, answers, onAnswerChange }) => {
  if (!tableData) return null;

  const columns = [
    { header: "House or flat", key: "house_or_flat" },
    { header: "Details", key: "details" },
    { header: "Rent per month", key: "rent" },
    { header: "Address", key: "address" },
    { header: "Location", key: "location" },
  ];

  return (
    <div className="visual-table">
      {tableData.title && <h3 className="table-title">{tableData.title}</h3>}
      <table className="ielts-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => {
                const cellContent = row[col.key] ?? "";

                // KEY: More robust regex with underscores
                const parts = cellContent.split(/(\d+\s*(?:\.{2,}|…+|_{2,}))/);

                return (
                  <td key={`${rowIndex}-${colIndex}`}>
                    {parts.map((part, i) => {
                      // Skip empty parts
                      if (!part) return null;

                      // KEY: Strict matching - only match if entire part is a gap
                      const gapMatch = part.match(
                        /^(\d+)\s*(?:\.{2,}|…+|_{2,})$/
                      );

                      if (gapMatch) {
                        const questionNum = parseInt(gapMatch[1], 10);
                        const question = questions.find(
                          (q) => q.id === questionNum
                        );

                        if (!question) {
                          console.error(
                            "Missing question for gap:",
                            questionNum
                          );
                          return null;
                        }

                        return (
                          <input
                            key={i}
                            type="text"
                            className="table-gap-input"
                            value={answers[question.id] || ""}
                            onChange={(e) =>
                              onAnswerChange(question.id, e.target.value)
                            }
                            placeholder={question.id}
                            maxLength={
                              question.word_limit?.includes("ONE WORD")
                                ? 15
                                : 30
                            }
                            style={{ minWidth: 90 }}
                            autoComplete="off"
                          />
                        );
                      }

                      // Render non-gap text
                      return <span key={i}>{part}</span>;
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {tableData.note && (
        <div className="table-note">
          <strong>Note:</strong> {tableData.note}
        </div>
      )}
    </div>
  );
};
```

**Key Points:**

1. `parts` array contains interleaved text and gap patterns
2. Empty parts are filtered with `if (!part) return null`
3. Strict anchoring `^...$` ensures only complete gap patterns are matched
4. Remaining text is rendered as-is in `<span>` elements

---

## 2. Writing Submission System - Technical Details

### Database Schema

#### writing_submissions Table

```sql
CREATE TABLE writing_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Foreign Keys
  session_id INT NOT NULL,
  participant_id INT NOT NULL,

  -- Participant Info
  participant_id_code VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),

  -- Essay Content (LONGTEXT for unlimited size)
  task_1_content LONGTEXT,
  task_2_content LONGTEXT,

  -- Metadata
  task_1_word_count INT DEFAULT 0,
  task_2_word_count INT DEFAULT 0,

  -- Scoring & Review
  writing_score DECIMAL(5, 2),
  admin_notes TEXT,
  is_reviewed BOOLEAN DEFAULT 0,
  reviewed_by INT,
  reviewed_at DATETIME,

  -- Timestamps
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Relationships
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES test_participants(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Indexes
  KEY idx_session_participant (session_id, participant_id),
  KEY idx_reviewed (is_reviewed),
  KEY idx_submitted (submitted_at)
);
```

### Data Type Decisions

| Field               | Type         | Reasoning                           |
| ------------------- | ------------ | ----------------------------------- |
| `task_1_content`    | LONGTEXT     | Essays can be thousands of words    |
| `writing_score`     | DECIMAL(5,2) | IELTS allows half-band scores (6.5) |
| `is_reviewed`       | BOOLEAN      | Simple status flag                  |
| `task_1_word_count` | INT          | Max 999,999 words sufficient        |
| `admin_notes`       | TEXT         | Feedback typically <65KB            |

### API Implementation - submit-writing

```javascript
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

  // Validation
  if (!participant_id || !full_name || !writing_answers) {
    return res.status(400).json({
      error:
        "Missing required fields: participant_id, full_name, writing_answers",
    });
  }

  try {
    // Verify participant exists
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

    // Verify name matches (security check)
    const registeredName = (participant.full_name || "").trim().toLowerCase();
    const providedName = (full_name || "").trim().toLowerCase();

    if (registeredName !== providedName) {
      return res.status(403).json({
        error: "Name does not match registered participant",
      });
    }

    // Insert into writing_submissions table
    await db.execute(
      `INSERT INTO writing_submissions 
       (session_id, participant_id, participant_id_code, full_name, phone_number, 
        task_1_content, task_2_content, task_1_word_count, task_2_word_count, 
        writing_score, submitted_at)
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
        0, // 0 = pending review
      ]
    );

    // Update participant record
    await db.execute(
      `UPDATE test_participants 
       SET writing_score = 0, updated_at = NOW()
       WHERE id = ?`,
      [participant.id]
    );

    // Return confirmation
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
```

### API Implementation - get writing submissions

```javascript
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
```

### API Implementation - review writing

```javascript
router.post(
  "/:session_id/writing-submissions/:submission_id/review",
  authMiddleware,
  async (req, res) => {
    const { session_id, submission_id } = req.params;
    const { writing_score, admin_notes } = req.body;

    // Admin authorization
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
      // Update submission record
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

      // Sync score to test_participants
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
```

---

## 3. Admin UI Implementation

### Component State Management

```javascript
const [writingSubmissions, setWritingSubmissions] = useState([]);
const [selectedSubmission, setSelectedSubmission] = useState(null);
const [showWritingReviewModal, setShowWritingReviewModal] = useState(false);
const [writingReviewForm, setWritingReviewForm] = useState({
  writing_score: "",
  admin_notes: "",
});
```

### Fetch Function

```javascript
const fetchWritingSubmissions = async (sessionId) => {
  try {
    setLoading(true);
    const response = await adminService.getWritingSubmissions(sessionId);
    setWritingSubmissions(response.submissions);
  } catch (err) {
    console.error("Failed to fetch writing submissions:", err);
    setError("Failed to fetch writing submissions");
  } finally {
    setLoading(false);
  }
};
```

### Review Handler

```javascript
const handleReviewWriting = async (e) => {
  e.preventDefault();

  if (writingReviewForm.writing_score === "") {
    setError("Writing score is required");
    return;
  }

  try {
    setLoading(true);
    await adminService.reviewWritingSubmission(
      selectedSession.id,
      selectedSubmission.id,
      parseFloat(writingReviewForm.writing_score),
      writingReviewForm.admin_notes
    );

    // Success cleanup
    setShowWritingReviewModal(false);
    setSelectedSubmission(null);
    setWritingReviewForm({ writing_score: "", admin_notes: "" });

    // Refresh data
    fetchWritingSubmissions(selectedSession.id);
    setError("");
    alert("Writing submission reviewed and scored successfully!");
  } catch (err) {
    setError("Failed to review writing submission");
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

### Modal Component

The writing review modal displays:

1. **Header**: Submission info
2. **Summary Box**: Participant details, status
3. **Task 1 Content**: Scrollable text area with left border indicator
4. **Task 2 Content**: Scrollable text area with left border indicator
5. **Scoring Form**: Score input (0-9, 0.5 increments)
6. **Notes Form**: Admin feedback textarea
7. **Actions**: Save/Cancel buttons

---

## 4. Word Count Algorithm

```javascript
// Simple but effective word count
const countWords = (text) => {
  return text
    .split(/\s+/) // Split on any whitespace
    .filter((word) => word.length > 0).length; // Remove empty strings
};

// Example:
countWords("Hello world"); // 2
countWords("  Multiple   spaces  "); // 2
countWords("This is a test essay."); // 5
countWords(""); // 0

// Validation usage:
const task1Valid = wordCount >= 150; // IELTS minimum for Task 1
const task2Valid = wordCount >= 250; // IELTS minimum for Task 2
```

---

## 5. Database Query Optimizations

### Efficient Submission Retrieval

```sql
-- JOIN with users table for reviewer name
SELECT
  ws.*,
  u.full_name as reviewed_by_name
FROM writing_submissions ws
LEFT JOIN users u ON ws.reviewed_by = u.id
WHERE ws.session_id = ?
ORDER BY ws.submitted_at DESC;

-- Indexes used:
KEY idx_session_participant (session_id, participant_id)
KEY idx_reviewed (is_reviewed)
```

**Why these indexes:**

- `session_id` is always in WHERE clause
- Frequent filter on `is_reviewed` status
- `participant_id` supports foreign key constraints

---

## 6. Testing Strategies

### Unit Test - Word Count Function

```javascript
test("countWords correctly calculates word count", () => {
  expect(countWords("Hello world")).toBe(2);
  expect(countWords("  spaced   words  ")).toBe(2);
  expect(countWords("")).toBe(0);
  expect(countWords("single")).toBe(1);
  expect(countWords("This is a 350-word essay...")).toBe(6);
});
```

### Integration Test - Submission Flow

```javascript
test("Writing submission complete flow", async () => {
  // 1. User submits essay
  const response = await fetch("/api/test-sessions/submit-writing", {
    method: "POST",
    body: JSON.stringify({
      participant_id: 1,
      full_name: "John Doe",
      writing_answers: {
        1: "Task 1 essay content...",
        2: "Task 2 essay content...",
      },
      task_1_word_count: 350,
      task_2_word_count: 450,
    }),
  });

  // 2. Verify response
  expect(response.status).toBe(200);
  expect(response.body.status).toBe("pending_admin_review");

  // 3. Check database
  const submission = await db.query(
    "SELECT * FROM writing_submissions WHERE participant_id = 1"
  );
  expect(submission.task_1_word_count).toBe(350);
  expect(submission.is_reviewed).toBe(false);
});
```

---

## 7. Error Handling

### Validation Chain

```javascript
// Step 1: Request validation
if (!participant_id || !full_name || !writing_answers) {
  return res.status(400).json({ error: "Missing fields" });
}

// Step 2: Participant existence check
if (participantRows.length === 0) {
  return res.status(404).json({ error: "Participant not found" });
}

// Step 3: Identity verification
if (registeredName !== providedName) {
  return res.status(403).json({ error: "Name mismatch" });
}

// Step 4: Database operation
try {
  await db.execute(insertQuery);
} catch (err) {
  return res.status(500).json({ error: "Internal server error" });
}
```

---

## 8. Security Considerations

1. **Identity Verification**: Name matched against registered participant
2. **Authorization**: Admin role required for review endpoints
3. **SQL Injection**: Parameterized queries throughout
4. **Data Integrity**: Foreign key constraints
5. **Audit Trail**: recorded reviewer and timestamp

---

**This completes the comprehensive technical implementation guide.**
