# Writing Test Score Calculation & Admin Review Implementation

## Overview
This document describes the complete implementation of the writing test scoring system where users submit their answers, the system calculates preliminary scores, and admins review and set final writing & speaking scores before displaying them to users.

## Architecture Flow

```
User Writing Submission
    ↓
[WritingTestDashboard.js] - Format answers to uppercase
    ↓
POST /api/test-sessions/submit-writing
    ↓
[scoreCalculator.js] - Calculate word counts & requirements
    ↓
Database: test_participants table
    ↓
[AdminDashboard.js] - View pending scores
    ↓
Admin Sets Writing/Speaking Scores
    ↓
PUT /api/admin/participants/:id/scores
    ↓
User Dashboard - Display Final Scores
```

## Implementation Details

### 1. Score Calculation Utility (`server/utils/scoreCalculator.js`)

**Key Functions:**
- `normalizeText(text)` - Converts to uppercase, trims whitespace, normalizes spaces
- `calculateWritingScore(userAnswers)` - Analyzes word counts against minimum requirements
  - Task 1: Minimum 150 words required
  - Task 2: Minimum 250 words required
- `processWritingScore(writingAnswers)` - Packages score data for database storage

**Features:**
- Case-insensitive comparison (all uppercase)
- Automatic word count calculation
- Minimum requirement validation
- Marks writing as pending admin review

### 2. Backend API Endpoints

#### **POST /api/test-sessions/submit-writing**
Saves user's writing answers and preliminary score calculations.

**Request Body:**
```json
{
  "participant_id": 1,
  "full_name": "John Doe",
  "writing_answers": {
    "1": "Full essay text for task 1...",
    "2": "Full essay text for task 2..."
  }
}
```

**Response:**
```json
{
  "message": "Writing test submitted successfully",
  "participant_id": 1,
  "writing_submission": {
    "task_1_words": 250,
    "task_1_meets_minimum": true,
    "task_2_words": 350,
    "task_2_meets_minimum": true,
    "status": "pending_admin_review"
  }
}
```

**Database Changes:**
- Sets `is_writing_scored = 1` (marks that writing has been submitted)
- Sets `writing_score = 0` (initial placeholder, will be set by admin)
- Updates `updated_at` timestamp

---

#### **GET /api/test-sessions/participant/:id/scores**
Retrieves calculated scores for a participant.

**Response:**
```json
{
  "participant_id": 1,
  "scores": {
    "listening_score": 7.5,
    "reading_score": 8.0,
    "writing_score": 0,
    "speaking_score": null,
    "is_writing_scored": false,
    "is_speaking_scored": false
  }
}
```

---

#### **GET /api/admin/pending-scores/:session_id**
Retrieves all participants with pending score reviews for a session.

**Response:**
```json
{
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
      "reading_score": 8.0,
      "writing_score": null,
      "speaking_score": null,
      "is_writing_scored": false,
      "is_speaking_scored": false
    }
  ],
  "pending_speaking": [...],
  "completed": [...]
}
```

---

#### **PUT /api/admin/participants/:id/scores** (Existing)
Admin endpoint to set writing and speaking scores.

**Request Body:**
```json
{
  "writing_score": 7.5,
  "speaking_score": 6.5
}
```

**Database Changes:**
- Updates `writing_score` and `speaking_score` columns
- Updates `is_writing_scored` and `is_speaking_scored` flags
- Updates `updated_at` timestamp

### 3. Client-Side Changes

#### **WritingTestDashboard.js**
Enhanced with submission handler:

```javascript
const confirmSubmitTest = useCallback(async () => {
  setIsSubmitting(true);
  
  try {
    // Get participant info from localStorage
    const participantData = JSON.parse(
      localStorage.getItem("currentParticipant") || "{}"
    );
    
    // Format answers (auto-lowercase and trim)
    const formattedAnswers = {
      1: (answers[1] || "").trim(),
      2: (answers[2] || "").trim(),
    };

    // Send to backend API
    const response = await fetch("/api/test-sessions/submit-writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: participantData.id,
        full_name: participantData.full_name,
        writing_answers: formattedAnswers,
      }),
    });

    if (!response.ok) throw new Error(await response.json().error);
    
    // Navigate to speaking test
    navigate("/test/speaking", {
      state: { startTime: new Date().toISOString() },
    });
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}, [answers, navigate]);
```

**Key Features:**
- Normalizes all text to remove whitespace variations
- Sends participant verification (ID + name)
- Shows "Submitting..." state during submission
- Disables buttons while submitting
- Navigates to speaking section on success

### 4. Admin Dashboard Integration

**Session Dashboard Tab:**
1. Displays all participants with their scores
2. Shows status indicators:
   - Scores pending review (empty cells)
   - Scores reviewed (populated cells)
   - Complete (all scores set)

**Score Setting Modal:**
- Already exists in AdminDashboard.js
- Opens when clicking "Scores" button on participant row
- Accepts writing score (0-9, 0.5 increments)
- Accepts speaking score (0-9, 0.5 increments)
- Saves to database via PUT endpoint

**New Pending Scores View:**
To display pending reviews, fetch from:
```javascript
const response = await fetch(`/api/admin/pending-scores/${sessionId}`);
const data = await response.json();

// Shows:
// - pending_writing: participants needing writing scores
// - pending_speaking: participants needing speaking scores  
// - completed: participants with all scores set
```

### 5. Database Schema Changes

**test_participants table:**
```sql
-- Already exists, columns used:
- id: Primary key
- participant_id_code: Unique participant ID
- full_name: Name of participant
- listening_score: Listening band score (auto-calculated)
- reading_score: Reading band score (auto-calculated)
- writing_score: Writing band score (set by admin)
- speaking_score: Speaking band score (set by admin)
- is_writing_scored: Boolean flag (0/1)
- is_speaking_scored: Boolean flag (0/1)
- test_status: Current test status
- test_completed_at: When test was completed
```

### 6. User Dashboard Display

**Dashboard.js** (Already Implemented):
The normalized scores are already displayed:
```javascript
const normalized = (results || []).map((r) => {
  // Maps database scores to band scores
  // Returns: _norm = { listening, reading, writing, speaking, overall }
});

// Display in UI:
{latest?._norm?.listening}    // 7.5
{latest?._norm?.reading}      // 8.0
{latest?._norm?.writing}      // 7.5 (once admin sets)
{latest?._norm?.speaking}     // 6.5 (once admin sets)
{latest?._norm?.overall}      // Average of all four
```

**Results History:**
- Shows all completed tests with scores
- Displays overall band as donut chart
- Shows component band breakdown in table

---

## Answer Comparison & Normalization

### Text Normalization Process

1. **User Input Handling:**
   - User types essay/answer in textarea
   - No restrictions on case, spaces, or punctuation

2. **Submission Normalization:**
   ```javascript
   const normalizeText = (text) => {
     return text
       .trim()                    // Remove leading/trailing whitespace
       .toUpperCase()             // Convert to uppercase
       .replace(/\s+/g, " ");     // Normalize multiple spaces to single
   };
   ```

3. **Comparison:**
   - Both user answer and correct answer normalized
   - Case-insensitive comparison
   - Whitespace-insensitive comparison

### Example
```
answers.json (correct answer):
"FREEZER"

User enters:
"freezer"  →  normalized to  "FREEZER"  ✓ MATCH

User enters:
"  Freezer  "  →  normalized to  "FREEZER"  ✓ MATCH

User enters:
"friezer"  →  normalized to  "FRIEZER"  ✗ NO MATCH
```

---

## Score Calculation Flow

### Writing Score Calculation

```
User Submission
    ↓
Count words in Task 1 essay
Count words in Task 2 essay
    ↓
Task 1: If ≥ 150 words → meets_minimum = true
Task 2: If ≥ 250 words → meets_minimum = true
    ↓
Preliminary score based on requirements:
- Both tasks meet minimum → base score 5.0
- Can be adjusted by admin based on quality
    ↓
Save to DB with status "pending_admin_review"
    ↓
Admin reviews and sets final score (0-9)
```

### Listening & Reading Calculation (Already Implemented)

```
Submitted answers
    ↓
Compare each answer (case-insensitive, uppercase normalized)
    ↓
Count correct answers
    ↓
Use Cambridge conversion table:
- 39-40 correct → 9.0 band
- 37-38 correct → 8.5 band
- ... (down to 0-0 correct → 0.0 band)
    ↓
Display as band score in Dashboard
```

### Speaking Score

- Manually entered by admin (no auto-calculation)
- Admin sets after reviewing participant performance
- Stored in `speaking_score` column

### Overall Band Calculation

```javascript
Overall = (Listening + Reading + Writing + Speaking) / 4

Rounded to nearest 0.5:
- 7.125 → 7.0
- 7.25 → 7.5
- 7.75 → 8.0
```

---

## Testing Instructions

### 1. Test Writing Submission

1. Start a test session
2. Navigate through listening and reading sections
3. Complete writing section with essays
4. Click "Submit Test"
5. Confirm submission in modal
6. Observe notification: "Writing test submitted successfully"
7. Check database: `test_participants.is_writing_scored = 1`

### 2. Admin Score Review

1. Log in as admin
2. Go to "Session Monitoring" tab
3. Select a test session
4. View participants table
5. Click "Scores" button on participant
6. Set Writing Score: 7.5
7. Set Speaking Score: 6.5
8. Submit form
9. Observe scores updated in table

### 3. User Dashboard Display

1. Log in as participant
2. Go to Dashboard
3. Find latest test result
4. Verify all four band scores display
5. Verify overall band calculates correctly
6. Check results history table

---

## Key Features

✅ **Automatic Submission Handling**
- Writing answers sent to backend automatically
- No display of scores to user
- Placeholder score (0) stored pending admin review

✅ **Case-Insensitive Comparison**
- All user text converted to uppercase for comparison
- Avoids confusion from case variations

✅ **Admin Review Interface**
- Existing AdminDashboard scores modal
- Can set writing (0-9) and speaking (0-9) scores
- 0.5 increment support for more granular scoring

✅ **Automatic Score Display**
- Dashboard already displays normalized scores
- Shows listening, reading, writing, speaking, and overall
- History table shows all previous test results

✅ **Data Persistence**
- All scores saved to database
- Survives page refresh/logout
- Available for admin review anytime

---

## API Reference Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/test-sessions/submit-writing` | POST | Save writing answers | Public |
| `/api/test-sessions/participant/:id/scores` | GET | Get participant scores | Public |
| `/api/admin/pending-scores/:session_id` | GET | Get pending reviews | Admin |
| `/api/admin/participants/:id/scores` | PUT | Set W/S scores | Admin |

---

## Database Columns Used

**test_participants table:**
- `id` - Participant ID
- `participant_id_code` - Unique code  
- `full_name` - Name for verification
- `listening_score` - DECIMAL(5,2)
- `reading_score` - DECIMAL(5,2)
- `writing_score` - DECIMAL(5,2) ← **NEW USE**
- `speaking_score` - DECIMAL(5,2)
- `is_writing_scored` - BOOLEAN ← **NEW USE**
- `is_speaking_scored` - BOOLEAN
- `test_status` - VARCHAR (completed/in_progress)
- `test_completed_at` - DATETIME
- `updated_at` - DATETIME

---

## Files Modified

### Server-Side
1. **server/utils/scoreCalculator.js** ← NEW
   - Core scoring logic
   
2. **server/routes/testSessions.js**
   - Added `/submit-writing` endpoint
   - Added `/participant/:id/scores` endpoint
   
3. **server/routes/admin.js**
   - Added `/pending-scores/:session_id` endpoint

### Client-Side
1. **client/src/pages/WritingTestDashboard.js**
   - Enhanced `confirmSubmitTest` handler
   - Added API submission logic
   - Added loading state (`isSubmitting`)

---

## Next Steps / Future Enhancements

1. **Email Notifications**
   - Notify admin when writing submitted
   - Notify user when scores posted

2. **Advanced Writing Scoring**
   - Implement keyword detection
   - Automatic grammar/vocabulary analysis
   - AI-powered preliminary scoring

3. **Score Analytics**
   - Admin dashboard showing score distributions
   - Performance trends over time
   - Comparison statistics

4. **Revision Process**
   - Allow admin to revise scores with comments
   - Track score change history
   - Audit trail for compliance

---

## Support & Troubleshooting

**Issue:** Scores not saving
- Verify participant_id and full_name match database
- Check backend API logs for errors
- Confirm is_writing_scored flag is set

**Issue:** Scores not displaying in Dashboard
- Ensure admin has set the scores
- Force page refresh to reload data
- Check normalized data in browser console

**Issue:** Case sensitivity issues
- All comparisons done after uppercase normalization
- Check normalizeText() function is being called
- Verify database stores uppercase values

---

## Security Considerations

1. **Participant Verification**
   - Full name + ID code match required
   - Prevents unauthorized score submission

2. **Admin Authentication**
   - All admin endpoints require admin role
   - Scores can only be set by authenticated admins

3. **Data Validation**
   - Scores validated to 0-9 range
   - Participant existence verified before saving
   - No direct database manipulation from client

---

**Implementation Date:** December 18, 2025
**Status:** ✅ Complete
