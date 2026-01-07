# Answer Persistence System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     IELTS Mock Test Platform                    │
│                   Answer Persistence System                     │
└─────────────────────────────────────────────────────────────────┘

                          ┌────────────────────┐
                          │  Browser Storage   │
                          │  (localStorage)    │
                          └────────────────────┘
                                    ▲
                                    │
                        ┌───────────┼───────────┐
                        │           │           │
                        │           │           │
                   Loads on     Saves on    Clears on
                    Mount        Change     Submission
                        │           │           │
                        ▼           │           ▼
        ┌──────────────────────────┼────────────────────┐
        │                          │                    │
        │                 useAnswersWithStorage Hook    │
        │                   Custom React Hook            │
        │   Returns: [answers, setAnswers]              │
        │                          │                    │
        └──────────────────────────┼────────────────────┘
                        ▲           │           ▲
                        │           │           │
        ┌───────────────┼───────────┴───────────┼──────────────────┐
        │               │                       │                  │
        │               ▼                       ▼                  │
    ┌───────────────┐ ┌──────────────────┐ ┌───────────────────┐
    │   Listening   │ │    Reading       │ │     Writing       │
    │  Test         │ │   Test           │ │    Test           │
    │  Dashboard    │ │   Dashboard      │ │   Dashboard       │
    │               │ │                  │ │                   │
    │ Questions:    │ │ Questions:       │ │ Tasks:            │
    │ 1-40          │ │ 1-40             │ │ 1, 2              │
    │               │ │                  │ │                   │
    │ Storage Key:  │ │ Storage Key:     │ │ Storage Key:      │
    │ "listening_   │ │ "reading_        │ │ "writing_         │
    │  answers"     │ │  answers"        │ │  answers"         │
    │               │ │                  │ │                   │
    └───────────────┘ └──────────────────┘ └───────────────────┘
        │                    │                       │
        │                    │                       │
        ▼                    ▼                       ▼
   User enters      User enters           User enters
   answers for      answers for           essays for
   gap-fill,        gap-fill,             tasks 1&2
   MCQ, T/F/NG      MCQ, T/F/NG
```

## Data Flow Diagram

### 1. Initial Page Load

```
User visits test page
         ↓
Component mounts
         ↓
useAnswersWithStorage hook initialized
         ↓
Try to load from localStorage[storageKey]
         ↓
    ┌────────────────────────┐
    │ Data exists?           │
    └────────┬──────┬────────┘
             │ YES  │ NO
             ▼      ▼
         ┌────┐  ┌──────┐
         │Load│  │Use   │
         │from│  │empty │
         │LS  │  │{}    │
         └─┬──┘  └──┬───┘
           │        │
           └────┬───┘
                │
                ▼
         Set initial state
                │
                ▼
         Display saved/empty answers
```

### 2. User Input

```
User types in answer field
         ↓
handleAnswerChange(questionId, value)
         ↓
setAnswers(prev => {...prev, [questionId]: value})
         ↓
State updates in React component
         ↓
useAnswersWithStorage detects change (useEffect)
         ↓
JSON.stringify(answers)
         ↓
localStorage.setItem(storageKey, JSON.string)
         ↓
Answer persisted to browser storage
```

### 3. Page Refresh

```
User refreshes page (F5 / Ctrl+R)
         ↓
Component unmounts
         ↓
Page reloads
         ↓
Component mounts again
         ↓
useAnswersWithStorage hook runs
         ↓
localStorage.getItem("listening_answers")
         ↓
JSON.parse(stored string)
         ↓
State restored with previous answers
         ↓
Component renders with restored data
         ↓
User sees all previous answers intact
```

### 4. Test Submission

```
User clicks "Submit Test"
         ↓
Confirmation dialog appears
         ↓
User confirms
         ↓
Answers sent to backend API
         ↓
    ┌──────────────────────┐
    │ Backend processes    │
    │ and stores answers   │
    └──────────────────────┘
         ↓
Server response received
         ↓
localStorage.removeItem(storageKey)
         ↓
    ┌──────────────────────┐
    │ Listening: Clear     │
    │ "listening_answers"  │
    │                      │
    │ OR Reading: Clear    │
    │ "reading_answers"    │
    │                      │
    │ OR Writing: Clear    │
    │ "writing_answers"    │
    └──────────────────────┘
         ↓
Navigate to next section
```

## Storage Key Mapping

```
Test Execution Flow
═══════════════════════════════════════════════════════════

START TEST
   ↓
   ├─→ /test/listening
   │   └─ Storage Key: "listening_answers"
   │   └─ Questions: 1-40
   │   └─ Submit to: /api/test-sessions/submit-listening
   │   └─ Clear localStorage after: YES
   │   └─ Navigate to: /test/reading
   │
   └─→ /test/reading
   │   └─ Storage Key: "reading_answers"
   │   └─ Questions: 1-40
   │   └─ Submit to: /api/test-sessions/submit-reading
   │   └─ Clear localStorage after: YES
   │   └─ Navigate to: /test/writing
   │
   └─→ /test/writing
   │   └─ Storage Key: "writing_answers"
   │   └─ Tasks: 1, 2
   │   └─ Submit to: /api/test-sessions/submit-writing
   │   └─ Clear localStorage after: YES
   │   └─ Navigate to: /test/end
   │
   └─→ /test/end
       └─ Test Complete
```

## Custom Hook Implementation Details

### useAnswersWithStorage Hook Location

```
client/
└── src/
    └── hooks/
        └── useAnswersWithStorage.js  ← Custom hook
            ├── Function: useAnswersWithStorage(storageKey, initialValue)
            ├── Returns: [answers, setAnswers]
            ├── Features:
            │   ├─ Load from localStorage on mount
            │   ├─ Save to localStorage on every change
            │   ├─ JSON serialization/deserialization
            │   ├─ Error handling for parse failures
            │   └─ Transparent to component
            └── Usage: const [answers, setAnswers] = useAnswersWithStorage("key")
```

### Hook Logic Flow

```
import useAnswersWithStorage from "../hooks/useAnswersWithStorage";

function TestComponent() {
  // Hook initialization
  const [answers, setAnswers] = useAnswersWithStorage("my_answers");
                                 │                    │
                                 │                    └─ Storage key name
                                 └─ Returns same interface as useState

  // Hook internally:
  // 1. useState() with initial value from localStorage
  // 2. useEffect() watching answers state
  // 3. Saves to localStorage whenever answers change
  // 4. Error handling with try/catch

  return (
    <input
      value={answers[questionId] || ""}
      onChange={(e) => setAnswers(prev => ({
        ...prev,
        [questionId]: e.target.value
      }))}
    />
  );
}
```

## Integration Points

### Before Integration

```javascript
const [answers, setAnswers] = useState({});
// ❌ No persistence across page refresh
```

### After Integration

```javascript
const [answers, setAnswers] = useAnswersWithStorage("listening_answers");
// ✅ Full persistence across page refresh
```

## Error Handling

```
useAnswersWithStorage Error Scenarios
════════════════════════════════════════

1. localStorage not available (private mode)
   └─ Use empty object, no errors thrown
   └─ Test continues to work normally

2. Corrupted JSON in localStorage
   └─ Try to parse
   └─ Catch error
   └─ Log error to console
   └─ Fall back to initialValue
   └─ User can start fresh

3. localStorage quota exceeded
   └─ setItem() throws
   └─ Error caught
   └─ Logged to console
   └─ App continues working
   └─ Data not persisted for that moment

4. Race conditions
   └─ useEffect dependency array ensures
      single source of truth
   └─ setAnswers() always triggers save
   └─ No stale data issues
```

## Verification Checklist

✅ Listening section answers persist  
✅ Reading section answers persist  
✅ Writing section answers persist  
✅ Each section has isolated storage key  
✅ Page refresh restores all answers  
✅ Multiple refreshes work correctly  
✅ Answers cleared after submission  
✅ No answers leak between sections  
✅ Graceful fallback on localStorage unavailable  
✅ Error handling for corrupted data  
✅ Works across browser restarts  
✅ Works in Chrome, Firefox, Safari, Edge  
✅ Works on desktop and mobile

## Performance Considerations

- **Storage Size**: Average test has 80-100 answers as strings

  - Estimated size: ~2-5 KB per test section
  - Well within localStorage limits (5-10 MB per domain)

- **Update Frequency**: Saves occur on each keystroke/selection

  - Browser handles efficiently
  - No noticeable UI lag
  - localStorage operations are synchronous but fast

- **Load Time**: On page load, localStorage read is instant
  - No delay before component renders
  - Answers available immediately on mount

## Future Enhancements (Optional)

1. IndexedDB for larger storage capacity
2. Automatic cloud backup to server
3. Answer history/undo functionality
4. Timed auto-save indicator
5. Sync across browser tabs
6. Export answers before submission
7. Draft recovery after accidental close
