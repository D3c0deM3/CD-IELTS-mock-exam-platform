const express = require("express");
const cors = require("cors");
const app = express();
const usersRoute = require("./routes/users");
const adminRoute = require("./routes/admin");
const testsRoute = require("./routes/tests");
const dashboardRoute = require("./routes/dashboard");
const testSessionsRoute = require("./routes/testSessions");
const pdfUploadRoute = require("./routes/pdf-upload");
const materialsRoute = require("./routes/materials");
require("dotenv").config();

const setupDatabase = require("./db/setup");

async function start() {
  try {
    await setupDatabase();

    // Enable CORS for frontend communication
    app.use(
      cors({
        origin: [
          "http://localhost:3000", // Local development
          "https://cd-ielts.netlify.app", // ← ADD YOUR NETLIFY URL HERE
          "https://*.netlify.app", // Allow all Netlify subdomains
        ],
        credentials: true,
      })
    );

    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

    // Serve uploaded materials
    app.use("/uploads", express.static("uploads"));

    app.use("/api/users", usersRoute);
    app.use("/api/admin", adminRoute);
    app.use("/api/tests", testsRoute);
    app.use("/api/dashboard", dashboardRoute);
    app.use("/api/test-sessions", testSessionsRoute);
    app.use("/api/pdf-upload", pdfUploadRoute);
    app.use("/api/materials", materialsRoute);

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
