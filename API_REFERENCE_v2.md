# Admin Dashboard API Reference v2.0

## Base URL

```
http://localhost:5000/api/admin
```

All endpoints require authentication (JWT token in Authorization header)
All endpoints require admin role

---

## Test Configuration Management

### Set Test Section Durations

```
POST /tests/:id/config

Request:
{
  "listening_minutes": 40,      // OPTIONAL - defaults to 40
  "reading_minutes": 60,         // OPTIONAL - defaults to 60
  "writing_minutes": 60,         // OPTIONAL - defaults to 60
  "speaking_minutes": 15         // OPTIONAL - defaults to 15
}

Response (201):
{
  "message": "Test configuration updated successfully",
  "config": {
    "test_id": 1,
    "listening_minutes": 40,
    "reading_minutes": 60,
    "writing_minutes": 60,
    "speaking_minutes": 15,
    "total_minutes": 235          // IELTS standard: 40+60+60+60 min + 1 hour buffer = 220 minutes
  }
}

Errors:
- 400: Invalid durations (must be positive)
- 404: Test not found
- 500: Database error
```

### Get Test Configuration

```
GET /tests/:id/config

Response (200):
{
  "test_id": 1,
  "listening_minutes": 40,
  "reading_minutes": 60,
  "writing_minutes": 60,
  "speaking_minutes": 15,
  "total_minutes": 235
}

Note: Returns default values if not configured
```

---

## Participant Registration

### Register Single Participant

```
POST /sessions/:id/register-participant

Request:
{
  "full_name": "Ahmed Khan",        // REQUIRED - participant name
  "phone_number": "+1 234 567 8900" // REQUIRED - must exist in users table
}

Response (201):
{
  "message": "Participant registered successfully",
  "participant": {
    "id": 15,
    "participant_id_code": "P00015",
    "full_name": "Ahmed Khan",
    "phone_number": "+1 234 567 8900"
  }
}

Errors:
- 400: Missing fields or phone not found in system
- 400: Participant already registered for this session
- 404: Session not found
- 500: Database error
```

### Get Session Participants

```
GET /sessions/:id/participants

Response (200):
[
  {
    "id": 1,
    "participant_id_code": "P00001",
    "full_name": "Ahmed Khan",
    "phone_number": "+1 234 567 8900",
    "writing_score": null,
    "speaking_score": null,
    "has_entered_startscreen": false,
    "entered_at": null,
    "test_started": false,
    "test_started_at": null,
    "current_screen": "not_started",
    "test_status": "not_started",
    "last_activity_at": null,
    "created_at": "2025-12-14T10:30:00Z"
  },
  ...
]
```

---

## Score Management

### Set Writing & Speaking Scores

```
PUT /participants/:id/scores

Request:
{
  "writing_score": 7.5,   // REQUIRED - 0-9 (0.5 increments allowed)
  "speaking_score": 8.0   // REQUIRED - 0-9 (0.5 increments allowed)
}

Response (200):
{
  "message": "Scores updated successfully",
  "writing_score": 7.5,
  "speaking_score": 8.0
}

Errors:
- 400: Scores out of range (must be 0-9)
- 400: Missing scores
- 404: Participant not found
- 500: Database error
```

---

## Test Control - Individual Participant

### Pause Test for Participant

```
PATCH /sessions/:id/participants/:pid/pause

Request: {} (empty body)

Response (200):
{
  "message": "Test paused successfully",
  "participant_id": 15,
  "paused_at": "2025-12-14T14:15:30Z"
}

Effects:
- test_status → 'paused'
- paused_at → current timestamp
- Participant can be restarted

Errors:
- 400: Test already paused
- 404: Participant not found
```

### Restart Paused Test

```
PATCH /sessions/:id/participants/:pid/restart

Request: {} (empty body)

Response (200):
{
  "message": "Test restarted successfully",
  "participant_id": 15,
  "pause_duration_added": 5,     // minutes paused
  "total_pause_duration": 15     // cumulative pause time
}

Effects:
- Calculates pause duration (current time - paused_at)
- Adds to total_pause_duration
- test_status → 'in_progress'
- paused_at → NULL

Errors:
- 400: Test is not paused
- 404: Participant not found
```

### End Test for Participant

```
PATCH /sessions/:id/participants/:pid/end

Request: {} (empty body)

Response (200):
{
  "message": "Test ended successfully",
  "participant_id": 15,
  "test_completed_at": "2025-12-14T14:20:00Z"
}

Effects:
- test_status → 'completed'
- test_completed_at → current timestamp
- current_screen → 'results'
- Participant cannot continue testing

Errors:
- 404: Participant not found
```

---

## Test Control - Bulk Operations

### Start Test for All Participants

```
PATCH /sessions/:id/start-all

Request: {} (empty body)

Response (200):
{
  "message": "Test started for all entered participants",
  "updated_count": 45,                      // number of participants started
  "test_started_at": "2025-12-14T14:00:00Z",
  "test_end_at": "2025-12-14T17:40:00Z",   // calculated expiry time
  "total_minutes": 220                      // test duration
}

Effects (for each participant with has_entered_startscreen=true):
- test_started → 1
- test_started_at → current timestamp
- test_status → 'in_progress'
- current_screen → 'listening'

Session Effects:
- test_sessions.test_started_at → current timestamp
- test_sessions.test_end_at → calculated from test_config

Errors:
- 404: Session not found
```

### Pause All Active Tests

```
PATCH /sessions/:id/pause-all

Request: {} (empty body)

Response (200):
{
  "message": "All tests paused successfully",
  "paused_count": 42,                 // number of tests paused
  "paused_at": "2025-12-14T14:15:00Z"
}

Effects:
- Affects all participants with test_status = 'in_progress'
- test_status → 'paused'
- paused_at → current timestamp

Errors:
- None (returns 0 if none to pause)
```

### Restart All Paused Tests

```
PATCH /sessions/:id/restart-all

Request: {} (empty body)

Response (200):
{
  "message": "All tests restarted successfully",
  "restarted_count": 42
}

Effects:
- Processes each participant with test_status = 'paused'
- Calculates individual pause duration
- Updates total_pause_duration for each
- test_status → 'in_progress'
- paused_at → NULL

Errors:
- None (returns 0 if none to restart)
```

### End All Tests

```
PATCH /sessions/:id/end-all

Request: {} (empty body)

Response (200):
{
  "message": "All tests ended successfully",
  "ended_count": 45,
  "test_completed_at": "2025-12-14T17:45:00Z"
}

Effects:
- Affects all with test_status = 'in_progress' OR 'paused'
- test_status → 'completed'
- test_completed_at → current timestamp
- current_screen → 'results'

Errors:
- None (returns 0 if none to end)
```

---

## Dashboard & Statistics

### Get Session Dashboard with Stats

```
GET /sessions/:id/dashboard

Response (200):
{
  "session": {
    "id": 5,
    "test_id": 2,
    "test_name": "IELTS Mock Test 2025",
    "session_date": "2025-12-14T10:00:00Z",
    "location": "Building A, Room 101",
    "status": "ongoing",
    "max_capacity": 100,
    "test_started_at": "2025-12-14T14:00:00Z",
    "test_end_at": "2025-12-14T17:40:00Z"
  },

  "test_config": {
    "listening_minutes": 40,
    "reading_minutes": 60,
    "writing_minutes": 60,
    "total_minutes": 220
  },

  "participants": [
    {
      "id": 1,
      "participant_id_code": "P00001",
      "full_name": "Ahmed Khan",
      "phone_number": "+1 234 567 8900",
      "writing_score": null,
      "speaking_score": null,
      "current_screen": "listening",
      "test_status": "in_progress",
      "last_activity_at": "2025-12-14T14:15:30Z",
      "test_completed_at": null
    },
    ...
  ],

  "stats": {
    "total": 50,                          // Total registered
    "entered_startscreen": 45,            // Entered start screen
    "test_started": 40,                   // Test started (not completed)
    "test_completed": 5,                  // Tests finished
    "scores_pending": 3,                  // Completed but waiting for scores
    "currently_active": 38,               // Active in last 5 minutes
    "offline_or_disconnected": 2,         // Started but inactive 5+ minutes
    "paused": 2                           // Paused tests
  },

  "time_info": {
    "now": "2025-12-14T14:15:45Z",
    "test_started_at": "2025-12-14T14:00:00Z",
    "test_end_at": "2025-12-14T17:40:00Z"
  }
}

Polling: Frontend polls every 3 seconds for real-time updates
```

---

## Error Response Format

All errors return JSON:

```json
{
  "error": "Descriptive error message"
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **403**: Forbidden (not admin)
- **404**: Not Found
- **500**: Internal Server Error

---

## Request/Response Examples

### Example 1: Register and Start Test

```bash
# Step 1: Register participant
curl -X POST http://localhost:5000/api/admin/sessions/5/register-participant \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ahmed Khan",
    "phone_number": "+1 234 567 8900"
  }'

# Response:
{
  "message": "Participant registered successfully",
  "participant": {
    "id": 15,
    "participant_id_code": "P00015",
    "full_name": "Ahmed Khan",
    "phone_number": "+1 234 567 8900"
  }
}

# Step 2: Start all tests
curl -X PATCH http://localhost:5000/api/admin/sessions/5/start-all \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
{
  "message": "Test started for all entered participants",
  "updated_count": 45,
  "test_started_at": "2025-12-14T14:00:00Z",
  "test_end_at": "2025-12-14T17:40:00Z",
  "total_minutes": 220
}
```

### Example 2: Pause and Restart Individual

```bash
# Pause
curl -X PATCH http://localhost:5000/api/admin/sessions/5/participants/15/pause \
  -H "Authorization: Bearer {token}" \
  -d '{}'

# Wait...

# Restart
curl -X PATCH http://localhost:5000/api/admin/sessions/5/participants/15/restart \
  -H "Authorization: Bearer {token}" \
  -d '{}'

# Response:
{
  "message": "Test restarted successfully",
  "participant_id": 15,
  "pause_duration_added": 5,
  "total_pause_duration": 5
}
```

### Example 3: Set Scores

```bash
curl -X PUT http://localhost:5000/api/admin/participants/15/scores \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "writing_score": 7.5,
    "speaking_score": 8.0
  }'

# Response:
{
  "message": "Scores updated successfully",
  "writing_score": 7.5,
  "speaking_score": 8.0
}
```

---

## Data Types & Validation

### Scores

- **Range**: 0 to 9
- **Precision**: 0.5 increments allowed (7.5 is valid, 7.3 is invalid)
- **Type**: DECIMAL(5,2)

### Durations (in minutes)

- **Range**: Positive integers only
- **Default**: IELTS standard (40, 60, 60, 15)
- **Type**: INT

### Test Status Values

```
'not_started'   - Participant registered but test not started
'in_progress'   - Test is active and running
'paused'        - Test paused by admin, can be restarted
'completed'     - Test finished, ready for scoring
'abandoned'     - Test started but participant left
```

### Current Screen Values

```
'not_started'   - Test hasn't begun
'listening'     - Listening section active
'reading'       - Reading section active
'writing'       - Writing section active
'speaking'      - Speaking section active
'results'       - Test completed, results page
'offline'       - Last activity > 5 minutes ago
```

---

## Notes on Timer Calculation

The test timer calculates as follows:

```
Standard IELTS (40 + 60 + 60 minutes):
test_duration = listening_minutes + reading_minutes + writing_minutes + 60 (buffer)
              = 40 + 60 + 60 + 60
              = 220 minutes
              = 3 hours 40 minutes

test_end_at = test_started_at + (220 * 60 * 1000 milliseconds)

Example:
Started: 14:00:00
End: 17:40:00
Remaining at 14:15:00 = 205 minutes
```

---

## Frontend Service Integration

```javascript
// Usage in React components

import adminService from "../services/adminService";

// Register participant
const result = await adminService.registerParticipant(
  sessionId,
  "Ahmed Khan",
  "+1 234 567 8900"
);
console.log(result.participant.participant_id_code);

// Set scores
await adminService.updateParticipantScores(
  participantId,
  7.5, // writing_score
  8.0 // speaking_score
);

// Pause individual
await adminService.pauseParticipantTest(sessionId, participantId);

// Start all tests
const startResponse = await adminService.startAllTests(sessionId);
console.log("Test expires at:", startResponse.test_end_at);

// Get real-time stats
const dashboard = await adminService.getSessionDashboard(sessionId);
console.log("Currently active:", dashboard.stats.currently_active);
console.log("Offline:", dashboard.stats.offline_or_disconnected);
```

---

## Backward Compatibility

The following endpoints remain unchanged:

- POST /sessions - Create session
- GET /sessions - List sessions
- PATCH /sessions/:id/status - Update session status
- GET /tests - List tests
- POST /tests - Create test
- GET /sessions/:id/participants - List participants (enhanced response)
- POST /sessions/:id/register-participants - Bulk register (still works)

Deprecated (still works but prefer new singular endpoint):

- POST /sessions/:id/register-participants (use register-participant for new code)
- Listening scores (migrate to writing_score)
