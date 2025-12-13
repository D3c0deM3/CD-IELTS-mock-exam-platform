# System Architecture Analysis - Admin Dashboard Improvements

## Current System Overview

### 1. Database Structure

#### Core Tables:

- **test_participants** - Primary table for session participant management

  - Fields: `id`, `session_id`, `participant_id_code`, `full_name`, `phone_number`
  - Score fields: `listening_score`, `speaking_score`
  - Status fields: `has_entered_startscreen`, `entered_at`, `test_started`, `test_started_at`
  - Timestamps: `created_at`, `updated_at`
  - **Missing**: Writing score, Reading score, test expiry/end time, pause/restart status, current_screen tracking

- **test_sessions** - Session management

  - Fields: `id`, `test_id`, `session_date`, `location`, `max_capacity`, `status`
  - Status values: 'scheduled', 'ongoing', 'completed', 'cancelled'
  - **Missing**: Test start time (when admin starts test), test end time, test duration configuration

- **tests** - Test metadata
  - Fields: `id`, `name`, `description`
  - **Missing**: Test section timings (listening, reading, writing duration in minutes)

### 2. Current API Endpoints

#### Admin Routes (`/api/admin`):

- `POST /sessions/:id/register-participants` - Register multiple participants (accepts array)
- `GET /sessions/:id/participants` - Get all participants
- `PUT /participants/:id/scores` - Update listening & speaking scores only
- `PATCH /sessions/:id/start-all` - Start test for all entered participants
- `GET /sessions/:id/dashboard` - Get real-time dashboard with stats

#### Current Stats Available:

```
{
  total: count of all participants,
  entered_startscreen: count of participants who entered start screen,
  test_started: count who started test,
  scores_pending: count waiting for scores
}
```

### 3. Frontend Components

#### AdminDashboard.js:

- Uses polling (3s interval) for real-time updates
- Current score fields: `listening_score`, `speaking_score` (0-9)
- Participant status shown as: Pending → Entered → Started
- No pause/restart/end test controls
- Bulk registration via textarea (multiple names at once)

#### Modals Present:

1. Create Test Modal
2. Create Session Modal
3. Register Participants Modal (textarea-based)
4. Set Scores Modal (listening & speaking)

---

## Required Improvements Analysis

### 1. **Change Scoring System**

**Current**: Listening + Speaking
**Required**: Writing + Speaking

**Impact**:

- Database: Change `listening_score` → `writing_score` in `test_participants`
- Backend API: Update validation logic (0-9 range same)
- Frontend: Update form labels and fields
- Database schema ALTER required

**Affected Files**:

- `server/db/setup.js` - Schema definition
- `server/routes/admin.js` - Scoring endpoint
- `client/src/pages/AdminDashboard.js` - Form and display
- `client/src/services/adminService.js` - API call

### 2. **Dynamic Stats Enhancement**

**Current Issue**: Stats only show participants in specific states; offline users become invisible

**Required Stats**:

- Total Participants (unchanged)
- Entered Start Screen (unchanged)
- Test Started (unchanged)
- Pending Scores (unchanged)
- **New**: Currently Active (in test or on any screen)
- **New**: Offline/Disconnected (logged in but not seen in X seconds)
- **New**: Completed Test
- **New**: Left Test (started but no longer active)

**Implementation**:

- Add `last_activity_at` timestamp to `test_participants`
- Track `current_screen` field (e.g., 'start_screen', 'listening', 'reading', 'writing', 'speaking', 'results')
- Add `test_status` field (e.g., 'not_started', 'in_progress', 'paused', 'completed', 'abandoned')
- Frontend polling updates these fields on every interaction

### 3. **Test Timer & Expiry System**

**Current Issue**: No time limit, test never expires

**IELTS Timing**:

- Listening: 30 minutes + 10 minutes transfer = 40 minutes
- Reading: 60 minutes
- Writing: 60 minutes
- Speaking: 11-14 minutes (handled separately)
- **Total**: 170 minutes (2 hours 50 minutes) + 1 hour = 3 hours 50 minutes approximately

**Implementation**:

- Create new `test_config` table with section durations
- Add to `test_sessions`: `test_started_at`, `test_end_at` (calculated when admin starts)
- Add to `test_participants`: `started_at`, `ended_at`, `paused_at`, `pause_duration`
- Calculate: `test_end_at = test_started_at + listening_time + reading_time + writing_time + 1 hour buffer`
- Timer starts when admin clicks "Start Test" (applies to all)

**Database Changes**:

```sql
ALTER TABLE test_sessions ADD COLUMN test_started_at DATETIME;
ALTER TABLE test_sessions ADD COLUMN test_end_at DATETIME;
ALTER TABLE test_sessions ADD COLUMN test_paused_at DATETIME;

ALTER TABLE test_participants ADD COLUMN test_completed_at DATETIME;
ALTER TABLE test_participants ADD COLUMN total_pause_duration INT DEFAULT 0;

CREATE TABLE test_config (
  id INT PRIMARY KEY,
  test_id INT,
  listening_minutes INT,
  reading_minutes INT,
  writing_minutes INT,
  speaking_minutes INT,
  FOREIGN KEY (test_id) REFERENCES tests(id)
);
```

### 4. **Participant Registration Form - One at a Time**

**Current**: Textarea with multiple names (bulk)
**Required**: Form with one participant per submission

**Changes**:

- Replace textarea with individual form fields
- Fields: `full_name` (required), `phone_number` (required)
- Keep showing list of registered participants below form
- Validate phone_number exists in `users` table
- Each submission adds one participant with auto-generated ID code

**Backend Enhancement**:

- `POST /sessions/:id/register-participant` (singular) endpoint for one at a time
- Frontend handles sequential registration

### 5. **Admin Controls - Pause, Restart, End Test**

**Required New Endpoints**:

```
PATCH /admin/sessions/:id/participants/:pid/pause - Pause individual test
PATCH /admin/sessions/:id/participants/:pid/restart - Restart individual test
PATCH /admin/sessions/:id/participants/:pid/end - End individual test
PATCH /admin/sessions/:id/pause-all - Pause all active tests
PATCH /admin/sessions/:id/restart-all - Restart all paused tests
PATCH /admin/sessions/:id/end-all - End all active/paused tests
```

**Implementation**:

- Confirmation dialog before actions (especially end test)
- Update `test_participants`: `paused_at`, `pause_duration`, `test_status`
- Frontend blocks test UI when paused/ended
- Track total pause duration for time calculation

### 6. **Real-Time Status Tracking**

**Current**: Only 3 states (Pending, Entered, Started)
**Required**: Track current screen in real-time

**New Field**: `current_screen` in `test_participants`

- Values: 'not_started' | 'start_screen' | 'listening' | 'reading' | 'writing' | 'speaking' | 'results' | 'offline'

**Implementation**:

- TestPage/participant frontend updates `last_activity_at` and `current_screen` on each screen change
- New endpoint: `PATCH /api/test-sessions/participant/:id/update-status`
- Admin dashboard displays this in real-time

---

## Implementation Priority & Complexity

| Feature                            | Complexity | Priority | Dependencies            |
| ---------------------------------- | ---------- | -------- | ----------------------- |
| Change Scoring (Listening→Writing) | Low        | High     | None                    |
| One-at-a-time Registration         | Medium     | High     | Registration endpoint   |
| Dynamic Stats                      | Medium     | High     | Status tracking         |
| Real-time Screen Tracking          | High       | High     | Frontend + Backend sync |
| Test Timer & Expiry                | High       | Critical | Test config table       |
| Pause/Restart/End Test             | High       | Critical | Status tracking + Timer |
| Confirmation Dialogs               | Low        | Medium   | UI enhancement          |

---

## Database Changes Required

### ALTER TABLE statements:

1. Change `listening_score` to `writing_score` in `test_participants`
2. Add tracking fields to `test_participants`:

   - `current_screen` VARCHAR(50)
   - `test_status` VARCHAR(50)
   - `last_activity_at` DATETIME
   - `test_completed_at` DATETIME
   - `total_pause_duration` INT
   - `paused_at` DATETIME

3. Add timing fields to `test_sessions`:

   - `test_started_at` DATETIME
   - `test_end_at` DATETIME
   - `test_paused_at` DATETIME

4. Create `test_config` table for section durations

---

## Frontend Changes Summary

### AdminDashboard.js:

- Update score field labels (Listening → Writing)
- Replace bulk registration textarea with form for one participant at a time
- Add validation for phone_number (must exist in system)
- New stat cards for dynamic metrics
- Add status column to show `current_screen` in real-time
- New buttons: Pause Test, Restart Test, End Test (with confirmations)
- Display test timer and end time

### TestPage/Participant UI:

- Track and report `current_screen` on each navigation
- Update `last_activity_at` regularly
- Display test timer countdown
- Handle pause/end commands from admin
- Block interaction when paused

---

## Backend API Changes Summary

### New/Modified Endpoints:

1. **Registration**:

   - `POST /api/admin/sessions/:id/register-participant` (singular)
   - Validate: phone_number exists in users table

2. **Status Tracking**:

   - `PATCH /api/test-sessions/participant/:id/update-status`
   - Body: `{ current_screen, last_activity_at }`

3. **Test Control**:

   - `PATCH /api/admin/sessions/:id/participants/:pid/pause`
   - `PATCH /api/admin/sessions/:id/participants/:pid/restart`
   - `PATCH /api/admin/sessions/:id/participants/:pid/end`
   - `PATCH /api/admin/sessions/:id/pause-all`
   - `PATCH /api/admin/sessions/:id/end-all`

4. **Dashboard Stats** (Enhanced):

   - `GET /api/admin/sessions/:id/dashboard` - Returns new stats structure

5. **Test Config**:

   - `POST /api/admin/tests/:id/config` - Set section timings
   - `GET /api/admin/tests/:id/config` - Get section timings

6. **Score Updates**:
   - Change endpoint to accept `writing_score` instead of `listening_score`

---

## Session Flow After Changes

1. **Admin Creates Test** with section durations (listening, reading, writing)
2. **Admin Creates Session** with test reference
3. **Admin Registers Participants** one at a time (name + phone validation)
4. **Participants Check In** at start screen with ID code
5. **Admin Starts Test** for all → timer begins, status changes to "in_progress"
6. **Participants Take Test** → status updates to current section
7. **Admin Can**:
   - Pause individual/all tests
   - Restart paused tests
   - End tests early
8. **Test Auto-Ends** when timer expires or participant completes
9. **Admin Sets Scores** (Writing + Speaking) after test ends

---

## Implementation Order (Recommended)

1. **Database Schema Updates** (alter tables)
2. **Change Scoring System** (Listening → Writing)
3. **Add Test Config** (section durations)
4. **Implement Real-Time Status Tracking** (current_screen field)
5. **Improve Registration Form** (one at a time + validation)
6. **Implement Test Timer** (start time, end time calculation)
7. **Add Pause/Restart/End Controls** (backend + frontend)
8. **Update Dashboard Stats** (dynamic metrics)
9. **Add Confirmation Dialogs** (UI safety)
10. **Testing & Validation**
