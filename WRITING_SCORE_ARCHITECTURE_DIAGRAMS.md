# Writing Score System - Architecture Diagram

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     IELTS MOCK TEST SYSTEM                       │
│                  Writing Score Calculation Flow                  │
└──────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │  Test Taker     │
                          │   (Student)     │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼────┐   ┌─────▼────┐   ┌───▼──────┐
              │Listening │   │ Reading  │   │ Writing  │
              │Section   │   │ Section  │   │ Section  │
              └─────┬────┘   └─────┬────┘   └───┬──────┘
                    │              │             │
              Auto-Score       Auto-Score   [ESSAY INPUT]
              Saved to DB      Saved to DB   Tasks 1 & 2
                    │              │             │
                    │              │      ┌──────▼──────────┐
                    │              │      │ WriteTestDB.js  │
                    │              │      │ Format answers  │
                    │              │      │ Uppercase text  │
                    │              │      └────────┬────────┘
                    │              │               │
                    │              │        ┌──────▼─────────────────┐
                    │              │        │POST /submit-writing    │
                    │              │        │  - participant_id      │
                    │              │        │  - full_name (verify)  │
                    │              │        │  - writing_answers     │
                    │              │        └──────┬─────────────────┘
                    │              │               │
                    │              │        ┌──────▼──────────────────┐
                    │              │        │scoreCalculator.js      │
                    │              │        │ - Count words Task 1   │
                    │              │        │ - Count words Task 2   │
                    │              │        │ - Verify minimums      │
                    │              │        │ - Calculate score      │
                    │              │        └──────┬─────────────────┘
                    │              │               │
                    │              │        ┌──────▼──────────────────┐
                    │              │        │Database Update         │
                    │              │        │ - is_writing_scored=1  │
                    │              │        │ - writing_score = 0    │
                    │              │        │   (pending review)     │
                    │              │        └──────┬─────────────────┘
                    │              │               │
                    │              │        [NO DISPLAY TO USER]
                    │              │               │
                    │              │        User proceeds to Speaking
                    │              │
        ┌───────────┴──────────────┴────────────────────┐
        │                                                │
        │      Admin Dashboard (Session Monitoring)     │
        │                                                │
        │  ┌──────────────────────────────────────┐    │
        │  │ Participants Table                   │    │
        │  ├──────────────────────────────────────┤    │
        │  │ Name │ L │ R │ W │ S │ Actions      │    │
        │  ├──────────────────────────────────────┤    │
        │  │ John │7.5│8.0│0 │ - │ [Scores ]    │◄───┘ Sees writing = 0
        │  │ Sarah│7.0│7.5│ - │ - │ [Scores ]    │      (pending)
        │  └──────────────────────────────────────┘
        │          │          │ Click
        │          │          │ "Scores"
        │          │          └───┐
        │          │              ▼
        │          │   ┌──────────────────────┐
        │          │   │ Set Scores Modal     │
        │          │   ├──────────────────────┤
        │          │   │ Writing Score: [7.5] │
        │          │   │ Speaking: [6.5]     │
        │          │   │ [Cancel] [Submit]    │
        │          │   └──────────┬───────────┘
        │          │              │
        │          │       ┌──────▼──────────────────┐
        │          │       │PUT /admin/participants/:id/scores
        │          │       │  - writing_score: 7.5  │
        │          │       │  - speaking_score: 6.5 │
        │          │       └──────┬─────────────────┘
        │          │              │
        │          │       ┌──────▼──────────────────┐
        │          │       │Database Update         │
        │          │       │ - writing_score = 7.5  │
        │          │       │ - speaking_score = 6.5 │
        │          │       │ - is_*_scored = 1      │
        │          │       └──────┬─────────────────┘
        │          │              │
        │          │    [Optional: Save Session]
        │          │              │
        │          │       ┌──────▼──────────────────┐
        │          │       │Calculate Overall       │
        │          │       │= (L+R+W+S)/4 = 7.5     │
        │          │       │Save to user_test_results
        │          │       └──────┬─────────────────┘
        │          │              │
        └──────────┴──────────────┼──────────────────┐
                                  │                  │
                           ┌──────▼──────────┐       │
                           │ User Dashboard  │◄──────┘
                           ├─────────────────┤
                           │ Latest Result   │
                           │ L: 7.5          │
                           │ R: 8.0          │
                           │ W: 7.5  (NEW)   │
                           │ S: 6.5  (NEW)   │
                           │ O: 7.5          │
                           │                 │
                           │ Results History │
                           │ [Test 1] 7.5    │
                           │ [Test 2] 7.0    │
                           │ ...             │
                           └─────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ SCORE CALCULATION & STORAGE PROCESS                    │
└─────────────────────────────────────────────────────────┘

INPUT STAGE:
┌────────────────────┐
│ User Essay Input   │
│  - Task 1 text     │
│  - Task 2 text     │
│  (any case/format) │
└────────┬───────────┘
         │

NORMALIZATION STAGE:
         │
         ▼
┌──────────────────────────────┐
│ normalizeText()              │
│ 1. Trim whitespace           │
│ 2. toUpperCase()             │
│ 3. Replace /\s+/g with " "   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Normalized: "UPPERCASE TEXT" │
└──────┬───────────────────────┘
       │

CALCULATION STAGE:
       │
       ├─────────────────────┬─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Task 1 Analysis  │ │ Task 2 Analysis  │ │ Metadata         │
│ - Count words    │ │ - Count words    │ │ - Timestamp      │
│ - Minimum: 150   │ │ - Minimum: 250   │ │ - Participant ID │
│ - Result: 160✓   │ │ - Result: 280✓   │ │ - Submit status  │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ calculateWritingScore│
                    │ - Both meet minimum  │
                    │ - Return score data  │
                    └──────────┬───────────┘
                               │

STORAGE STAGE:
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ test_participants Table  │
                    ├──────────────────────────┤
                    │ id = 1                   │
                    │ is_writing_scored = 1    │
                    │ writing_score = 0        │
                    │ speaking_score = NULL    │
                    │ updated_at = NOW()       │
                    └──────────┬───────────────┘
                               │

ADMIN REVIEW STAGE:
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Admin Sets Scores    │
                    │ Writing: 7.5         │
                    │ Speaking: 6.5        │
                    └──────────┬───────────┘
                               │

FINAL STORAGE STAGE:
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ test_participants Update │
                    ├──────────────────────────┤
                    │ writing_score = 7.5      │
                    │ speaking_score = 6.5     │
                    │ is_writing_scored = 1    │
                    │ is_speaking_scored = 1   │
                    │ updated_at = NOW()       │
                    └──────────┬───────────────┘
                               │

DISPLAY STAGE:
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ Dashboard Normalized     │
                    ├──────────────────────────┤
                    │ listening = 7.5 (auto)   │
                    │ reading = 8.0 (auto)     │
                    │ writing = 7.5 (admin)    │
                    │ speaking = 6.5 (admin)   │
                    │ overall = 7.5 (calc)     │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ User Sees Scores     │
                    │ on Dashboard         │
                    └──────────────────────┘
```

---

## API Endpoint Interaction

```
┌────────────────────────────────────────────────┐
│ API ENDPOINTS & REQUEST/RESPONSE FLOW          │
└────────────────────────────────────────────────┘

ENDPOINT 1: Writing Submission
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request:
  POST /api/test-sessions/submit-writing
  Headers: Content-Type: application/json
  Body: {
    "participant_id": 1,
    "full_name": "John Doe",
    "writing_answers": {
      "1": "Task 1 essay text...",
      "2": "Task 2 essay text..."
    }
  }

Processing:
  ✓ Validate participant exists
  ✓ Verify name matches
  ✓ Calculate word counts
  ✓ Verify minimum requirements
  ✓ Save to database

Response:
  Status: 200 OK
  Body: {
    "message": "Writing test submitted successfully",
    "participant_id": 1,
    "writing_submission": {
      "task_1_words": 160,
      "task_1_meets_minimum": true,
      "task_2_words": 280,
      "task_2_meets_minimum": true,
      "status": "pending_admin_review"
    }
  }

Database Change:
  test_participants.is_writing_scored = 1
  test_participants.writing_score = 0


ENDPOINT 2: Get Participant Scores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request:
  GET /api/test-sessions/participant/1/scores

Processing:
  ✓ Find participant by ID
  ✓ Retrieve all score fields
  ✓ Check scoring flags

Response:
  Status: 200 OK
  Body: {
    "participant_id": 1,
    "scores": {
      "listening_score": 7.5,
      "reading_score": 8.0,
      "writing_score": 0,
      "speaking_score": null,
      "is_writing_scored": true,
      "is_speaking_scored": false
    }
  }


ENDPOINT 3: Get Pending Scores (Admin)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request:
  GET /api/admin/pending-scores/1
  Headers: Authorization: Bearer [admin_token]

Processing:
  ✓ Verify admin role
  ✓ Query all participants in session
  ✓ Filter by score status
  ✓ Categorize: pending_writing, pending_speaking, completed

Response:
  Status: 200 OK
  Body: {
    "session_id": 1,
    "summary": {
      "total_participants": 10,
      "completed_tests": 10,
      "pending_writing_review": 5,
      "pending_speaking_review": 5,
      "all_scored": 0
    },
    "pending_writing": [
      {
        "id": 1,
        "participant_id_code": "P1001",
        "full_name": "John Doe",
        "listening_score": 7.5,
        ...
      }
    ],
    "pending_speaking": [...],
    "completed": [...]
  }


ENDPOINT 4: Set Admin Scores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request:
  PUT /api/admin/participants/1/scores
  Headers:
    - Content-Type: application/json
    - Authorization: Bearer [admin_token]
  Body: {
    "writing_score": 7.5,
    "speaking_score": 6.5
  }

Processing:
  ✓ Verify admin role
  ✓ Validate score range (0-9)
  ✓ Find participant
  ✓ Update database
  ✓ Set scoring flags

Response:
  Status: 200 OK
  Body: {
    "message": "Scores updated successfully",
    "writing_score": 7.5,
    "speaking_score": 6.5
  }

Database Change:
  test_participants.writing_score = 7.5
  test_participants.speaking_score = 6.5
  test_participants.is_writing_scored = 1
  test_participants.is_speaking_scored = 1
```

---

## Database Schema

```
┌──────────────────────────────────────────────────┐
│ test_participants TABLE                          │
├──────────────────────────────────────────────────┤
│ COLUMN                 │ TYPE           │ SOURCE │
├──────────────────────────────────────────────────┤
│ id (PK)                │ INT            │ Auto  │
│ session_id (FK)        │ INT            │ Admin │
│ participant_id_code    │ VARCHAR(50)    │ Admin │
│ full_name              │ VARCHAR(255)   │ Admin │
│ phone_number           │ VARCHAR(255)   │ Admin │
├──────────────────────────────────────────────────┤
│ listening_score        │ DECIMAL(5,2)   │ Auto* │
│ reading_score          │ DECIMAL(5,2)   │ Auto* │
│ writing_score  [NEW]   │ DECIMAL(5,2)   │ Admin │
│ speaking_score [NEW]   │ DECIMAL(5,2)   │ Admin │
├──────────────────────────────────────────────────┤
│ is_writing_scored      │ BOOLEAN        │ Sys** │
│ is_speaking_scored     │ BOOLEAN        │ Sys** │
│ test_status            │ VARCHAR(50)    │ Sys   │
│ test_completed_at      │ DATETIME       │ Sys   │
│ updated_at             │ DATETIME       │ Sys   │
└──────────────────────────────────────────────────┘

*  Auto = Calculated automatically from test answers
** Sys = System-set flag (0=not scored, 1=scored)

Score State Transitions:
  listening_score:     NULL → 7.5 (after listening test)
  reading_score:       NULL → 8.0 (after reading test)
  writing_score:       NULL → 0 → 7.5 (on submit, then admin sets)
  speaking_score:      NULL → NULL → 6.5 (no auto, admin sets)

Flag State Transitions:
  is_writing_scored:   0 → 1 (when essay submitted)
  is_speaking_scored:  0 → 1 (when admin sets score)
```

---

## File Structure

```
PROJECT ROOT
│
├── server/
│   ├── utils/
│   │   └── scoreCalculator.js [NEW]
│   │       ├── normalizeText()
│   │       ├── calculateWritingScore()
│   │       └── processWritingScore()
│   │
│   └── routes/
│       ├── testSessions.js [MODIFIED]
│       │   ├── POST /submit-writing
│       │   └── GET /participant/:id/scores
│       │
│       └── admin.js [MODIFIED]
│           └── GET /pending-scores/:session_id
│
├── client/
│   └── src/pages/
│       └── WritingTestDashboard.js [MODIFIED]
│           ├── confirmSubmitTest() [Enhanced]
│           └── isSubmitting state [Added]
│
└── Documentation/
    ├── WRITING_SCORE_IMPLEMENTATION.md
    ├── WRITING_SCORE_QUICK_REFERENCE.md
    ├── WRITING_SCORE_FINAL_SUMMARY.md
    ├── WRITING_SCORE_INTEGRATION_GUIDE.md
    ├── WRITING_SCORE_DEPLOYMENT_CHECKLIST.md
    └── WRITING_SCORE_ARCHITECTURE_DIAGRAMS.md
```

---

## State Diagram: Participant Score Journey

```
Initial State (Participant Registered)
┌─────────────────────────┐
│ listening_score = NULL  │
│ reading_score = NULL    │
│ writing_score = NULL    │
│ speaking_score = NULL   │
│ is_writing_scored = 0   │
│ is_speaking_scored = 0  │
└────────────┬────────────┘
             │
             │ [Listening test completed]
             ▼
┌─────────────────────────┐
│ listening_score = 7.5 ✓ │
│ reading_score = NULL    │
│ writing_score = NULL    │
│ speaking_score = NULL   │
│ is_writing_scored = 0   │
│ is_speaking_scored = 0  │
└────────────┬────────────┘
             │
             │ [Reading test completed]
             ▼
┌─────────────────────────┐
│ listening_score = 7.5 ✓ │
│ reading_score = 8.0 ✓   │
│ writing_score = NULL    │
│ speaking_score = NULL   │
│ is_writing_scored = 0   │
│ is_speaking_scored = 0  │
└────────────┬────────────┘
             │
             │ [Writing test completed & submitted]
             ▼
┌─────────────────────────┐
│ listening_score = 7.5 ✓ │
│ reading_score = 8.0 ✓   │
│ writing_score = 0 ⏳     │ <- PENDING ADMIN
│ speaking_score = NULL   │
│ is_writing_scored = 1   │ <- FLAG SET
│ is_speaking_scored = 0  │
└────────────┬────────────┘
             │
             │ [Admin sets Writing & Speaking scores]
             ▼
┌─────────────────────────┐
│ listening_score = 7.5 ✓ │
│ reading_score = 8.0 ✓   │
│ writing_score = 7.5 ✓   │ <- FINAL
│ speaking_score = 6.5 ✓  │ <- FINAL
│ is_writing_scored = 1 ✓ │
│ is_speaking_scored = 1 ✓│
│ overall = 7.375 → 7.5   │
└─────────────────────────┘
             │
             │ [Results saved & user dashboard updated]
             ▼
        User sees all 4 scores
        on Dashboard
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Client Side (React)                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  WritingTestDashboard.js                              │
│  ├─ User writes essays                                │
│  ├─ State: answers = {1: "...", 2: "..."}             │
│  ├─ State: isSubmitting = false/true                  │
│  │                                                     │
│  ├─ handleSubmitTest()                                │
│  │  └─ setShowSubmitConfirm(true)                     │
│  │                                                     │
│  ├─ confirmSubmitTest()                               │
│  │  ├─ setIsSubmitting(true)                          │
│  │  ├─ Get participant from localStorage              │
│  │  ├─ Format answers (trim)                          │
│  │  ├─ Fetch POST /submit-writing                     │
│  │  ├─ Wait for response                              │
│  │  ├─ navigate("/test/speaking")                     │
│  │  └─ setIsSubmitting(false)                         │
│  │                                                     │
│  └─ UI Elements                                        │
│     ├─ Essay textareas                                │
│     ├─ Submit button (disabled when isSubmitting)     │
│     ├─ Modal with submit confirmation                 │
│     └─ "Submitting..." text                           │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP Request
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Server Side (Node.js/Express)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  POST /api/test-sessions/submit-writing               │
│  ├─ Receive request body                              │
│  ├─ Validate input (participant, name, answers)       │
│  ├─ Verify name matches database                      │
│  │                                                     │
│  ├─ Call scoreCalculator.js                           │
│  │  ├─ calculateWritingScore(answers)                 │
│  │  ├─ Count Task 1 words                             │
│  │  ├─ Count Task 2 words                             │
│  │  ├─ Check minimums (150/250)                       │
│  │  └─ Return score data                              │
│  │                                                     │
│  ├─ Update database                                   │
│  │  ├─ test_participants.is_writing_scored = 1        │
│  │  ├─ test_participants.writing_score = 0            │
│  │  └─ test_participants.updated_at = NOW()           │
│  │                                                     │
│  └─ Send response                                      │
│     ├─ Status: 200 OK                                 │
│     ├─ Message: Success                               │
│     └─ Score data: task_1_words, task_2_words, etc.   │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP Response
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Client Side - After Submission                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Response Handler:                                     │
│  ├─ Check response status (200)                        │
│  ├─ Parse JSON response                               │
│  ├─ Log success message                               │
│  ├─ Clear modal                                        │
│  └─ Navigate to speaking section                      │
│                                                         │
│  Error Handler:                                        │
│  ├─ Show alert with error message                      │
│  ├─ Keep form active                                   │
│  ├─ Allow user to retry                               │
│  └─ Don't navigate away                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Text Normalization Process

```
┌──────────────────────────────────────────────────┐
│ USER INPUT vs NORMALIZED COMPARISON              │
└──────────────────────────────────────────────────┘

SCENARIO 1: Different Cases
  answers.json:
    "FREEZER"

  User enters:
    "freezer"

  normalizeText("freezer"):
    .trim()              → "freezer"
    .toUpperCase()       → "FREEZER"
    .replace(/\s+/g," ") → "FREEZER"

  Comparison:
    "FREEZER" === "FREEZER" ✓ MATCH

SCENARIO 2: Extra Whitespace
  answers.json:
    "FREEZER DOOR"

  User enters:
    "  Freezer  Door  "

  normalizeText("  Freezer  Door  "):
    .trim()              → "Freezer  Door"
    .toUpperCase()       → "FREEZER  DOOR"
    .replace(/\s+/g," ") → "FREEZER DOOR"

  Comparison:
    "FREEZER DOOR" === "FREEZER DOOR" ✓ MATCH

SCENARIO 3: No Normalization Needed
  answers.json:
    "CORRECT"

  User enters:
    "CORRECT"

  normalizeText("CORRECT"):
    .trim()              → "CORRECT"
    .toUpperCase()       → "CORRECT"
    .replace(/\s+/g," ") → "CORRECT"

  Comparison:
    "CORRECT" === "CORRECT" ✓ MATCH

SCENARIO 4: Wrong Answer
  answers.json:
    "FREEZER"

  User enters:
    "friezer"

  normalizeText("friezer"):
    .trim()              → "friezer"
    .toUpperCase()       → "FRIEZER"
    .replace(/\s+/g," ") → "FRIEZER"

  Comparison:
    "FRIEZER" === "FREEZER" ✗ NO MATCH
```

---

**Architecture Document Complete** ✅

Generated: December 18, 2025
Status: Ready for Implementation
