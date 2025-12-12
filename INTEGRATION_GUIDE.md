# Test Registration System - Integration Guide

## Overview

The test registration system has been created with:

- ✅ Database tables (`test_sessions`, `test_registrations`)
- ✅ Backend APIs (7 endpoints in `/api/test-sessions`)
- ✅ Frontend service layer (`testSessionService.js`)
- ✅ UI component (`TestRegistrationModal.js` with CSS)

This guide shows how to integrate these pieces into your Dashboard and Test pages.

---

## 1. Integrate TestRegistrationModal into Dashboard

### Step 1: Import the Modal and Service

In `client/src/pages/Dashboard.js`, add these imports at the top:

```javascript
import TestRegistrationModal from "../components/TestRegistrationModal";
import testSessionService from "../services/testSessionService";
```

### Step 2: Add Modal State

Add this state variable in your Dashboard component (after the existing useState declarations):

```javascript
const [showRegistrationModal, setShowRegistrationModal] = useState(false);
const [selectedTestForModal, setSelectedTestForModal] = useState(null);

// Admin contact info - update these with your actual values
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PHONE = "+998-99-123-4567";
```

### Step 3: Replace the "Available Tests" Section

Find the "Available Tests" section (around line 365-390) and replace it with:

```javascript
{
  /* Available Tests */
}
<section className="card small-card">
  <div className="card-head">
    <h4>Available Mock Tests</h4>
    <p className="muted">Practice anytime — timed mocks</p>
  </div>

  <ul className="compact-list">
    {tests && tests.length > 0 ? (
      tests.map((t) => (
        <li key={t.id}>
          <div className="compact-left">
            <div className="compact-name">{t.name}</div>
            <div className="muted small">{t.description}</div>
          </div>
          <div className="compact-right">
            <button
              className="btn small"
              onClick={() => {
                setSelectedTestForModal(t);
                setShowRegistrationModal(true);
              }}
            >
              Register
            </button>
          </div>
        </li>
      ))
    ) : (
      <li className="empty">No available tests</li>
    )}
  </ul>
</section>;

{
  /* Test Registration Modal */
}
<TestRegistrationModal
  isOpen={showRegistrationModal}
  onClose={() => setShowRegistrationModal(false)}
  testName={selectedTestForModal?.name || ""}
  adminEmail={ADMIN_EMAIL}
  adminPhone={ADMIN_PHONE}
/>;
```

### Step 4: Update the CSS for the Button

The "Register" button styling is already included in your Dashboard.css, but ensure this exists:

```css
.btn.small {
  padding: 8px 16px;
  font-size: 13px;
  background: var(--accent, #2563eb);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.small:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
```

---

## 2. Check Test Permission Before Starting

### For Your Test Page (wherever tests are taken)

In the component where you render the test (likely `pages/TestPage.js` or wherever `/tests/:id` is handled), add:

```javascript
import testSessionService from "../services/testSessionService";

// In your component:
const [canTakeTest, setCanTakeTest] = useState(false);
const [testAccessReason, setTestAccessReason] = useState("");

useEffect(() => {
  checkTestAccess();
}, [testId]);

const checkTestAccess = async () => {
  try {
    const result = await testSessionService.canTakeTest(testSessionId);
    // result = { can_take: true/false, reason: "...", session_status: "..." }

    if (result.can_take) {
      setCanTakeTest(true);
    } else {
      setTestAccessReason(result.reason);
      // Possible reasons:
      // - "not_registered" - User not registered for any session
      // - "session_not_started" - Session exists but status is "scheduled"
      // - "session_completed" - Test session already ended
      // - "session_cancelled" - Session was cancelled
      setCanTakeTest(false);
    }
  } catch (error) {
    console.error("Error checking test access:", error);
    setTestAccessReason("Unable to verify test access");
    setCanTakeTest(false);
  }
};

// In your JSX:
{
  canTakeTest ? (
    // Render test content
    <div>Test questions here...</div>
  ) : (
    <div className="access-denied">
      <h3>Test Access Denied</h3>
      <p>{testAccessReason}</p>
      <p>Please contact your administrator or register for a session.</p>
    </div>
  );
}
```

---

## 3. Admin Dashboard Pages (Optional but Recommended)

### Create Admin Test Session Manager

Create `client/src/pages/AdminTestSessions.js`:

```javascript
import React, { useState, useEffect } from "react";
import testSessionService from "../services/testSessionService";

const AdminTestSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await testSessionService.getAvailableSessions();
      setSessions(data);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (sessionId, newStatus) => {
    try {
      await testSessionService.updateSessionStatus(sessionId, newStatus);
      loadSessions();
    } catch (error) {
      console.error("Error updating session status:", error);
    }
  };

  return (
    <div className="admin-container">
      <h2>Manage Test Sessions</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Date</th>
              <th>Location</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.test_name}</td>
                <td>{new Date(session.session_date).toLocaleDateString()}</td>
                <td>{session.location}</td>
                <td>
                  {session.registered_count || 0} / {session.max_capacity}
                </td>
                <td>
                  <select
                    value={session.status}
                    onChange={(e) =>
                      handleStatusChange(session.id, e.target.value)
                    }
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => {
                      // Show session details or student list
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminTestSessions;
```

---

## 4. API Reference

### Test Session Endpoints

All endpoints require authentication (JWT token).

#### Get Available Sessions

```
GET /api/test-sessions/available
Response: [{ id, test_id, test_name, session_date, location, max_capacity, status, registered_count }, ...]
```

#### Get User's Registrations

```
GET /api/test-sessions/my-registrations
Response: [{ session_id, test_id, test_name, session_date, location, registration_status }, ...]
```

#### Check if User Can Take Test

```
GET /api/test-sessions/:sessionId/can-take-test
Response: { can_take: boolean, reason: string, session_status: string }
```

#### Get Session Details

```
GET /api/test-sessions/:sessionId
Response: { id, test_id, session_date, location, max_capacity, status, admin_notes, registered_count, student_list: [...] }
```

#### Create Test Session (Admin Only)

```
POST /api/test-sessions/create
Body: { test_id, session_date, location, max_capacity, admin_notes }
Response: { id, message }
```

#### Register Students (Admin Only)

```
POST /api/test-sessions/register-students
Body: { session_id, student_ids: [1, 2, 3, ...] }
Response: { message, registered_count, failed_count }
```

#### Update Session Status (Admin Only)

```
PATCH /api/test-sessions/:sessionId/status
Body: { status: "scheduled|ongoing|completed|cancelled" }
Response: { message, new_status }
```

---

## 5. Service Methods Reference

All methods in `testSessionService.js`:

```javascript
// Student Methods
await testSessionService.getAvailableSessions();
await testSessionService.getMyRegistrations();
await testSessionService.getSessionDetails(sessionId);
await testSessionService.canTakeTest(sessionId);

// Admin Methods
await testSessionService.createSession(
  testId,
  sessionDate,
  location,
  maxCapacity,
  notes
);
await testSessionService.registerStudents(sessionId, studentIds);
await testSessionService.updateSessionStatus(sessionId, newStatus);
```

---

## 6. Database Schema

### test_sessions Table

```sql
CREATE TABLE test_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id INT NOT NULL,
  session_date DATETIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  max_capacity INT NOT NULL DEFAULT 50,
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  admin_notes TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES tests(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  KEY (session_date),
  KEY (status)
);
```

### test_registrations Table

```sql
CREATE TABLE test_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  session_id INT NOT NULL,
  registration_status ENUM('registered', 'completed', 'absent', 'cancelled') DEFAULT 'registered',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES test_sessions(id),
  UNIQUE KEY unique_registration (student_id, session_id),
  KEY (session_id)
);
```

---

## 7. Testing the System

### Step 1: Create a Test Session (Admin)

```bash
curl -X POST http://localhost:4000/api/test-sessions/create \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": 1,
    "session_date": "2024-12-20 10:00:00",
    "location": "Room 101, Building A",
    "max_capacity": 30,
    "admin_notes": "First IELTS mock batch"
  }'
```

### Step 2: Register Students (Admin)

```bash
curl -X POST http://localhost:4000/api/test-sessions/register-students \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "student_ids": [1, 2, 3, 4, 5]
  }'
```

### Step 3: Check Student Can Access

```bash
curl -X GET "http://localhost:4000/api/test-sessions/1/can-take-test" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

### Step 4: Change Session Status to Ongoing

```bash
curl -X PATCH http://localhost:4000/api/test-sessions/1/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "ongoing"}'
```

### Step 5: Now Student Can Take Test

```bash
curl -X GET "http://localhost:4000/api/test-sessions/1/can-take-test" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
# Response: { can_take: true, reason: "...", session_status: "ongoing" }
```

---

## 8. Customization

### Change Admin Contact Info

In Dashboard.js, update these constants:

```javascript
const ADMIN_EMAIL = "your-email@example.com";
const ADMIN_PHONE = "+998-99-XXX-XXXX";
```

Or store them in environment variables:

```javascript
const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL;
const ADMIN_PHONE = process.env.REACT_APP_ADMIN_PHONE;
```

### Modify Modal Messages

Edit the content object in `TestRegistrationModal.js`:

```javascript
const content = {
  en: {
    title: "Test Registration Required",
    message: `In order to register for mock test, you should contact with the admin.`,
    adminLabel: "Admin Contact Information",
    email: "Email",
    phone: "Phone",
    close: "Close",
  },
  uz: {
    // Uzbek translations...
  },
};
```

### Change Button Text

Update "Register" button text in Dashboard.js or the modal button text in the component.

---

## 9. Next Steps

1. ✅ Integrate modal into Dashboard
2. ✅ Add test access checks to TestPage
3. ✅ Create admin dashboard pages
4. ✅ Configure admin contact information
5. ✅ Test end-to-end flow
6. Add email notifications when users register
7. Add SMS notifications for test reminders
8. Create student reports showing registration history

---

## 10. Troubleshooting

### Modal Not Showing

- Check that TestRegistrationModal is imported correctly
- Verify showRegistrationModal state is being set to true
- Check browser console for errors

### Test Access Always Denied

- Make sure admin has registered the student for the session
- Check that session status is "ongoing"
- Verify student_id matches the logged-in user

### CORS Errors

- Ensure backend CORS middleware is configured
- Check frontend API URL in `.env`

### Token Expiration

- JWT tokens expire after 1 hour
- Sessions expire after 24 hours
- Check auth middleware in backend

---

## Summary

The test registration system is complete and ready for integration. Follow the steps above to:

1. Add the modal to your Dashboard
2. Protect your test pages with access checks
3. Create admin pages to manage sessions
4. Test the complete flow

Questions? Check the conversation summary or backend logs for details.
