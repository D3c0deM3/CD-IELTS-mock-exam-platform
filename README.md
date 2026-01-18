# IELTS CD Mock Platform

IELTS Computer Delivered mock testing platform with a React client and Express
API. Admins manage tests, sessions, participants, and test materials. Students
check in with an ID code and complete Listening, Reading, and Writing sections.

## Overview
- Client: React app for students and admin dashboard.
- Server: Express API with MySQL persistence and JWT auth.
- Materials: Test content + answer keys stored as JSON in the database. Audio
  files are stored on disk and served from `/uploads/audio`.

## Tech Stack
- React 19, react-router, axios
- Express 5, mysql2, multer
- Optional: Python 3 (PDF converter utilities)

## Project Structure
- `client/` React app
- `server/` Express API + DB setup
- `server/uploads/` Uploaded files (audio, materials, pdfs)

## Material Formats
Use the existing mock files as the canonical shapes:
- Content JSON example: `client/src/pages/mock_2.json`
- Answer key JSON example: `server/routes/answers.json`

Audio files are stored in `server/uploads/audio` and served by the server at
`/uploads/audio/<filename>`.

## Setup
### Prerequisites
- Node.js 18+
- MySQL 8+
- (Optional) Python 3 for PDF conversion workflows

### Server
1. Create a MySQL database (default name: `cd_mock`).
2. Configure environment variables:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
3. Install and run:
   ```bash
   cd server
   npm install
   npm run dev
   ```
Server runs at `http://localhost:4000`.

### Client
1. Install and run:
   ```bash
   cd client
   npm install
   npm start
   ```
Client runs at `http://localhost:3000`.

To point the client at a different API:
- Set `REACT_APP_API_URL` in `client/.env`.

## Admin Workflow (Materials)
1. Create a Test in the Admin Dashboard.
2. Open "Upload Materials" and select the Test.
3. Create a Material Set name (e.g., "Mock 4 - IELTS Academic").
4. Paste or upload Content JSON and Answer Keys JSON.
5. Upload the Listening audio file.
6. Create a Session and select the Material Set.

Deleting a material set will also delete its audio file and any legacy
materials associated with that test in `test_materials`.

## Notes
- Answer keys load from the DB first; the server falls back to the legacy
  `answers.json` files if a DB set is missing.
- The PDF converter route is available but optional. The new materials flow
  supports JSON directly.

## Scripts
Client:
- `npm start` - run React dev server
- `npm build` - production build

Server:
- `npm run dev` - run API with nodemon
- `npm start` - run API with node
