# Test Materials Dropdown - Quick Testing Guide

## What Was Implemented

A new "Test Materials" dropdown has been added to the session creation form in the Admin Dashboard. This allows admins to select which mock test materials (mock files) should be used for each session.

## Testing Steps

### Step 1: Start Your Application

```bash
# Terminal 1 - Backend
npm run dev
# or
node server.js

# Terminal 2 - Frontend
cd client
npm start
```

### Step 2: Open Admin Dashboard

1. Navigate to Admin Dashboard login
2. Login with admin credentials

### Step 3: Create a Test Session

1. Click **"Create Session"** button
2. You should see the Create Test Session modal with:
   - ✅ Test dropdown
   - ✅ **Test Materials dropdown** (NEW!)
   - ✅ Session Date & Time field
   - ✅ Location field

### Step 4: Verify Test Materials Dropdown

1. Click on "Test Materials" dropdown
2. You should see options:
   - "Mock 2 - Authentic Test 1"
   - "Mock 3 - Authentic Test 2"
   - (More options if additional mock files exist)

### Step 5: Create Session with Materials Selection

1. Select a Test from the Test dropdown
2. **Select Test Materials from the new dropdown** ← Key Step!
3. Enter Session Date & Time
4. Enter Location
5. Click "Create"
6. Verify session is created successfully

### Step 6: Verify in Database (Optional)

Check the test_sessions table to see the materials ID stored in admin_notes:

```sql
SELECT id, test_id, admin_notes FROM test_sessions ORDER BY id DESC LIMIT 1;
```

Expected admin_notes format:

- `[MOCK_ID:2] any notes here` (if notes added)
- `[MOCK_ID:3]` (if no notes)

## Expected Behavior

### ✅ Correct Behavior:

- Dropdown appears and is populated with materials
- Can select different materials for each session
- Form validates that materials are selected (won't submit without selection)
- Session creation succeeds and materials ID is stored
- Subsequent sessions can be created with different materials

### ❌ Issues to Watch For:

- Dropdown doesn't appear → Check browser console for errors
- Dropdown is empty → Check that answers\_\*.json files exist in server/routes/
- Form won't submit even with materials selected → Check validation logic
- Error fetching materials → Check backend console for API errors

## Browser Console Debugging

### Open Developer Tools (F12) and check Console tab:

#### Good Response:

```
Failed to fetch test materials: [should NOT see this]
Test materials fetched: Array(2)
  0: {mock_id: 2, name: "Mock 2 - Authentic Test 1", file: "answers.json"}
  1: {mock_id: 3, name: "Mock 3 - Authentic Test 2", file: "answers_3.json"}
```

#### If You See Errors:

```
Failed to fetch test materials: TypeError: response.materials is not iterable
→ May indicate API response structure issue
```

## Backend Verification

### Check if endpoint works:

```bash
# In your terminal, with the backend running:
curl http://localhost:5000/api/admin/test-materials

# Expected response:
{
  "materials": [
    {"mock_id": 2, "name": "Mock 2 - Authentic Test 1", "file": "answers.json"},
    {"mock_id": 3, "name": "Mock 3 - Authentic Test 2", "file": "answers_3.json"}
  ]
}
```

### Check Backend Logs:

When creating a session, backend logs should show:

```
POST /api/admin/sessions
Body: {
  test_id: "1",
  test_materials_id: 2,
  session_date: "2024-01-15T10:00",
  location: "Room 101",
  ...
}
```

## Common Issues & Solutions

### Issue 1: Dropdown not showing

**Solution**:

- Check browser console (F12)
- Verify backend is running at correct port
- Check network tab in DevTools to see if /api/admin/test-materials returns 200 OK

### Issue 2: Dropdown empty

**Solution**:

- Verify `answers.json` and `answers_3.json` exist in `server/routes/`
- Check backend logs for file system errors
- Manually test endpoint: `curl http://localhost:5000/api/admin/test-materials`

### Issue 3: "All fields are required" even with dropdown selected

**Solution**:

- Check browser console for any JavaScript errors
- Verify dropdown value is being captured in sessionForm state
- Open DevTools Console and type: `console.log(sessionForm.test_materials_id)` to check if value is set

### Issue 4: Session creation fails

**Solution**:

- Check backend console for database errors
- Verify test_id is valid
- Look for 400/500 errors in network tab
- Check that POST /api/admin/sessions endpoint exists

## Next Steps for Full Integration

The current implementation allows admins to **select** test materials. To make it functional end-to-end, the following components still need updating:

1. **Participant Flow**: When participants check in, retrieve the test_materials_id from their session
2. **Question Loading**: Use test_materials_id to load correct mock_N.json
3. **Audio Loading**: Use test_materials_id to load correct listening_test_N.mp3
4. **Scoring**: Use test_materials_id to load correct answers_N.json for validation

These changes will ensure that when you select "Mock 3" for a session, all participants in that session get Mock 3's content and are scored against Mock 3's answer key.

## Quick Reference

| Component            | File                                | Status        |
| -------------------- | ----------------------------------- | ------------- |
| Backend API endpoint | server/routes/admin.js              | ✅ Ready      |
| Session storage      | server/routes/admin.js              | ✅ Ready      |
| Frontend service     | client/src/services/adminService.js | ✅ Ready      |
| Admin dropdown       | client/src/pages/AdminDashboard.js  | ✅ Ready      |
| Participant loading  | To be updated                       | ⏳ Next Phase |
| Scoring integration  | To be updated                       | ⏳ Next Phase |

## Questions?

Check these files for implementation details:

- [TEST_MATERIALS_IMPLEMENTATION.md](TEST_MATERIALS_IMPLEMENTATION.md) - Full technical details
- [server/routes/admin.js](server/routes/admin.js#L88-L150) - Backend endpoint
- [client/src/pages/AdminDashboard.js](client/src/pages/AdminDashboard.js#L1480) - UI dropdown
