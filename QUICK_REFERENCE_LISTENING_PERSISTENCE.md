# Quick Reference: Listening Test Persistence Features

## What's New in Listening Test

### ✨ Three-Level Persistence

```
BEFORE REFRESH          AFTER REFRESH
─────────────────────  ─────────────────────
Audio: 5:20       →    Audio: 5:20 ✅
Timer: 24:40      →    Timer: 24:40 ✅
Answers: Q1-Q15   →    Answers: Q1-Q15 ✅
```

---

## How Each Feature Works

### 1️⃣ Answer Persistence

- **What:** Text answers, multiple choice selections
- **When:** Saved on every keystroke/click
- **Where:** Browser's localStorage
- **Restore:** Automatic on page load

**Example Storage:**

```javascript
localStorage["listening_answers"] = {
  1: "Paris",
  2: "A",
  3: "true",
  // ... all answers
};
```

---

### 2️⃣ Audio Position Persistence

- **What:** Where the audio is playing (e.g., 5:20)
- **When:** Saved every 100-200ms as audio plays
- **Where:** Browser's localStorage
- **Restore:** Automatic, audio jumps to saved position

**Example Storage:**

```javascript
localStorage["listening_audio_state"] = {
  currentTime: 5.2,
  isPlaying: true,
  timestamp: "2026-01-07T10:30:45Z",
};
```

**User Experience:**

```
Audio playing at 5:20
     ↓ (refresh page)
Audio resumes at 5:20 ✅
```

---

### 3️⃣ Timer Persistence

- **What:** Remaining test time
- **When:** Saved every 1 second
- **Where:** Browser's localStorage
- **Restore:** Automatic, timer continues from saved value

**Example Storage:**

```javascript
localStorage["listening_timer"] = "1485"; // 24 min 45 sec
```

**User Experience:**

```
Timer showing 24:45
     ↓ (refresh page)
Timer shows 24:45 ✅ (and continues counting down)
```

---

## When Data Is Cleared

All saved data is automatically deleted when user **submits the test**.

```
Before Submission:
✓ listening_answers
✓ listening_audio_state
✓ listening_timer

After Successful Submission:
✗ All keys removed from localStorage
✗ Ready for next test session
```

---

## Technical Implementation

### Hooks Used

```javascript
// In ListeningTestDashboard.js

// Hook 1: Answer persistence (Phase 1)
const [answers, setAnswers] = useAnswersWithStorage("listening_answers");

// Hook 2: Audio persistence (Phase 2)
const audioState = useAudioPlaybackWithStorage("listening_audio_state");

// Hook 3: Timer persistence (Phase 2)
const [timeRemaining, setTimeRemaining] = useTimerWithStorage(
  30 * 60,
  "listening_timer"
);
```

### Files Changed

**Created:**

- `client/src/hooks/useAudioPlaybackWithStorage.js`
- `client/src/hooks/useTimerWithStorage.js`

**Modified:**

- `client/src/pages/ListeningTestDashboard.js`

---

## Testing It Out

### Test 1: Audio Resume

1. Start test
2. Audio plays to 2:30
3. Press **F5** (refresh)
4. ✅ Audio should resume at ~2:30

### Test 2: Timer Resume

1. Check timer: 30:00
2. Wait 5 minutes (timer → 25:00)
3. Press **F5**
4. ✅ Timer should show ~25:00

### Test 3: Answers Stay

1. Answer Q1-Q10
2. Press **F5**
3. ✅ All answers should still be there

### Test 4: Complete Flow

1. Audio at 4:00, Timer at 26:00, Answers Q1-Q15
2. Press **F5**
3. ✅ All THREE should be restored
4. Continue test for 2 more minutes
5. Press **F5** again
6. ✅ Audio ~6:00, Timer ~24:00, Answers Q1-Q17+

### Test 5: Submission Cleanup

1. Complete test
2. Click "Submit Test" and confirm
3. Open DevTools (F12) → Application → Storage → localStorage
4. ✅ These keys should be GONE:
   - `listening_answers`
   - `listening_audio_state`
   - `listening_timer`

---

## FAQ

**Q: Does audio volume get saved?**
A: Not currently. Volume control resets on refresh.

**Q: What if I clear browser cache?**
A: All persistence data will be lost. User starts fresh.

**Q: Does it work in private/incognito mode?**
A: localStorage is disabled, so no persistence. But test still works.

**Q: Does it sync across browser tabs?**
A: No. Each tab has its own separate localStorage.

**Q: What if localStorage is full?**
A: Very unlikely with modern browsers (5-10MB limit). Our data is ~200 bytes.

**Q: Does the server know about refreshes?**
A: No. Persistence is 100% client-side. Server only knows about final submission.

**Q: Will it work on mobile?**
A: Yes! Works on iOS Safari, Chrome Mobile, Samsung Internet, etc.

**Q: What happens if user closes browser while test is running?**
A: Data persists! Next time browser opens and page loads, data is still there.

---

## For Developers

### Hook Signatures

**useAnswersWithStorage**

```javascript
const [answers, setAnswers] = useAnswersWithStorage(storageKey);
// Returns: [answers, setAnswers]
```

**useAudioPlaybackWithStorage**

```javascript
const audioState = useAudioPlaybackWithStorage(storageKey);
// Returns: {
//   audioCurrentTime,
//   setAudioCurrentTime,
//   isPlayingStored,
//   setIsPlayingStored
// }
```

**useTimerWithStorage**

```javascript
const [timeRemaining, setTimeRemaining] = useTimerWithStorage(
  initialTime,
  storageKey
);
// Returns: [timeRemaining, setTimeRemaining]
```

### Adding to Other Tests

To add persistence to Reading or Writing tests:

```javascript
// 1. Import hooks
import useAnswersWithStorage from "../hooks/useAnswersWithStorage";
import useTimerWithStorage from "../hooks/useTimerWithStorage";

// 2. Replace useState with hooks
const [answers, setAnswers] = useAnswersWithStorage("reading_answers");
const [timeRemaining, setTimeRemaining] = useTimerWithStorage(
  60 * 60,
  "reading_timer"
);

// 3. Add cleanup after submission
localStorage.removeItem("reading_answers");
localStorage.removeItem("reading_timer");
```

---

## Key Points

✅ **Automatic** - No manual save button needed  
✅ **Transparent** - Users don't see localStorage logic  
✅ **Reliable** - Works across multiple refreshes  
✅ **Safe** - All data cleared after submission  
✅ **Fast** - No network calls, instant restore  
✅ **Backward Compatible** - Doesn't break existing functionality

---

## Storage Keys Reference

| Test      | Answers Key         | Audio Key               | Timer Key         |
| --------- | ------------------- | ----------------------- | ----------------- |
| Listening | `listening_answers` | `listening_audio_state` | `listening_timer` |
| Reading   | `reading_answers`   | -                       | `reading_timer`   |
| Writing   | `writing_answers`   | -                       | `writing_timer`   |

---

**Last Updated:** January 7, 2026  
**Status:** Ready for Production ✅
