# Test Registration System - Quick Reference

## 📋 Files Created/Modified

### Backend Files

| File                            | Type     | Purpose                                               |
| ------------------------------- | -------- | ----------------------------------------------------- |
| `server/db/setup.js`            | Modified | Added `test_sessions` and `test_registrations` tables |
| `server/routes/testSessions.js` | Created  | 7 API endpoints for session management                |
| `server/index.js`               | Modified | Mounted testSessionsRoute at `/api/test-sessions`     |

### Frontend Files

| File                                              | Type    | Purpose                                       |
| ------------------------------------------------- | ------- | --------------------------------------------- |
| `client/src/services/testSessionService.js`       | Created | Service layer wrapping all test session APIs  |
| `client/src/components/TestRegistrationModal.js`  | Created | Modal component for test registration (EN/UZ) |
| `client/src/components/TestRegistrationModal.css` | Created | Styling for the modal with dark theme support |

---

## 🔌 API Endpoints

### Test Session Endpoints (Protected - Requires Auth)

```
GET    /api/test-sessions/available            Get all upcoming sessions
GET    /api/test-sessions/my-registrations     Get user's registered sessions
GET    /api/test-sessions/:id                  Get session details
GET    /api/test-sessions/:id/can-take-test    Check if user can take test
POST   /api/test-sessions/create               Create session (ADMIN ONLY)
POST   /api/test-sessions/register-students    Register students (ADMIN ONLY)
PATCH  /api/test-sessions/:id/status           Update session status (ADMIN ONLY)
```

---

## 🗄️ Database Schema

### test_sessions

- `id` - Primary key
- `test_id` - Foreign key to tests
- `session_date` - When the test will be held
- `location` - Where the test will be held
- `max_capacity` - How many students can attend
- `status` - scheduled | ongoing | completed | cancelled
- `admin_notes` - Notes from admin
- `created_by` - User ID of admin who created it
- `created_at, updated_at` - Timestamps

### test_registrations

- `id` - Primary key
- `student_id` - FK to users
- `session_id` - FK to test_sessions
- `registration_status` - registered | completed | absent | cancelled
- `registered_at, updated_at` - Timestamps
- **Constraint**: UNIQUE(student_id, session_id) - Each student registers once per session

---

## 🎯 Service Methods

All methods in `testSessionService.js`:

```javascript
// Available to all authenticated users
getAvailableSessions()           // Get upcoming test sessions
getMyRegistrations()             // Get user's registrations
getSessionDetails(sessionId)     // Get one session's details
canTakeTest(sessionId)          // Check if user can start test now

// Admin only
createSession(...)              // Create new test session
registerStudents(...)           // Bulk register students
updateSessionStatus(...)        // Change session status
```

---

## 🎨 UI Components

### TestRegistrationModal

- **Props**: `isOpen`, `onClose`, `testName`, `adminEmail`, `adminPhone`
- **Languages**: English & Uzbek (user selectable)
- **Features**:
  - Language toggle button
  - Displays test name
  - Shows admin contact (email + phone with clickable links)
  - Professional modal styling with overlay
  - Dark theme support

---

## 🔐 Flow Diagram

```
Student Dashboard
    ↓
Click "Register" for test
    ↓
TestRegistrationModal opens
    ↓
See admin contact info
    ↓
Contact admin (outside system)
    ↓
Admin Dashboard
    ↓
Create Test Session (date/location/capacity)
    ↓
Bulk Register Students
    ↓
Change Status to "ongoing"
    ↓
Student can now access test
    ↓
Backend checks canTakeTest() → true
    ↓
Test page renders
```

---

## 🚀 Quick Start

### 1. Backend is Ready

No additional setup needed. Tables and APIs are created.

### 2. Frontend Integration (3 Steps)

**Step A**: Import in Dashboard.js

```javascript
import TestRegistrationModal from "../components/TestRegistrationModal";
import testSessionService from "../services/testSessionService";
```

**Step B**: Add state

```javascript
const [showRegistrationModal, setShowRegistrationModal] = useState(false);
const [selectedTestForModal, setSelectedTestForModal] = useState(null);
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PHONE = "+998-99-123-4567";
```

**Step C**: Update available tests section
Change "Start" button to "Register" button that opens modal.

### 3. Protect Test Page

Add `canTakeTest()` check before rendering test content.

---

## 📊 Status Flow

```
scheduled  →  ongoing  →  completed
    ↓
 cancelled
```

- **scheduled**: Test is registered but students can't take it yet
- **ongoing**: Admin activated it, students can take the test NOW
- **completed**: Test session ended
- **cancelled**: Test was cancelled, can't be taken

---

## 🔄 Interaction Sequence

### Creating & Taking a Test Session

1. **Admin** creates session with `/api/test-sessions/create`

   - Provides: test_id, session_date, location, max_capacity
   - Status starts as "scheduled"

2. **Admin** registers students with `/api/test-sessions/register-students`

   - Provides: session_id, array of student_ids
   - Creates entries in test_registrations table

3. **Student** sees registered sessions with `getMyRegistrations()`

   - Views upcoming test sessions in their dashboard

4. **Admin** changes status to "ongoing" when test starts

   - Uses `updateSessionStatus(sessionId, "ongoing")`

5. **Student** clicks "Start Test"

   - Frontend calls `canTakeTest(sessionId)`
   - Returns: `{ can_take: true, reason: "...", session_status: "ongoing" }`
   - Test page renders and student can take the test

6. **Admin** changes status to "completed" when done
   - Session closes, no more students can take it

---

## ⚙️ Configuration

### Admin Contact Information

Set in Dashboard.js:

```javascript
const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PHONE = process.env.REACT_APP_ADMIN_PHONE || "+998-99-123-4567";
```

Or in `.env`:

```
REACT_APP_ADMIN_EMAIL=admin@example.com
REACT_APP_ADMIN_PHONE=+998-99-123-4567
```

### Modal Messages (English/Uzbek)

Edit in TestRegistrationModal.js:

```javascript
const content = {
  en: {
    /* English messages */
  },
  uz: {
    /* Uzbek messages */
  },
};
```

---

## 🧪 Testing Checklist

- [ ] Admin can create test session
- [ ] Admin can register students for session
- [ ] Student sees registered sessions in dashboard
- [ ] Admin can change session status to "ongoing"
- [ ] Student's canTakeTest() returns true
- [ ] Student can start test when status is "ongoing"
- [ ] Student's canTakeTest() returns false when status is "scheduled"
- [ ] Modal displays in English and Uzbek correctly
- [ ] Admin email/phone links work (mailto, tel)
- [ ] Dark theme works on modal
- [ ] Session expires after status is "completed"

---

## 📝 Notes

- JWT tokens expire after 1 hour
- Database sessions expire after 24 hours
- Session status can be changed by admin anytime
- Only students registered for a session can take it
- Only sessions with status "ongoing" can be accessed
- Each student can register for a session only once (UNIQUE constraint)
- Bulk registration prevents duplicate registrations

---

## 🔗 Related Files

- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Detailed step-by-step integration
- [server/routes/testSessions.js](server/routes/testSessions.js) - Backend implementation
- [client/src/services/testSessionService.js](client/src/services/testSessionService.js) - Frontend service
- [client/src/components/TestRegistrationModal.js](client/src/components/TestRegistrationModal.js) - UI component

---

**Status**: ✅ Ready for integration and testing
