# Code Snippets for Integration

This file contains ready-to-copy code snippets for integrating the test registration system.

## 1. Dashboard.js Integration

### Step 1: Add Imports (at top of file)

```javascript
import TestRegistrationModal from "../components/TestRegistrationModal";
import testSessionService from "../services/testSessionService";
```

### Step 2: Add State Variables (in your component, after existing useState)

```javascript
const [showRegistrationModal, setShowRegistrationModal] = useState(false);
const [selectedTestForModal, setSelectedTestForModal] = useState(null);

// Admin contact info - update these values
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PHONE = "+998-99-123-4567";
```

### Step 3: Replace Available Tests Section (around line 365-390)

**REMOVE THIS:**

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
            <Link to={`/tests/${t.id}`} className="btn small">
              Start
            </Link>
          </div>
        </li>
      ))
    ) : (
      <li className="empty">No available tests</li>
    )}
  </ul>
</section>;
```

**REPLACE WITH THIS:**

```javascript
{
  /* Available Tests */
}
<section className="card small-card">
  <div className="card-head">
    <h4>Available Mock Tests</h4>
    <p className="muted">Register for scheduled sessions</p>
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

---

## 2. TestPage.js (or Test-Taking Component)

### Add Test Access Check

```javascript
import React, { useState, useEffect } from "react";
import testSessionService from "../services/testSessionService";
import { useParams } from "react-router-dom";

const TestPage = () => {
  const { testId } = useParams(); // or however you get test ID
  const [canTakeTest, setCanTakeTest] = useState(false);
  const [testAccessReason, setTestAccessReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);

  useEffect(() => {
    checkTestAccess();
  }, [testId]);

  const checkTestAccess = async () => {
    setLoading(true);
    try {
      // First, get user's registrations to find the session ID for this test
      const registrations = await testSessionService.getMyRegistrations();

      // Find registration for this test
      const registration = registrations.find(
        (r) => r.test_id === parseInt(testId)
      );

      if (!registration) {
        setTestAccessReason(
          "You are not registered for this test. Please register first."
        );
        setCanTakeTest(false);
        setLoading(false);
        return;
      }

      // Check if we can take this test now
      const result = await testSessionService.canTakeTest(
        registration.session_id
      );

      if (result.can_take) {
        setCanTakeTest(true);
        // Load test data
        loadTestData();
      } else {
        // result.reason contains the reason why they can't take it
        setTestAccessReason(result.reason);
        setCanTakeTest(false);
      }
    } catch (error) {
      console.error("Error checking test access:", error);
      setTestAccessReason(
        "Unable to verify test access. Please try again later."
      );
      setCanTakeTest(false);
    } finally {
      setLoading(false);
    }
  };

  const loadTestData = async () => {
    try {
      // Load your test questions/content here
      const response = await fetch(`/api/tests/${testId}`);
      const data = await response.json();
      setTestData(data);
    } catch (error) {
      console.error("Error loading test:", error);
    }
  };

  if (loading) {
    return <div>Loading test access information...</div>;
  }

  if (!canTakeTest) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2>Test Access Denied</h2>
        <p style={{ fontSize: "16px", marginTop: "16px" }}>
          {testAccessReason}
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "12px" }}>
          Please contact your administrator for help.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: "24px",
            padding: "10px 20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Test is accessible - render test content
  return (
    <div className="test-container">
      <h1>{testData?.name}</h1>
      {/* Your test questions/content here */}
      {testData && <div>{/* Render test sections, questions, etc */}</div>}
    </div>
  );
};

export default TestPage;
```

---

## 3. Dashboard.css Button Styling (Optional)

If the button styling isn't already there, add this to Dashboard.css:

```css
.btn.small {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  background: var(--accent, #2563eb);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn.small:hover {
  background: var(--accent-dark, #1d4ed8);
  opacity: 0.95;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn.small:active {
  transform: translateY(0);
}

.btn.small:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

html[data-theme="dark"] .btn.small {
  background: #3b82f6;
}

html[data-theme="dark"] .btn.small:hover {
  background: #2563eb;
}
```

---

## 4. Environment Variables (.env)

Create or update `.env` in client folder:

```
REACT_APP_API_URL=http://localhost:4000
REACT_APP_ADMIN_EMAIL=admin@ielts-center.uz
REACT_APP_ADMIN_PHONE=+998-99-123-4567
```

Then use in Dashboard.js:

```javascript
const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PHONE = process.env.REACT_APP_ADMIN_PHONE || "+998-99-123-4567";
```

---

## 5. Admin Test Session Manager (Optional)

Create new file: `client/src/pages/AdminTestSessions.js`

```javascript
import React, { useState, useEffect } from "react";
import testSessionService from "../services/testSessionService";
import { FiEdit2, FiTrash2, FiEye, FiPlus } from "react-icons/fi";
import "./AdminTestSessions.css";

const AdminTestSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await testSessionService.getAvailableSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError("Failed to load test sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (sessionId, newStatus) => {
    try {
      await testSessionService.updateSessionStatus(sessionId, newStatus);
      loadSessions();
    } catch (err) {
      console.error("Error updating session status:", err);
      setError("Failed to update session status");
    }
  };

  if (loading) return <div className="loading">Loading test sessions...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Manage Test Sessions</h1>
        <button className="btn btn-primary">
          <FiPlus /> Create New Session
        </button>
      </div>

      <table className="sessions-table">
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Date & Time</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>Registered</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>{session.test_name}</td>
              <td>{new Date(session.session_date).toLocaleString()}</td>
              <td>{session.location}</td>
              <td>{session.max_capacity}</td>
              <td>{session.registered_count || 0}</td>
              <td>
                <select
                  value={session.status}
                  onChange={(e) =>
                    handleStatusChange(session.id, e.target.value)
                  }
                  className={`status-select status-${session.status}`}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
              <td className="actions">
                <button title="View Details">
                  <FiEye size={18} />
                </button>
                <button title="Edit">
                  <FiEdit2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTestSessions;
```

---

## 6. Customizing Modal Messages

In `TestRegistrationModal.js`, edit this section:

```javascript
const content = {
  en: {
    title: "Test Registration Required",
    message:
      "In order to register for mock test, you should contact with the admin.",
    adminLabel: "Admin Contact Information",
    email: "Email",
    phone: "Phone",
    close: "Close",
  },
  uz: {
    title: "Testga ro'yxatdan o'tish talab qilinadi",
    message:
      "Mock test uchun ro'yxatdan o'tish uchun administrator bilan bog'lanish kerak.",
    adminLabel: "Administrator kontakt ma'lumotlari",
    email: "Email",
    phone: "Telefon",
    close: "Yopish",
  },
};
```

---

## 7. Quick Testing Code

Run in browser console after everything is set up:

```javascript
// Test getting available sessions
import testSessionService from "./src/services/testSessionService";
const sessions = await testSessionService.getAvailableSessions();
console.log("Available sessions:", sessions);

// Test checking if can take test (replace 1 with actual session ID)
const canTake = await testSessionService.canTakeTest(1);
console.log("Can take test:", canTake);

// Test getting user's registrations
const myRegs = await testSessionService.getMyRegistrations();
console.log("My registrations:", myRegs);
```

---

## 8. Routing Setup (if needed)

In your main router file, add:

```javascript
import AdminTestSessions from "./pages/AdminTestSessions";

// In your route configuration:
{
  path: "/admin/sessions",
  element: <AdminTestSessions />,
  // Add role check here
}
```

---

## 9. Common Modifications

### Change "Register" button to "Request Registration"

In Dashboard.js, change button text and add handler:

```javascript
<button
  className="btn small"
  onClick={() => {
    setSelectedTestForModal(t);
    setShowRegistrationModal(true);
  }}
>
  Request Registration
</button>
```

### Add test capacity info to modal

Update modal to accept maxCapacity prop:

```javascript
<TestRegistrationModal
  ...
  maxCapacity={selectedTestForModal?.max_capacity}
/>
```

Then in modal, display:

```javascript
<p>Capacity: {maxCapacity} students</p>
```

### Add session date to modal

```javascript
<button
  className="btn small"
  onClick={() => {
    setSelectedTestForModal(t);
    setShowRegistrationModal(true);
  }}
>
  {t.session_date ? "View Sessions" : "Register"}
</button>
```

---

## 10. Debugging Snippets

```javascript
// Check if modal opens
console.log("Modal open:", showRegistrationModal);
console.log("Selected test:", selectedTestForModal);

// Check service calls
try {
  const sessions = await testSessionService.getAvailableSessions();
  console.log("Sessions fetched successfully:", sessions);
} catch (err) {
  console.error("Service error:", err);
}

// Check token
const token = localStorage.getItem("token");
console.log("Token exists:", !!token);
console.log("Token:", token?.substring(0, 20) + "...");
```

---

## Summary

These snippets are ready to copy-paste. Follow the section numbers in order:

1. Update Dashboard.js imports and state
2. Replace Available Tests section with modal code
3. Update TestPage.js with access checking
4. (Optional) Add admin features
5. (Optional) Add environment variables
6. Customize as needed
7. Test in browser console

All pieces are provided. Just follow the numbers!
