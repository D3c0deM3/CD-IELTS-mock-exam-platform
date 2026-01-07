# Answer Checker - User Guide

## For Administrators

### Accessing Answer Checker

1. **Open Admin Dashboard** → Session Monitor tab
2. **Select a Session** that has completed
3. **Click "Set Scores"** on any participant
4. **Modal will open with two tabs:**
   - **Scores Tab** (default): Enter writing and speaking scores
   - **Answers Tab**: Review all participant answers with correct/incorrect indicators

### Using the Answers Tab

#### View All Answers

- All listening and reading answers are displayed together
- Each answer card shows:
  - Question number
  - Section type (Listening/Reading)
  - User's answer
  - Correct answer (shown only if incorrect)
  - Visual indicator (✓ or ✗)

#### Understanding the Display

**Correct Answer** (Green Checkmark ✓)

```
Q1 | Listening | Your Answer: Freezer | ✓ Correct
```

**Incorrect Answer** (Red X ✗)

```
Q2 | Reading | Your Answer: True
                Correct Answer: False | ✗ Incorrect
```

#### Filter Options

Click any filter button to view specific answers:

| Filter          | Shows                             |
| --------------- | --------------------------------- |
| **All**         | All answers (listening + reading) |
| **✓ Correct**   | Only correct answers              |
| **✗ Incorrect** | Only incorrect answers            |
| **Listening**   | Only listening section answers    |
| **Reading**     | Only reading section answers      |

Example: Click "Listening" → "✗ Incorrect" to see only incorrect listening answers

#### Statistics

At the top of the Answer Checker:

- **Listening**: Shows correct/total count (e.g., "35/40")
- **Reading**: Shows correct/total count (e.g., "38/40")

### Workflow Example

1. Open Admin Dashboard
2. Select a completed test session
3. Find participant "Ahmed Ali" with score of 65
4. Click "Set Scores" button
5. **Review Answers Tab:**
   - See all 80 answers (40 listening + 40 reading)
   - Click "✗ Incorrect" filter to see only mistakes
   - Identify patterns in wrong answers
   - Provide feedback if needed
6. **Switch to Scores Tab:**
   - Enter Writing score: 7.5
   - Enter Speaking score: 8.0
   - Click "Save Scores"

## Technical Details

### Answer Storage

When a student submits their test:

- Each answer is compared against the correct answer key
- Normalization ensures fair comparison:
  - Case-insensitive (FREEZER = freezer)
  - Abbreviation handling (T = TRUE, F = FALSE)
  - Multiple spaces normalized (A B = A B)

### Answer Validation

✓ **Correct** (green) if:

- User answer matches correct answer (after normalization)

✗ **Incorrect** (red) if:

- User answer doesn't match correct answer
- User left answer blank

### Performance

- Answer data is loaded on-demand when Answers tab is clicked
- Scrollable interface for 80+ answers
- Efficient filtering with instant response

## Troubleshooting

### No Answers Showing

- **Issue:** Student may not have submitted test yet
- **Solution:** Check if test status is "completed"
- **Check:** Go to session monitor → check participant's "test_status"

### Answers Not Matching

- **Issue:** Partial credit showing as wrong
- **Expected Behavior:** IELTS uses exact matching, not partial credit
- **Note:** Writing and speaking require manual scoring (different tab)

### Incorrect Answer Display

- **Issue:** Correct answer shown differently than expected
- **Reason:** System normalizes both student and key answers
- **Example:** Student wrote "true" shows as "T" in comparison

## Data Stored

Each answer record includes:

- Student ID and name
- Session ID
- Question number
- Section type (Listening/Reading)
- Student's answer (exactly as submitted)
- Correct answer (from answer key)
- Correctness status (1 = correct, 0 = incorrect)
- Submission timestamp

## Answer Key Sources

Answer keys come from:

- Mock 2 (Default): `answers.json`
- Mock 3: `answers_3.json`
- Other mocks: `answers_X.json`

The system automatically selects the correct key based on the session's test materials.

## Notes for Admins

- Answer checker is **read-only** - answers cannot be edited
- If a student needs to retake a section, previous answers will be overwritten
- Use the statistics to identify common problem areas
- Filter "Incorrect" to quickly review challenging questions
- Keep answer review for record keeping and improvement tracking
