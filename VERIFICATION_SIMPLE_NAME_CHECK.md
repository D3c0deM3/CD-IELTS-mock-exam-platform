# Session ID Verification - Simple Name Check

## How It Works

When a participant enters a session ID code, the system now verifies that the ID belongs to the person logged in on that device.

### The Flow

```
1. User logs in with their full name
   ↓
2. Full name stored in browser localStorage (as JSON in 'user')
   ↓
3. User enters participant ID code on Start Screen
   ↓
4. System sends: ID Code + Full Name to backend
   ↓
5. Backend checks:
   - Does this ID code exist? ✓
   - Does the participant's full name match the user's full name? ✓
   ↓
✅ Authorized → Check-in successful
❌ Unauthorized → Error: "This participant ID is not registered under your name"
```

## What Changed

### Backend (`server/routes/testSessions.js`)

**Check-in endpoint now:**

- Requires `full_name` parameter from frontend
- Looks up participant by ID code
- Compares participant's full_name with the name from user's device
- Returns 403 error if names don't match

**Can-start endpoint now:**

- Requires `full_name` as query parameter
- Verifies user's name matches participant's name before allowing test start
- Returns 403 error if unauthorized

### Frontend (`client/src/pages/StartScreen.js`)

**On form submit:**

- Gets user's full_name from localStorage (stored during login)
- Sends participant_id_code + full_name to backend
- Displays error if user not logged in or ID doesn't belong to them

### Frontend (`client/src/pages/PendingScreen.js`)

**When polling for admin to start test:**

- Retrieves user's full_name from localStorage
- Passes it with can-start check
- Only the correct user can receive the test start signal

### Frontend (`client/src/services/testSessionService.js`)

**Updated API calls:**

- `checkInParticipant(participant_id_code, full_name)`
- `canStartTest(participant_id_code, full_name)`

## Security Protection

| Scenario                          | What Happens                         |
| --------------------------------- | ------------------------------------ |
| User tries own ID with own name   | ✅ Check-in succeeds                 |
| User tries someone else's ID      | ❌ "Not registered under your name"  |
| Logout and try someone's ID       | ❌ No user in localStorage → Error   |
| Clear localStorage and try        | ❌ Can't get full_name → Check fails |
| Browser history used to guess IDs | ❌ Need correct full_name to succeed |

## Example

```
Scenario:
- Ali Khan is logged in on Device A
- ID: P12345001 is registered for Ali Khan
- Someone finds out Ali's test ID: P12345001

Attack attempt:
1. They try to use ID P12345001
2. But they're logged in as "Ahmed Malik"
3. Backend checks:
   - P12345001 exists? YES
   - Is full_name "Ahmed Malik"? NO (it's "Ali Khan")
4. Backend returns: 403 Unauthorized
   "This participant ID is not registered under your name"
5. ❌ Attack failed - only Ali can use Ali's ID
```

## No Configuration Needed

- Uses existing user data stored during login
- Automatic localStorage usage (already implemented)
- No database changes required
- No new dependencies

## Files Modified

1. `server/routes/testSessions.js` - Added name verification to check-in and can-start
2. `client/src/pages/StartScreen.js` - Send full_name with ID code
3. `client/src/pages/PendingScreen.js` - Send full_name when checking if test can start
4. `client/src/services/testSessionService.js` - Updated API calls to include full_name

## Testing

### Test 1: Correct user, own ID

- Login as "John Doe"
- Enter John's test ID
- ✅ Should check in successfully

### Test 2: Try someone else's ID

- Login as "John Doe"
- Try to use "Jane's" test ID
- ❌ Should show: "This participant ID is not registered under your name"

### Test 3: Not logged in

- Clear user from localStorage
- Try to check in
- ❌ Should show: "Please log in first before entering a test session"

### Test 4: Test start verification

- After check-in, wait for admin to start test
- Only the correct user will be able to start
- Wrong user stays on pending screen
