# Test Registration System - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      IELTS MOCK EXAM PLATFORM                           │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                         FRONTEND (React)                             │ │
│ │                                                                      │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ Pages                                                        │  │ │
│ │  │  • Dashboard.js                   ← NEEDS: Modal integration │  │ │
│ │  │  • TestPage.js                    ← NEEDS: Permission check │  │ │
│ │  │  • AdminTestSessions.js (optional)                          │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ │                              ▲                                       │ │
│ │                              │                                       │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ Services                                                     │  │ │
│ │  │  ✅ testSessionService.js (6 methods)                       │  │ │
│ │  │  ✅ dashboardService.js   (4 methods)                       │  │ │
│ │  │  ✅ authService.js        (2 methods)                       │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ │              ▲         │         │         │         │               │ │
│ │              │         ▼         ▼         ▼         ▼               │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ Components                                                   │  │ │
│ │  │  ✅ TestRegistrationModal.js (bilingual, dark theme)       │  │ │
│ │  │  ✅ TestRegistrationModal.css (full styling)               │  │ │
│ │  │  ✓  Navbar.js                                             │  │ │
│ │  │  ✓  ThemeToggle.js                                        │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ │              │                                                       │ │
│ │              └─────────────────────────────────────────────┐         │ │
│ │                                                            │         │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ HTTP Requests (Axios with JWT)                             │  │ │
│ │  │  • Authorization: Bearer {token}                           │  │ │
│ │  │  • Automatic token refresh on 401                          │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              │ HTTP/CORS                                 │
│                              ▼                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                        BACKEND (Node.js/Express)                     │ │
│ │                                                                      │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ API Routes                                                   │  │ │
│ │  │  ✅ /api/test-sessions/register-students    (POST, Admin)  │  │ │
│ │  │  ✅ /api/test-sessions/available             (GET)         │  │ │
│ │  │  ✅ /api/test-sessions/my-registrations      (GET)         │  │ │
│ │  │  ✅ /api/test-sessions/:id                   (GET)         │  │ │
│ │  │  ✅ /api/test-sessions/:id/can-take-test     (GET) ◄──────────┐│ │
│ │  │  ✅ /api/test-sessions/create                (POST, Admin)  │  │ │
│ │  │  ✅ /api/test-sessions/:id/status            (PATCH, Admin) │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ │         ▲                                                            │  │ │
│ │         │                                                            │  │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ Middleware                                                   │  │ │
│ │  │  ✓  auth.js         - JWT validation, session check         │  │ │
│ │  │  ✓  CORS            - Cross-origin requests allowed         │  │ │
│ │  │  ✓  Error handling  - Consistent error responses            │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ │         ▲                                                            │  │ │
│ │         │                                                            │  │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ Controllers (Business Logic)                                │  │ │
│ │  │  ✅ testSessions.js                                         │  │ │
│ │  │     • checkAdmin()  - Role validation                      │  │ │
│ │  │     • bulkRegister() - Register students                   │  │ │
│ │  │     • getAvailable() - List upcoming sessions              │  │ │
│ │  │     • canTake() - Real-time permission check               │  │ │
│ │  │     • changeStatus() - Admin session control               │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ │         ▲                                                            │  │ │
│ │         │                                                            │  │ │
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ Database Queries (MySQL)                                    │  │ │
│ │  │  ✅ SELECT FROM test_sessions ...                           │  │ │
│ │  │  ✅ JOIN test_registrations ...                             │  │ │
│ │  │  ✅ INSERT INTO test_registrations ...                      │  │ │
│ │  │  ✅ UPDATE test_sessions SET status = ...                  │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              │ SQL Queries                               │
│                              ▼                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                      DATABASE (MySQL)                                │ │
│ │                                                                      │ │
│ │  Existing Tables:                                                   │ │
│ │  ✓ users              - Student & admin accounts                  │ │
│ │  ✓ tests              - IELTS test information                    │ │
│ │  ✓ results            - Test scores and results                   │ │
│ │  ✓ user_sessions      - Authentication sessions                  │ │
│ │  ✓ sections, questions, answers - Test content                   │ │
│ │  ✓ user_answers       - Student responses                         │ │
│ │                                                                      │ │
│ │  New Tables:                                                        │ │
│ │  ✅ test_sessions     - Test scheduling (date, location, status) │ │
│ │     ├─ id (PK)                                                   │ │
│ │     ├─ test_id (FK → tests)                                     │ │
│ │     ├─ session_date (DATETIME)                                  │ │
│ │     ├─ location (VARCHAR)                                        │ │
│ │     ├─ max_capacity (INT)                                        │ │
│ │     ├─ status ENUM('scheduled','ongoing','completed','cancelled')
│ │     └─ admin_notes, created_by, timestamps                      │ │
│ │                                                                      │ │
│ │  ✅ test_registrations - Student registrations for sessions      │ │
│ │     ├─ id (PK)                                                   │ │
│ │     ├─ student_id (FK → users)                                  │ │
│ │     ├─ session_id (FK → test_sessions)                          │ │
│ │     ├─ registration_status (registered/completed/absent)         │ │
│ │     ├─ UNIQUE(student_id, session_id)                           │ │
│ │     └─ timestamps                                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow for Test Registration

```
STUDENT VIEW                   ADMIN VIEW                  DATABASE
═════════════════════════════════════════════════════════════════════════

Step 1: Initial State
┌─────────────────┐
│ Dashboard Page  │
│ "Available      │
│  Tests"         │
│ [Register] btn  │
└─────────────────┘

Step 2: Click Register
         │
         ├──────► TestRegistrationModal opens
         │        ├─ Test name
         │        ├─ Admin email
         │        └─ Admin phone
         │        (EN/UZ toggle)
         │
         ▼
    Contact Admin
    (Outside System)
                               Step 3: Admin Creates Session
                               ┌──────────────────────┐
                               │ Admin Dashboard      │
                               │ [Create New Session] │
                               │ - Test: IELTS Mock   │
                               │ - Date: 2024-12-20   │
                               │ - Location: Room 101 │
                               │ - Capacity: 30       │
                               └──────────────────────┘
                                      │
                                      ├──► POST /api/test-sessions/create
                                      │
                                      ▼
                               ┌──────────────────────────┐
                               │ Database: test_sessions  │
                               │ id=1                     │
                               │ test_id=1                │
                               │ session_date=2024-12-20  │
                               │ status='scheduled'       │ ◄─── Session Created
                               └──────────────────────────┘

                               Step 4: Admin Registers Students
                               ┌──────────────────────┐
                               │ Admin Dashboard      │
                               │ Bulk Register        │
                               │ Select: Session 1    │
                               │ Students: 1,2,3,4,5  │
                               └──────────────────────┘
                                      │
                                      ├──► POST /api/test-sessions/register-students
                                      │
                                      ▼
                               ┌──────────────────────────────┐
                               │ Database: test_registrations │
                               │ student_id=1, session_id=1   │
                               │ student_id=2, session_id=1   │
                               │ student_id=3, session_id=1   │
                               │ student_id=4, session_id=1   │
                               │ student_id=5, session_id=1   │ ◄─── Students Registered
                               └──────────────────────────────┘

                               Step 5: Admin Starts Session
                               ┌──────────────────────┐
                               │ Admin Dashboard      │
                               │ Sessions List        │
                               │ [Session 1]          │
                               │ Status: [scheduled ▼]│
                               └──────────────────────┘
                                      │
                                      ├──► PATCH /api/test-sessions/1/status
                                      │    { status: "ongoing" }
                                      │
                                      ▼
                               ┌──────────────────────────┐
                               │ Database: test_sessions  │
                               │ id=1                     │
                               │ status='ongoing'         │ ◄─── Status Changed
                               └──────────────────────────┘

Step 6: Check Registrations
┌──────────────────────┐
│ Dashboard Page       │
│ "My Registrations"   │
│ • IELTS Mock         │
│   Dec 20, 10:00 AM   │
│   Room 101           │
│ [Start Test]         │
└──────────────────────┘

Step 7: Start Test Permission Check
         │
         ├──► GET /api/test-sessions/1/can-take-test
         │
         ▼
  Backend Query:
  ├─ Is user registered? (JOIN test_registrations)
  ├─ Is session "ongoing"? (CHECK status)
  ├─ Is session expired? (CHECK date vs NOW)
  │
  ├──► Response: {
  │      can_take: true,
  │      reason: "session_ongoing",
  │      session_status: "ongoing"
  │    }
  │
  ▼
  ✅ Test Page Renders
  Student can take the test!

Step 8: Admin Ends Session (Later)
                               ┌──────────────────────┐
                               │ Admin Dashboard      │
                               │ Sessions List        │
                               │ [Session 1]          │
                               │ Status: [ongoing ▼]  │
                               └──────────────────────┘
                                      │
                                      ├──► PATCH /api/test-sessions/1/status
                                      │    { status: "completed" }
                                      │
                                      ▼
                               ┌──────────────────────────┐
                               │ Database: test_sessions  │
                               │ id=1                     │
                               │ status='completed'       │ ◄─── Session Ended
                               └──────────────────────────┘

Step 9: After Session Ends
         │
         ├──► GET /api/test-sessions/1/can-take-test
         │
         ▼
  Backend Response: {
    can_take: false,
    reason: "session_completed",
    session_status: "completed"
  }
  │
  ▼
  ❌ "Test Access Denied - Session is Completed"
```

---

## Component Interaction Diagram

```
┌──────────────────┐
│    Dashboard     │
│   Component      │
└────────┬─────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
    ┌─────────────────┐          ┌────────────────────────────┐
    │  Available      │          │ TestRegistrationModal      │
    │  Tests Section  │          │                            │
    │                 │          │ Props:                     │
    │ [Register] btn  │────────► │  - isOpen (boolean)        │
    └─────────────────┘          │  - onClose (function)      │
                                 │  - testName (string)       │
                                 │  - adminEmail (string)     │
                                 │  - adminPhone (string)     │
                                 │                            │
                                 │ State:                     │
                                 │  - language (en/uz)        │
                                 │                            │
                                 │ JSX:                       │
                                 │  - Modal overlay           │
                                 │  - Language toggle         │
                                 │  - Test name display       │
                                 │  - Admin info card         │
                                 │  - Email link (mailto)     │
                                 │  - Phone link (tel)        │
                                 │                            │
                                 │ CSS:                       │
                                 │  - Modal styling           │
                                 │  - Dark theme              │
                                 │  - Responsive              │
                                 │  - Animations              │
                                 └────────────────────────────┘

         │
         └─────────────────────────────────────┐
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Services             │
                                    │                      │
                                    │ testSessionService   │
                                    │  • getAvailable()    │
                                    │  • canTakeTest()     │
                                    │  • getMyRegs()       │
                                    │  • createSession()   │
                                    │  • registerStudents()│
                                    │  • updateStatus()    │
                                    │  • getDetails()      │
                                    └──────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ HTTP Requests        │
                                    │ (Axios)              │
                                    │                      │
                                    │ GET, POST, PATCH     │
                                    │ with JWT token       │
                                    └──────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Backend API Routes   │
                                    │ /api/test-sessions/* │
                                    └──────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Database Queries     │
                                    │ (MySQL)              │
                                    │                      │
                                    │ test_sessions        │
                                    │ test_registrations   │
                                    │ users                │
                                    │ tests                │
                                    └──────────────────────┘
```

---

## Permission Check Flow

```
Student Clicks "Start Test"
         │
         ▼
TestPage Component
         │
         ├──► useEffect()
         │
         ▼
Check Test Access
         │
         ├──► GET /api/test-sessions/:id/can-take-test
         │
         ▼
Backend Permission Check
         │
         ├─ Query 1: SELECT * FROM test_registrations
         │           WHERE student_id = ? AND session_id = ?
         │
         │           ├─► NO MATCH? → "not_registered"
         │           └─► FOUND
         │
         ├─ Query 2: SELECT status, session_date FROM test_sessions
         │           WHERE id = ?
         │
         │           ├─ status = "scheduled"  → "session_not_started"
         │           ├─ status = "ongoing"    → ✅ ALLOWED
         │           ├─ status = "completed"  → "session_completed"
         │           └─ status = "cancelled"  → "session_cancelled"
         │
         ├─ Query 3: CHECK session_date vs NOW()
         │           ├─ Date hasn't arrived  → "session_not_started"
         │           └─ Date has passed      → "session_ended"
         │
         ▼
Response to Frontend
         │
         ├─► { can_take: true, ... }     → Show test content
         │
         └─► { can_take: false, ... }    → Show error message

Error Message Examples:
  • "You are not registered for this test."
  • "This test session has not started yet."
  • "This test session has already ended."
  • "This test session was cancelled."
```

---

## State Management Flow

```
App State Tree
│
├─ Auth State (localStorage)
│  ├─ token (JWT)
│  ├─ user { id, role, name, ... }
│  └─ isAuthenticated (boolean)
│
├─ Theme State
│  ├─ theme ('light' or 'dark')
│  └─ Persisted in localStorage
│
└─ Dashboard Component State
   ├─ tests (array)
   ├─ profile (object)
   ├─ results (array)
   ├─ stats (object)
   ├─ loading (boolean)
   ├─ error (string/null)
   │
   ├─ showRegistrationModal (boolean)  ← NEW
   ├─ selectedTestForModal (object)    ← NEW
   └─ ADMIN_EMAIL (constant)           ← NEW
   └─ ADMIN_PHONE (constant)           ← NEW
```

---

## API Request/Response Examples

### 1. Get Available Sessions

```
REQUEST:
  GET /api/test-sessions/available
  Headers: Authorization: Bearer {token}

RESPONSE:
  [
    {
      id: 1,
      test_id: 1,
      test_name: "IELTS Mock 1",
      session_date: "2024-12-20T10:00:00",
      location: "Room 101, Building A",
      max_capacity: 30,
      registered_count: 5,
      status: "scheduled"
    },
    ...
  ]
```

### 2. Check Can Take Test

```
REQUEST:
  GET /api/test-sessions/1/can-take-test
  Headers: Authorization: Bearer {token}

RESPONSE (CAN TAKE):
  {
    can_take: true,
    reason: "session_ongoing",
    session_status: "ongoing",
    session_date: "2024-12-20T10:00:00"
  }

RESPONSE (CANNOT TAKE):
  {
    can_take: false,
    reason: "session_not_started",
    session_status: "scheduled",
    session_date: "2024-12-25T10:00:00"
  }
```

### 3. Admin Creates Session

```
REQUEST:
  POST /api/test-sessions/create
  Headers: Authorization: Bearer {admin_token}
  Body: {
    test_id: 1,
    session_date: "2024-12-20 10:00:00",
    location: "Room 101",
    max_capacity: 30,
    admin_notes: "First batch"
  }

RESPONSE:
  {
    message: "Test session created successfully",
    id: 1,
    status: "scheduled"
  }
```

### 4. Admin Registers Students

```
REQUEST:
  POST /api/test-sessions/register-students
  Headers: Authorization: Bearer {admin_token}
  Body: {
    session_id: 1,
    student_ids: [1, 2, 3, 4, 5]
  }

RESPONSE:
  {
    message: "Students registered successfully",
    registered_count: 5,
    failed_count: 0
  }
```

---

## Database Schema Relationships

```
users (existing)
  │
  ├─► (FK) user_sessions.user_id
  │
  ├─► (FK) test_registrations.student_id
  │         │
  │         └─► (FK) test_sessions.id
  │                   │
  │                   ├─► (FK) tests.id
  │                   │
  │                   └─► (FK) users.id (created_by)
  │
  └─► (FK) results.student_id
           │
           └─► (FK) tests.id


tests (existing)
  │
  ├─► (1:M) test_sessions.test_id
  │
  ├─► (1:M) questions.test_id
  │
  └─► (1:M) results.test_id


test_sessions (NEW)
  │
  ├─► (FK) tests.id
  │
  ├─► (FK) users.id (created_by)
  │
  └─► (1:M) test_registrations.session_id


test_registrations (NEW)
  │
  ├─► (FK) users.id (student_id)
  │
  └─► (FK) test_sessions.id
```

---

## Security Architecture

```
Request Flow
│
├─ Browser → CORS Middleware
│            (Allow cross-origin requests)
│
├─ HTTP Request with JWT
│  ├─ Authorization: Bearer {token}
│  └─ Token stored in localStorage
│
├─ Auth Middleware
│  ├─ Verify JWT signature
│  ├─ Check token expiration
│  ├─ Verify session exists in DB
│  ├─ Check session not expired (24h)
│  └─ Attach user to req.user
│
├─ Route Handler
│  ├─ (Optional) Check role (admin/student)
│  ├─ Validate request body
│  ├─ Execute database queries
│  └─ Return response
│
├─ Error Handling
│  ├─ 400: Bad Request (invalid input)
│  ├─ 401: Unauthorized (no token/expired)
│  ├─ 403: Forbidden (not admin)
│  ├─ 404: Not Found (resource doesn't exist)
│  └─ 500: Server Error
│
└─ Response with CORS Headers
   └─ Access-Control-Allow-Origin: http://localhost:3000
```

---

**All diagrams are complete and ready for reference!**
