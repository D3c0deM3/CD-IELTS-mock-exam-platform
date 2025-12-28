# Detailed Change Log - Multi-Test Implementation

## Summary of Changes

**Total Files Modified:** 6
**Total Files Created:** 2
**Total Lines Changed:** ~150 lines modified + ~106 lines created

---

## MODIFIED FILES

### 1. `client/src/services/audioService.js`

**Line 5-7: Import Statement**

```javascript
// BEFORE:
import listeningAudio from "../pages/listening_test.mp3";

// AFTER:
import listeningAudio from "../pages/listening_test.mp3";
import listeningAudio3 from "../pages/listening_test3.mp3";
```

**Line 12-14: New Variables**

```javascript
// ADDED:
let currentTestId = null;

// (isPreloading and preloadPromise already existed)
```

**Line 18-35: New Helper Function**

```javascript
// ADDED:
/**
 * Get the audio file URL for a specific test
 * @param {number} testId - The test ID (2, 3, etc.)
 * @returns {string} - The audio file URL
 */
const getAudioFileForTest = (testId) => {
  switch (testId) {
    case 2:
      return listeningAudio;
    case 3:
      return listeningAudio3;
    default:
      console.warn(
        `No audio file found for test ${testId}, defaulting to listening_test.mp3`
      );
      return listeningAudio;
  }
};
```

**Line 37-99: Updated preloadAudio Function**

```javascript
// BEFORE signature:
export const preloadAudio = async () => {
  if (isPreloading) { ... }
  if (audioCache && audioDuration) { ... }

// AFTER signature:
export const preloadAudio = async (testId) => {
  // NEW: Determine which test to load
  let test = testId;
  if (!test) {
    try {
      const participant = JSON.parse(
        localStorage.getItem("currentParticipant") || "{}"
      );
      test = participant.test_id || 2;
    } catch {
      test = 2;
    }
  }

  // NEW: Check for test-specific caching
  if (isPreloading && currentTestId === test) { ... }
  if (audioCache && audioDuration && currentTestId === test) { ... }

  isPreloading = true;
  currentTestId = test;  // NEW: Track current test

  preloadPromise = new Promise((resolve, reject) => {
    try {
      const audio = new Audio();
      audio.controlsList = "nodownload";
      audio.crossOrigin = "anonymous";

      // NEW: Get the correct audio file for this test
      const audioUrl = getAudioFileForTest(test);

      const handleLoadedMetadata = () => {
        audioDuration = audio.duration;
        audioCache = audio;
        isPreloading = false;

        // ... existing listener removal code ...

        // NEW: Test-specific logging
        console.log(
          `✓ Audio for test ${test} preloaded successfully. Duration: ${audioDuration.toFixed(
            2
          )}s`
        );

        resolve({
          duration: audioDuration,
          audio: audio,
        });
      };

      const handleError = (e) => {
        isPreloading = false;
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("error", handleError);

        // NEW: Test-specific logging
        console.error(
          `✗ Audio loading error for test ${test}:`,
          e.type,
          "Source:",
          audioUrl
        );
        reject(new Error(`Failed to load audio: ${e.type}`));
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
      audio.addEventListener("error", handleError, { once: true });

      // NEW: Use getAudioFileForTest to determine audio URL
      audio.src = audioUrl;
      audio.load();
    } catch (err) {
      isPreloading = false;
      console.error("✗ Audio preload exception:", err);
      reject(err);
    }
  });

  return preloadPromise;
};
```

**Line 266-273: Updated clearAudioCache Function**

```javascript
// BEFORE:
export const clearAudioCache = () => {
  if (audioCache) {
    audioCache.pause();
    audioCache.src = "";
  }
  audioCache = null;
  audioDuration = null;
};

// AFTER:
export const clearAudioCache = () => {
  if (audioCache) {
    audioCache.pause();
    audioCache.src = "";
  }
  audioCache = null;
  audioDuration = null;
  currentTestId = null; // NEW
  isPreloading = false; // NEW
  preloadPromise = null; // NEW
};
```

---

### 2. `client/src/pages/ListeningStarter.js`

**Lines 72-85: Updated Audio Preload useEffect**

```javascript
// BEFORE:
useEffect(() => {
  const preloadTestAudio = async () => {
    try {
      await audioService.preloadAudio();
      console.log("Audio preloaded successfully during starter screen");
    } catch (err) {
      console.error("Failed to preload audio:", err);
    }
  };

  preloadTestAudio();

  return () => {
    audioService.clearAudioCache();
  };
}, []);

// AFTER:
useEffect(() => {
  const preloadTestAudio = async () => {
    try {
      // NEW: Get test_id from participant data stored in localStorage
      const participant = JSON.parse(
        localStorage.getItem("currentParticipant") || "{}"
      );
      const testId = participant.test_id || 2; // Default to test 2

      await audioService.preloadAudio(testId);
      console.log(
        `Audio for test ${testId} preloaded successfully during starter screen`
      );
    } catch (err) {
      console.error("Failed to preload audio:", err);
    }
  };

  preloadTestAudio();

  return () => {
    audioService.clearAudioCache();
  };
}, []);
```

---

### 3. `client/src/pages/ListeningTestDashboard.js`

**Lines 1-10: Updated Imports**

```javascript
// BEFORE (Line 7):
import testDataJson from "./mock_2.json";

// AFTER (Lines 1-10):
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import API_CONFIG from "../config/api";
import audioService from "../services/audioService";
import "./ListeningTestDashboard.css";

// Import all available test data files for dynamic loading
import testData2 from "./mock_2.json";
import testData3 from "./mock_3.json";
```

**Lines 1814-1853: Updated Test Data Loading useEffect**

```javascript
// BEFORE:
useEffect(() => {
  try {
    const listeningSection = testDataJson.sections.find(
      (s) => s.type === "listening"
    );

    if (listeningSection) {
      setTestData({
        type: "listening",
        parts: listeningSection.parts,
      });
    } else {
      console.error("No listening section found in test data");
    }
  } catch (error) {
    console.error("Error loading test data:", error);
  } finally {
    setLoading(false);
  }
}, []);

// AFTER:
useEffect(() => {
  try {
    // NEW: Get test_id from participant data stored in localStorage
    const participant = JSON.parse(
      localStorage.getItem("currentParticipant") || "{}"
    );
    const testId = participant.test_id || 2; // Default to test 2

    // NEW: Select the correct test data based on test_id
    let selectedTestData;
    switch (testId) {
      case 2:
        selectedTestData = testData2;
        break;
      case 3:
        selectedTestData = testData3;
        break;
      default:
        console.warn(
          `No test data found for test ${testId}, defaulting to test 2`
        );
        selectedTestData = testData2;
    }

    const listeningSection = selectedTestData.sections.find(
      (s) => s.type === "listening"
    );

    if (listeningSection) {
      setTestData({
        type: "listening",
        parts: listeningSection.parts,
      });
    } else {
      console.error("No listening section found in test data");
    }
  } catch (error) {
    console.error("Error loading test data:", error);
  } finally {
    setLoading(false);
  }
}, []);
```

---

### 4. `server/utils/scoreCalculator.js`

**Lines 1-40: Updated loadAnswersKey Function**

```javascript
// BEFORE:
/**
 * Load the correct answers from answers.json
 * @returns {Object} The answers data
 */
const loadAnswersKey = () => {
  try {
    const answersPath = path.join(__dirname, "../routes/answers.json");
    const answersData = fs.readFileSync(answersPath, "utf8");
    return JSON.parse(answersData);
  } catch (error) {
    console.error("Error loading answers.json:", error);
    throw new Error("Failed to load answer key");
  }
};

// AFTER:
/**
 * Load the correct answers from the appropriate answers file based on test_id
 * @param {number} testId - The test ID (2 or 3 for now)
 * @returns {Object} The answers data
 */
const loadAnswersKey = (testId = 2) => {
  try {
    // NEW: Map test_id to answer file
    let answersFileName;
    switch (testId) {
      case 2:
        answersFileName = "answers.json";
        break;
      case 3:
        answersFileName = "answers_3.json";
        break;
      default:
        console.warn(`No answer file for test ${testId}, using answers.json`);
        answersFileName = "answers.json";
    }

    const answersPath = path.join(__dirname, "../routes", answersFileName);
    const answersData = fs.readFileSync(answersPath, "utf8");
    return JSON.parse(answersData);
  } catch (error) {
    console.error("Error loading answers file:", error);
    throw new Error("Failed to load answer key");
  }
};
```

**Lines 237-265: Updated calculateListeningScore Function**

```javascript
// BEFORE signature:
const calculateListeningScore = (userAnswers) => {
  try {
    const answersKey = loadAnswersKey();

// AFTER signature:
const calculateListeningScore = (userAnswers, testId = 2) => {
  try {
    const answersKey = loadAnswersKey(testId);
    // ... rest of function ...
    console.log(`Listening score calculation for test ${testId}: ${correctCount}/40 correct`);
    // (updated log message)
```

**Lines 279-307: Updated calculateReadingScore Function**

```javascript
// BEFORE signature:
/**
 * Calculate reading score and return both raw and band score
 * @param {Object} userAnswers - User's reading answers { question_number: answer }
 * @returns {Object} { rawScore, bandScore }
 */
const calculateReadingScore = (userAnswers) => {
  try {
    const answersKey = loadAnswersKey();

// AFTER signature:
/**
 * Calculate reading score and return both raw and band score
 * @param {Object} userAnswers - User's reading answers { question_number: answer }
 * @param {number} testId - The test ID (2 or 3 for now)
 * @returns {Object} { rawScore, bandScore }
 */
const calculateReadingScore = (userAnswers, testId = 2) => {
  try {
    const answersKey = loadAnswersKey(testId);
    // ... rest of function ...
    console.log(`Reading score calculation for test ${testId}: ${correctCount}/40 correct`);
    // (updated log message)
```

---

### 5. `server/routes/testSessions.js`

**Lines 433-498: Updated POST /api/test-sessions/submit-listening**

```javascript
// BEFORE:
router.post("/submit-listening", async (req, res) => {
  const { participant_id, full_name, listening_answers } = req.body;

  try {
    const [participantRows] = await db.execute(
      "SELECT id, full_name FROM test_participants WHERE id = ?",
      [participant_id]
    );

    // ...

    const { rawScore: listeningRawScore, bandScore: listeningBandScore } =
      calculateListeningScore(listening_answers);  // No test_id passed

    // ...
  }
});

// AFTER:
router.post("/submit-listening", async (req, res) => {
  const { participant_id, full_name, listening_answers } = req.body;

  try {
    // NEW: Get test_id from database
    const [participantRows] = await db.execute(
      "SELECT tp.id, tp.full_name, ts.test_id FROM test_participants tp JOIN test_sessions ts ON tp.session_id = ts.id WHERE tp.id = ?",
      [participant_id]
    );

    // NEW: Extract test_id
    const participant = participantRows[0];
    const testId = participant.test_id || 2; // Default to test 2 if not found

    // ... name verification ...

    // NEW: Pass test_id to calculateListeningScore
    const { rawScore: listeningRawScore, bandScore: listeningBandScore } =
      calculateListeningScore(listening_answers, testId);

    // ... save to database ...

    // NEW: Include test_id in response
    res.json({
      message: "Listening test submitted successfully",
      participant_id: participant.id,
      listening_raw_score: listeningRawScore,
      listening_band_score: listeningBandScore,
      total_questions: 40,
      test_id: testId,  // NEW
    });
  }
});
```

**Lines 498-562: Updated POST /api/test-sessions/submit-reading**

```javascript
// Same changes as above but for reading section
// - Updated SQL to join with test_sessions and get test_id
// - Extract testId from participant record
// - Pass testId to calculateReadingScore(reading_answers, testId)
// - Include test_id in response
```

---

## CREATED FILES

### 6. `server/routes/answers_3.json` (NEW FILE)

**Content:** Complete answer key for Authentic Test 2 (mock_3)

- 40 listening answers (questions 1-40)
- 40 reading answers (questions 1-40)
- Identical JSON structure to answers.json
- Total lines: ~106 lines

---

## DOCUMENTATION FILES (NEW)

### 7. `MULTI_TEST_IMPLEMENTATION_SUMMARY.md` (NEW FILE)

**Purpose:** Comprehensive documentation of the implementation
**Content:**

- Overview and architecture
- All files modified with detailed changes
- Data flow diagrams
- Test ID to file mappings
- How it works (admin and user perspective)
- Integration points
- Testing checklist
- Error handling
- Future enhancements

### 8. `MULTI_TEST_QUICK_TESTING_GUIDE.md` (NEW FILE)

**Purpose:** Quick reference guide for testing the feature
**Content:**

- What was implemented
- How the system works
- How to test each scenario
- File verification checklist
- Browser console logs to look for
- Troubleshooting guide
- Expected behavior
- Next steps

---

## SUMMARY BY FILE TYPE

### Frontend Changes (3 files)

1. `audioService.js` - Added test-aware audio loading
2. `ListeningStarter.js` - Pass test_id to audio preload
3. `ListeningTestDashboard.js` - Load correct test data based on test_id

### Backend Changes (2 files)

1. `scoreCalculator.js` - Test-aware answer validation
2. `testSessions.js` - Pass test_id to score calculator

### Data Files (1 file)

1. `answers_3.json` - Answer key for mock_3 (test 2)

### Documentation (2 files)

1. `MULTI_TEST_IMPLEMENTATION_SUMMARY.md`
2. `MULTI_TEST_QUICK_TESTING_GUIDE.md`

---

## DEPENDENCIES

### No New Dependencies Added

- All changes use existing Node.js/React features
- No npm packages required
- No breaking changes to existing code

### Backward Compatibility

- ✅ All changes default to test_id=2 if not provided
- ✅ Existing code paths still work
- ✅ No changes to API contracts (only additions)
- ✅ No changes to database schema

---

## Testing the Changes

### To Verify Audio Loading Works:

```javascript
// In browser console during listening starter:
localStorage.getItem("currentParticipant");
// Should show: { test_id: 2 (or 3), ... }
```

### To Verify Test Data Loads Correctly:

```javascript
// In browser during listening test load:
// Check Network tab for mock_2.json or mock_3.json request
// Check for console logs showing correct test data loaded
```

### To Verify Answer Validation Works:

```javascript
// In server logs when submitting answers:
// Should see: "Listening score calculation for test 2:" (or 3)
// Should load correct answer file (answers.json or answers_3.json)
```

---

## Rollback Instructions (If Needed)

If you need to revert these changes:

1. Revert `audioService.js` to use only `import listeningAudio from "..."`
2. Revert `ListeningStarter.js` to call `audioService.preloadAudio()` without parameters
3. Revert `ListeningTestDashboard.js` to import only `mock_2.json`
4. Revert `scoreCalculator.js` to use hardcoded `answers.json`
5. Revert `testSessions.js` to not pass test_id to score calculator
6. Delete `answers_3.json`

All changes are isolated and don't affect other parts of the system.

---

**Implementation Date:** 2024
**Status:** ✅ Complete and Ready for Testing
**Lines Changed:** ~250 lines total (including comments and structure)
