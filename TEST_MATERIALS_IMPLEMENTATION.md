# Test Materials Dynamic Selection Implementation

## Overview

Implemented dynamic "Test Materials" dropdown in the session creation form. Admins can now select which mock test materials to use for each session, without needing to pre-create tests in the database.

## Problem Solved

- **Previous Issue**: When creating sessions, the system automatically used mock_2 regardless of which tests were created
- **Root Cause**: Session creation used test_id from database, but test materials were file-based (mock_2.json, mock_3.json)
- **Solution**: Added test_materials_id field that lets admins select from available mock files dynamically

## Changes Made

### 1. Backend: test-materials Endpoint (admin.js)

**Location**: `server/routes/admin.js` lines 88-150
**Endpoint**: `GET /api/admin/test-materials`
**Functionality**:

- Scans `server/routes/` directory for `answers_*.json` files
- Maps files to mock IDs:
  - `answers.json` → Mock 2 (Authentic Test 1)
  - `answers_3.json` → Mock 3 (Authentic Test 2)
  - `answers_N.json` → Mock N (Authentic Test N-1)
- Returns array of materials with structure: `[{mock_id, name, file}]`
- Fallback hardcoded list if file system read fails

**Response Example**:

```json
{
  "materials": [
    {
      "mock_id": 2,
      "name": "Mock 2 - Authentic Test 1",
      "file": "answers.json"
    },
    {
      "mock_id": 3,
      "name": "Mock 3 - Authentic Test 2",
      "file": "answers_3.json"
    }
  ]
}
```

### 2. Backend: Session Creation Updated (admin.js)

**Location**: `server/routes/admin.js` lines 280-316
**Changes**:

- Accepts `test_materials_id` parameter from frontend
- Stores material ID in `admin_notes` field with format: `[MOCK_ID:X] {original_notes}`
  - Example: `[MOCK_ID:2] Session notes here`
- Returns `test_materials_id` in response

**Database Change**: None required - uses existing admin_notes field

### 3. Frontend Service (adminService.js)

**Location**: `client/src/services/adminService.js`
**Changes**:

- Added `getTestMaterials()` function (lines 29-31)
  - Calls `GET /api/admin/test-materials`
  - Returns array of available materials
- Updated `createSession()` function to accept 6th parameter: `test_materials_id`
- Added exports for `getTestMaterials`

### 4. Frontend: AdminDashboard Component

**Location**: `client/src/pages/AdminDashboard.js`
**Changes**:

#### State Management:

- Added: `const [testMaterials, setTestMaterials] = useState([])`
- Updated sessionForm to include: `test_materials_id: 2` (default value)

#### Fetch Function:

- Added `fetchTestMaterials()` function (lines 165-174)
  - Calls adminService.getTestMaterials()
  - Handles response: `setTestMaterials(response.materials || response)`
  - Catches and displays errors

#### useEffect Hook:

- Updated initial useEffect (lines 50-60) to call `fetchTestMaterials()` on component mount
- Fetches alongside `fetchSessions()` and `fetchTests()`

#### Session Form UI:

- Added Test Materials dropdown (lines ~1480-1500)
  - Positioned after Test selection dropdown
  - Maps testMaterials array to `<option>` elements
  - Binds to `sessionForm.test_materials_id`
  - Shows mock names: "Mock 2 - Authentic Test 1", etc.

#### Validation:

- Updated `handleCreateSession()` to validate `test_materials_id` is selected
- Returns error "All fields are required" if missing

#### Session Creation Call:

- Updated to pass 6 parameters including `test_materials_id`
- Updated form reset to include: `test_materials_id: 2`

## How It Works

### For Admins:

1. Click "Create Session"
2. See two dropdowns:
   - **Test**: Select from tests in database (required for test configuration)
   - **Test Materials**: Select from available mock files (NEW!)
     - Options dynamically populated from available answer files
     - Shows "Mock 2 - Authentic Test 1", "Mock 3 - Authentic Test 2", etc.
3. Session is created with the selected materials ID stored in admin_notes

### For Participants:

1. Check in for session
2. System retrieves selected test_materials_id from session (from admin_notes)
3. Correct audio, questions, and answers load based on selected mock

## Technical Details

### File Structure Recognition:

```
server/routes/
├── answers.json       → Mock 2
├── answers_3.json     → Mock 3
├── answers_4.json     → Mock 4
└── listening_4.json   → (other audio files)

client/src/pages/
├── mock_2.json        → Question data for Mock 2
├── mock_3.json        → Question data for Mock 3
├── listening_test.mp3 → Audio for Mock 2
├── listening_test3.mp3→ Audio for Mock 3
└── answers.json       → Answer key for Mock 2
```

### Storage Format in Database:

```
admin_notes field: "[MOCK_ID:2] Session notes here"
admin_notes field: "[MOCK_ID:3]" (if no additional notes)
```

### Extraction Logic (for future use):

```javascript
const mockIdMatch = admin_notes.match(/\[MOCK_ID:(\d+)\]/);
const test_materials_id = mockIdMatch ? parseInt(mockIdMatch[1]) : 2;
```

## Next Steps to Complete Integration

To fully complete the implementation and ensure participants get the correct materials:

### 1. Update Frontend Components to Use test_materials_id:

- **ListeningStarter.js**: Get `test_materials_id` from participant session instead of `test_id`
- **ListeningTestDashboard.js**: Use `test_materials_id` to select mock\_\*.json file
- **audioService.js**: Update `preloadAudio()` to accept `test_materials_id` parameter
- **scoreCalculator.js**: Extract `test_materials_id` from session admin_notes

### 2. Update Backend Scoring:

- **testSessions.js**: When submitting answers, include mechanism to pass or extract `test_materials_id`
- **scoreCalculator.js**: Use `test_materials_id` to load correct answer key file
- Modify `/submit-listening` and `/submit-reading` routes to extract `test_materials_id` from session

### 3. Testing:

- Create multiple sessions with different test materials
- Verify each participant gets correct audio/questions/answers
- Verify answers are scored against correct answer key

## Files Modified

| File                                  | Lines                                         | Changes                                                         |
| ------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `server/routes/admin.js`              | 88-150, 280-316                               | Added test-materials endpoint, updated session creation         |
| `client/src/services/adminService.js` | 29-31, 55-70, 211                             | Added getTestMaterials method and export                        |
| `client/src/pages/AdminDashboard.js`  | 12, 38-39, 50-60, 165-174, 232-264, 1480-1510 | Added state, useEffect, fetch function, UI dropdown, validation |

## Verification Checklist

- ✅ Backend endpoint lists available test materials
- ✅ Frontend fetches test materials on component mount
- ✅ Session form displays test materials dropdown
- ✅ Admin can select test materials when creating session
- ✅ Session creation validates test_materials_id is selected
- ✅ test_materials_id stored in session admin_notes field
- ✅ No syntax errors in modified files
- ✅ Response handling accounts for API structure `{materials: [...]}`
- ⏳ Frontend components need update to use test_materials_id instead of test_id
- ⏳ Backend scoring needs to extract and use test_materials_id

## Admin Dashboard Preview

### Session Creation Modal:

```
┌─────────────────────────────────┐
│      Create Test Session        │
├─────────────────────────────────┤
│                                 │
│ Test *                          │
│ [Select a test          ▼]      │
│                                 │
│ Test Materials *                │
│ [Select test materials  ▼]      │  ← NEW FIELD
│  • Mock 2 - Authentic Test 1   │
│  • Mock 3 - Authentic Test 2   │
│                                 │
│ Session Date & Time *           │
│ [2024-01-15T10:00     ]         │
│                                 │
│ Location *                      │
│ [Building A, Room 101]          │
│                                 │
│ [Create] [Cancel]               │
└─────────────────────────────────┘
```

## Benefits

1. **No Database Changes**: Uses existing admin_notes field
2. **Dynamic Discovery**: Automatically finds available mock files
3. **Clear Admin UX**: Shows mock names and what tests they correspond to
4. **Flexible**: Easy to add new mocks (just upload new answer file)
5. **Per-Session Control**: Each session can use different materials
6. **Backward Compatible**: Falls back gracefully if files don't exist

## Summary

The implementation provides a clean, intuitive way for admins to select test materials when creating sessions. The frontend dynamically discovers available materials, presents them in a dropdown, and stores the selection with the session. The backend supports extraction of this selection for future use in participant scoring workflows.
