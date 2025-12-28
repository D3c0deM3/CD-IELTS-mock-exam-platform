# Next Steps: Complete Test Materials Integration

## Overview

The "Test Materials" dropdown is now in the Admin Dashboard session creation form. Admins can select which mock to use for each session. However, to make this **fully functional**, we need to update the participant-facing components to use the selected materials.

## What Still Needs to Be Done

### Current State

- ✅ Admin selects test materials when creating session
- ✅ Materials ID stored in session's admin_notes field (format: `[MOCK_ID:2]`)
- ❌ Participants still get content from test_id, not test_materials_id
- ❌ Scoring still uses test_id from database

### Phase 2: Update Participant Data Loading

The participant flow needs to change from:

```
test_id (database) → questions, audio, answers
```

To:

```
test_materials_id (from admin_notes) → questions, audio, answers
```

### Detailed Changes Needed

## 1. Extract test_materials_id from Session

**When**: When participant checks in or loads test
**Where**: ListeningStarter.js, participant check-in components

**Current Code Pattern**:

```javascript
const testId = localStorage.getItem("test_id");
const mockJson = testId === "2" ? mock_2 : testId === "3" ? mock_3 : mock_2;
```

**New Pattern**:

```javascript
// Get participant session data
const participantSession = await sessionService.getParticipantSession(
  participantId
);
// Extract from admin_notes: "[MOCK_ID:2] notes" → 2
const mockIdMatch = participantSession.admin_notes?.match(/\[MOCK_ID:(\d+)\]/);
const test_materials_id = mockIdMatch ? parseInt(mockIdMatch[1]) : 2;
localStorage.setItem("test_materials_id", test_materials_id);
```

## 2. Update Audio Loading (audioService.js)

**Current Implementation**:

```javascript
const getAudioFileForTest = (testId) => {
  const audioMap = {
    2: listening_test,
    3: listening_test3,
  };
  return audioMap[testId] || listening_test;
};
```

**Needed Change**:

- Accept `test_materials_id` instead of `test_id`
- Use it to select correct audio file
- Could auto-detect from localStorage as fallback

**Updated Function**:

```javascript
const getAudioFileForTest = (test_materials_id) => {
  const test_materials_id =
    test_materials_id ||
    parseInt(localStorage.getItem("test_materials_id")) ||
    2;
  const audioMap = {
    2: listening_test,
    3: listening_test3,
    4: listening_test4, // if exists
  };
  return audioMap[test_materials_id] || listening_test;
};
```

## 3. Update Question Loading (ListeningTestDashboard.js)

**Current Implementation**:

```javascript
const loadQuestions = (testId) => {
  const questionsData =
    testId === "2" ? mock_2 : testId === "3" ? mock_3 : mock_2;
  // ... rest of loading logic
};
```

**Needed Change**:

- Use `test_materials_id` from session instead of `test_id`
- Load corresponding mock_N.json file

**Updated Approach**:

```javascript
const test_materials_id =
  parseInt(localStorage.getItem("test_materials_id")) || 2;
const questionsMap = {
  2: mock_2,
  3: mock_3,
  4: mock_4, // if exists
};
const questionsData = questionsMap[test_materials_id] || mock_2;
```

## 4. Update Answer Key Loading (scoreCalculator.js)

**Current Implementation**:

```javascript
const loadAnswersKey = (testId) => {
  if (testId === "2") return answers;
  if (testId === "3") return answers_3;
  return answers;
};
```

**Needed Change**:

- Extract `test_materials_id` from session admin_notes
- Load correct answer file

**Updated Implementation**:

```javascript
const loadAnswersKey = (test_materials_id) => {
  const answerMap = {
    2: answers,
    3: answers_3,
    4: answers_4, // if exists
  };
  return answerMap[test_materials_id] || answers;
};
```

## 5. Update Scoring Endpoints (Backend)

**Routes to Update**:

- `/api/participant/:id/submit-listening`
- `/api/participant/:id/submit-reading`

**Current Logic**:

```javascript
const session = await getSession(sessionId);
const { test_id } = session;
const score = calculateListeningScore(userAnswers, test_id);
```

**Needed Logic**:

```javascript
const session = await getSession(sessionId);
// Extract test_materials_id from admin_notes: "[MOCK_ID:2]" → 2
const mockIdMatch = session.admin_notes?.match(/\[MOCK_ID:(\d+)\]/);
const test_materials_id = mockIdMatch ? parseInt(mockIdMatch[1]) : 2;
const score = calculateListeningScore(userAnswers, test_materials_id);
```

## Implementation Order

### Step 1: Create Helper Function (Backend)

Add utility function to extract mock ID from admin_notes:

```javascript
// In a util or helper file
const extractMockIdFromNotes = (adminNotes) => {
  if (!adminNotes) return 2;
  const match = adminNotes.match(/\[MOCK_ID:(\d+)\]/);
  return match ? parseInt(match[1]) : 2;
};
```

### Step 2: Update Audio Service

- Modify `getAudioFileForTest()` to use `test_materials_id`
- Add fallback to localStorage

### Step 3: Update Question Loading

- Modify ListeningTestDashboard.js to use `test_materials_id`
- Update mock file selection logic

### Step 4: Update Answer Loading

- Modify scoreCalculator.js to use `test_materials_id`
- Update answer key selection logic

### Step 5: Update Scoring Routes

- Modify submit-listening and submit-reading routes
- Extract `test_materials_id` from session
- Pass to calculation functions

### Step 6: Test End-to-End

- Create session with Mock 2 materials
- Create session with Mock 3 materials
- Verify participants get correct audio/questions/answers for each

## Testing Checklist for Phase 2

When implementing the above changes:

- [ ] Session check-in extracts test_materials_id correctly
- [ ] Audio loader selects correct file based on test_materials_id
- [ ] Questions load from correct mock_N.json
- [ ] Answer validation uses correct answers_N.json
- [ ] Scoring endpoint extracts test_materials_id from admin_notes
- [ ] Test 2 session participant gets all Mock 2 content
- [ ] Test 3 session participant gets all Mock 3 content
- [ ] Scores are calculated against correct answer key
- [ ] No syntax errors in modified files
- [ ] Browser console shows no errors

## Code Changes Needed Summary

| Component           | File                      | Current               | New                               | Status   |
| ------------------- | ------------------------- | --------------------- | --------------------------------- | -------- |
| Audio Loading       | audioService.js           | Uses test_id          | Use test_materials_id             | ⏳ To Do |
| Questions           | ListeningTestDashboard.js | Uses test_id          | Use test_materials_id             | ⏳ To Do |
| Answers             | scoreCalculator.js        | Uses test_id          | Use test_materials_id             | ⏳ To Do |
| Scoring Routes      | testSessions.js           | Uses session.test_id  | Extract from admin_notes          | ⏳ To Do |
| Participant Checkin | Various                   | Not passing materials | Extract & store test_materials_id | ⏳ To Do |

## Current Architecture vs. New Architecture

### Current (Incomplete)

```
Admin Dashboard
    ↓ (selects materials)
Session (admin_notes: "[MOCK_ID:2]")
    ↓
Participant Check-in
    ↓ (uses test_id from database)
Loads Mock 2 questions? No, loads based on database test_id
Scores? Against database test_id answer key
```

### After Phase 2 (Complete)

```
Admin Dashboard
    ↓ (selects materials)
Session (admin_notes: "[MOCK_ID:2]")
    ↓
Participant Check-in
    ↓ (extracts test_materials_id: 2 from admin_notes)
localStorage.test_materials_id = 2
    ↓
audioService uses test_materials_id → correct audio file
ListeningTestDashboard uses test_materials_id → correct questions
scoreCalculator uses test_materials_id → correct answer key
    ↓ (Submit answers)
Backend extracts test_materials_id from session admin_notes
Scores against correct answer key
```

## Backward Compatibility

The changes should maintain backward compatibility:

- If test_materials_id not found in admin_notes, default to 2 (Mock 2)
- If test_materials_id not in localStorage, fall back to 2
- Existing sessions created before this feature won't have the [MOCK_ID:X] prefix, but will still work with default

## Questions About Implementation?

Refer to:

- [TEST_MATERIALS_IMPLEMENTATION.md](TEST_MATERIALS_IMPLEMENTATION.md) - Current implementation details
- [TEST_MATERIALS_QUICK_TEST.md](TEST_MATERIALS_QUICK_TEST.md) - Testing the current dropdown
- Individual file comments for specific component logic
