# Multi-Test System - Quick Testing Guide

## What Was Implemented

Your IELTS mock test system now supports **multiple tests** (mock_2 and mock_3). Admins can select which test to use when creating sessions, and everything else happens automatically:

- Correct audio loads
- Correct test questions display
- Correct answers are validated for scoring

## How the System Works Now

### Admin Side (No UI Changes Needed)

- When creating a session in Admin Dashboard, select the test from the dropdown
- When you click "Create Session", that test_id is saved to the database
- Register participants to that session - they automatically get that test

### User Side (Completely Transparent)

1. User checks in with their participant ID code
2. System retrieves which test they're assigned to
3. Everything else is automatic:
   - Listening intro video preloads correct audio
   - Listening test displays correct questions
   - Answers are validated against correct test's answer key

## How to Test

### Test Setup: Create Sessions for Each Test

#### Session 1: Mock 2 (Authentic Test 1)

```
Go to Admin Dashboard
→ Sessions tab
→ Create Test Session
→ Test: Select "Authentic test 1" (or similar name)
→ Session Date: Pick a date/time
→ Location: Any location
→ Max Capacity: 1 (for testing)
→ Click Create Session
```

#### Session 2: Mock 3 (Authentic Test 2)

```
Go to Admin Dashboard
→ Sessions tab
→ Create Test Session
→ Test: Select "Authentic test 2" (or similar name)
→ Session Date: Pick a different date/time
→ Location: Any location
→ Max Capacity: 1 (for testing)
→ Click Create Session
```

### Test Participant Registration

For each session, register a test participant:

```
Admin Dashboard → Sessions
→ Select the session
→ Register Participants
→ Add: Test User 1 (for mock_2 session)
→ Add: Test User 2 (for mock_3 session)
```

Or bulk register via CSV/list if your system supports it.

### Test the Listening Test

#### For Mock 2 (Authentic Test 1):

1. **Check In**

   - Go to start screen
   - Enter participant ID code for mock_2 participant
   - Enter full name: "Test User 1"
   - System should recognize the check-in

2. **Verify Audio is Correct**

   - Go to listening starter screen
   - Browser console: Should log "Audio for test 2 preloaded successfully"
   - Audio should be from `listening_test.mp3` (Authentic Test 1 audio)

3. **Verify Test Questions are Correct**

   - Click "Start Test"
   - You should see questions from mock_2.json (Authentic Test 1 questions)
   - Part 1: Should have 10 gap-filling questions from Test 1
   - Part 2: Should have multiple choice and matching questions from Test 1
   - Parts 3-4: Should have remaining questions from Test 1

4. **Verify Answers Validate Correctly**
   - Answer some questions (check mock_2.json or answers.json for correct answers)
   - For example, Question 1 should be "Freezer" (if it's the same as provided answers)
   - Submit the test
   - Backend should validate against answers.json (Test 1 answers)
   - Score should be calculated correctly

#### For Mock 3 (Authentic Test 2):

Repeat the same process but:

- Use "Test User 2" participant
- Audio should be `listening_test3.mp3`
- Questions should come from mock_3.json
- Answers should validate against answers_3.json
- For example, Question 1 should be "0491570156"

## Files to Verify

### Frontend Files

✅ `client/src/services/audioService.js` - Has `getAudioFileForTest()` function
✅ `client/src/pages/ListeningStarter.js` - Passes test_id to audioService
✅ `client/src/pages/ListeningTestDashboard.js` - Imports both mock_2.json and mock_3.json

### Backend Files

✅ `server/utils/scoreCalculator.js` - Has `loadAnswersKey(testId)` function
✅ `server/routes/testSessions.js` - Passes test_id when calculating scores
✅ `server/routes/answers_3.json` - File created with mock_3 answers

### Browser Console Logs to Look For

**During Listening Starter (intro video):**

```
Audio for test 2 preloaded successfully during starter screen
```

or

```
Audio for test 3 preloaded successfully during starter screen
```

**During Listening Dashboard load:**

```
[Console log about test data being loaded]
```

**During Answer Submission:**

```
Listening score calculation for test 2: X/40 correct
```

or

```
Listening score calculation for test 3: X/40 correct
```

## Troubleshooting

### Problem: Wrong audio plays

**Cause:** test_id not retrieved from localStorage
**Fix:** Check browser DevTools > Application > LocalStorage > "currentParticipant" key

- Should contain: `{ test_id: 2, full_name: "...", ... }`

### Problem: Wrong questions display

**Cause:** Test data not loading based on test_id
**Fix:** Check browser console for errors during test load

- Should see test data being loaded from correct JSON file

### Problem: Answers not validating correctly

**Cause:** Backend not receiving test_id or answer file missing
**Fix:**

- Check server/routes/answers_3.json exists
- Check server logs when submitting answers
- Should see "Listening score calculation for test X"

### Problem: Audio 404 error

**Cause:** Audio file doesn't exist or wrong path
**Fix:**

- Verify listening_test.mp3 and listening_test3.mp3 exist in client/src/pages/
- Check browser network tab for failed audio requests

## Expected Behavior

### Correct Behavior (Test Passes)

1. ✅ Admin can create sessions for mock_2 AND mock_3
2. ✅ Can register different participants to each session
3. ✅ Participant for mock_2 session gets Test 1 audio/questions/answers
4. ✅ Participant for mock_3 session gets Test 2 audio/questions/answers
5. ✅ Each participant's answers validate against their test's answer key
6. ✅ Scores are calculated correctly for each test

### This Should Work

- ✅ Multiple participants taking the same test simultaneously (all get correct audio/questions)
- ✅ Participants taking different tests in different sessions (each gets their test's materials)
- ✅ Admin switching between tests when creating sessions
- ✅ Audio preloading while intro video plays
- ✅ Test data loading when test starts

### This is NOT Changed

- ❌ Admin dashboard UI (no UI changes made - test selection was already there)
- ❌ User registration flow (still works the same)
- ❌ Session management (still works the same)
- ❌ Score calculation algorithm (still works the same, just with different answers)

## Next Steps

1. **Test locally** with both test 2 and test 3 participants
2. **Verify browser console** shows correct test IDs in logs
3. **Check localStorage** contains correct test_id from check-in
4. **Compare answers** between tests to ensure they're different
5. **Submit test answers** and verify scoring works for both tests

## Questions?

If something doesn't work:

1. Check browser console for JavaScript errors
2. Check server logs for backend errors
3. Verify localStorage has "currentParticipant" with test_id
4. Verify audio files exist in client/src/pages/
5. Verify answers_3.json exists in server/routes/

The implementation is complete and ready to test!
