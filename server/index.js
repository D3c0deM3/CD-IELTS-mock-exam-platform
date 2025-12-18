const express = require("express");

// Load .env early
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const usersRoute = require("./routes/users");
const adminRoute = require("./routes/admin");
const testsRoute = require("./routes/tests");
const dashboardRoute = require("./routes/dashboard");
const testSessionsRoute = require("./routes/testSessions");
const pdfUploadRoute = require("./routes/pdf-upload");
const materialsRoute = require("./routes/materials");

const cors = require("cors");

const app = express();
const setupDatabase = require("./db/setup");
const ensureAdminExists = require("./db/ensureAdmin");

// -------------------- HEALTHCHECK (FIRST) --------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// -------------------- MIDDLEWARE --------------------
const corsOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://cd-ielts.netlify.app",
        "https://cd-ielts-mock-exam-platform-production.up.railway.app",
        process.env.RAILWAY_PUBLIC_DOMAIN,
      ].filter(Boolean)
    : ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static("uploads"));

// -------------------- ROUTES --------------------
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/tests", require("./routes/tests"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/test-sessions", require("./routes/testSessions"));
app.use("/api/pdf-upload", require("./routes/pdf-upload"));
app.use("/api/materials", require("./routes/materials"));

// -------------------- START SERVER FIRST --------------------
const PORT = process.env.PORT || 4000;
const ENV = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${ENV})`);

  // DB init happens AFTER server is alive
  setupDatabase()
    .then(() => {
      console.log("Database initialized");
      // Ensure admin user exists
      return ensureAdminExists();
    })
    .then(() => console.log("Admin check complete"))
    .catch((err) =>
      console.error("Database init failed (non-fatal):", err.message)
    );
});
