# Server

This is a minimal Express server for the CD IELTS Mock platform.

Setup

1. Copy `.env.example` to `.env` and set your MySQL connection details.
2. Install dependencies:

```bash
cd server
npm install express mysql2 dotenv
# optionally for development
npm install --save-dev nodemon
```

Run

```bash
npm run dev
# or
npm start
```

API

- GET /api/users/:id - Returns { exists: true, id, email, full_name } or { exists: false } if not found.
