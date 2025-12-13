# Admin Dashboard - Complete Feature Guide

## Overview

The Admin Dashboard is a comprehensive management system that allows administrators to create tests, manage test sessions, register participants, monitor real-time check-ins, and control test execution.

---

## 📋 Features

### 1. **Test Management**

- **Create Tests**: Add new IELTS mock tests with name and description
- **View All Tests**: See a list of all created tests
- Tests can be used to create multiple sessions

### 2. **Test Session Management**

- **Create Sessions**: Create test sessions for specific tests with:
  - Date and time scheduling
  - Location information
  - Capacity limits
  - Admin notes
- **View Sessions**: Display all sessions with participant counts and statuses
- **Update Status**: Change session status (scheduled, ongoing, completed, cancelled)

### 3. **Participant Registration**

- **Register Participants**: Bulk register participants by entering names
- **Auto ID Generation**: Each participant receives a unique ID code (e.g., P12001, P12002)
- **Distribute IDs**: IDs provided to participants to enter on start screen
- **View Participants**: Table showing all participants with their details

### 4. **Listening & Speaking Scores**

- **Set Scores**: Admin can manually set:
  - Listening score (0-9)
  - Speaking score (0-9)
- **Score Management**: Update scores for each participant
- **Verification**: Shows pending scores count in dashboard

### 5. **Real-Time Monitoring**

- **Check-in Status**: See which participants have entered their ID codes on start screen
- **Live Dashboard**: Real-time statistics showing:
  - Total participants
  - Participants who entered start screen
  - Tests started count
  - Pending scores count
- **Status Tracking**: View each participant's current status:
  - Pending (not yet entered)
  - Entered (entered start screen)
  - Started (test has begun)

### 6. **Test Start Control**

- **Start All Tests**: Admin button to start tests for all participants who've checked in
- **Single Action**: Start all checked-in participants simultaneously
- **Timestamp**: Records when each participant's test started

---

## 🎯 Workflow

### Step 1: Create a Test

1. Go to **Tests** tab
2. Click **+ Create Test**
3. Enter test name and description
4. Click **Create Test**

### Step 2: Create a Test Session

1. Go to **Sessions** tab
2. Click **+ Create Session**
3. Fill in:
   - Test (select from dropdown)
   - Session date & time
   - Location
   - Max capacity (optional)
   - Admin notes (optional)
4. Click **Create Session**

### Step 3: Register Participants

1. Click on a session to select it
2. Go to **Monitor Session** tab
3. Click **+ Register Participants**
4. Enter participant names (one per line):
   ```
   John Doe
   Jane Smith
   Ahmed Khan
   ```
5. Click **Register**
6. Each participant gets a unique ID code (e.g., P12001, P12002, P12003)

### Step 4: Distribute ID Codes

- Share the ID codes with each participant
- They will use these codes to enter at the start screen

### Step 5: Set Speaking & Listening Scores (Before Test)

1. In **Monitor Session** tab, locate participant in table
2. Click **Set Scores** button
3. Enter:
   - Listening score (0-9)
   - Speaking score (0-9)
4. Click **Save Scores**

- Note: These are pre-assigned scores or will be updated as needed

### Step 6: Monitor Check-ins During Session

1. Go to **Monitor Session** tab
2. Watch real-time statistics:
   - "Entered Start Screen" count increases as participants check in
3. Table shows participant status:
   - Pending (dot not lit)
   - Entered (orange dot)
   - Started (green dot)

### Step 7: Start All Tests

1. When all participants have checked in and are ready
2. Click **▶️ Start All Tests** button
3. All participants with "Entered" status begin their tests
4. Green dots appear for started participants

---

## 🔐 Database Schema

### test_participants Table

```sql
CREATE TABLE test_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  participant_id_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),
  listening_score DECIMAL(5, 2),
  speaking_score DECIMAL(5, 2),
  has_entered_startscreen BOOLEAN DEFAULT 0,
  entered_at DATETIME,
  test_started BOOLEAN DEFAULT 0,
  test_started_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
)
```

---

## 🔌 API Endpoints

### Test Management

- `POST /api/admin/tests` - Create test
- `GET /api/admin/tests` - Get all tests

### Session Management

- `POST /api/admin/sessions` - Create session
- `GET /api/admin/sessions` - Get all sessions
- `PATCH /api/admin/sessions/:id/status` - Update session status

### Participant Management

- `POST /api/admin/sessions/:id/register-participants` - Register participants
- `GET /api/admin/sessions/:id/participants` - Get participants for session
- `PUT /api/admin/participants/:id/scores` - Set listening/speaking scores
- `PATCH /api/admin/sessions/:id/start-all` - Start tests for all entered participants
- `GET /api/admin/sessions/:id/dashboard` - Get real-time dashboard data

### Participant Check-in (Used by StartScreen)

- `POST /api/test-sessions/check-in-participant` - Participant enters ID code
- `GET /api/test-sessions/participant/:id_code/can-start` - Check if test can start

---

## 🎨 UI Components

### Tabs

- **Sessions**: Create and select test sessions
- **Monitor Session**: Real-time dashboard for selected session
- **Tests**: Manage IELTS tests

### Real-time Dashboard

- **Stats Grid**: Shows 4 key metrics
- **Control Panel**: Start all tests button
- **Participants Table**: Detailed participant status and scores

### Modals

- **Create Test Modal**: Form to create new test
- **Create Session Modal**: Form to create session
- **Register Participants Modal**: Bulk add participants
- **Set Scores Modal**: Update listening/speaking scores

---

## 📊 Status Indicators

| Status  | Color  | Meaning                           |
| ------- | ------ | --------------------------------- |
| Pending | Gray   | Participant hasn't checked in yet |
| Entered | Orange | Participant entered start screen  |
| Started | Green  | Test has begun for participant    |

---

## 🚀 Usage Tips

1. **Before Session**: Create tests and sessions in advance
2. **ID Distribution**: Share participant ID codes before the test date
3. **Score Setting**: Can set scores before or during the test
4. **Real-time Monitoring**: Keep dashboard open during session
5. **Bulk Operations**: Register many participants at once
6. **Polling**: Dashboard auto-refreshes every 3 seconds for live updates

---

## ⚠️ Important Notes

- **Participant ID Code**: Automatically generated, cannot be manually set
- **Score Range**: Both listening and speaking scores must be 0-9
- **Check-in Required**: Participants must enter their ID code before tests can start
- **Bulk Start**: "Start All Tests" only affects participants who've checked in
- **Session Status**: Change to "ongoing" when session begins

---

## 🔄 Participant Flow

```
1. Admin creates test and session
2. Admin registers participants
3. Admin receives/shares participant ID codes
4. Participant enters ID code on start screen
5. Admin sees "Entered" status in dashboard
6. Admin clicks "Start All Tests"
7. All participants' tests begin
8. Participants complete reading/writing sections
9. Admin sets listening/speaking scores
10. Results calculated and displayed
```

---

## 📱 Responsive Design

- **Desktop**: Full dashboard with all features
- **Tablet**: Optimized table layout
- **Mobile**: Stacked layout, touch-friendly buttons

---

## 🔒 Security

- Admin-only access required
- Authentication via JWT tokens
- Role-based access control
- Data validation on all inputs
