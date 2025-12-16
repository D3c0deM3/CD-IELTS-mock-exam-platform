const express = require("express");
const cors = require("cors");

const usersRoute = require("./routes/users");
const adminRoute = require("./routes/admin");
const testsRoute = require("./routes/tests");
const dashboardRoute = require("./routes/dashboard");
const testSessionsRoute = require("./routes/testSessions");
const pdfUploadRoute = require("./routes/pdf-upload");
const materialsRoute = require("./routes/materials");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const cors = require("cors");

// dotenv ONLY for local development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
const setupDatabase = require("./db/setup");

// -------------------- HEALTHCHECK (FIRST) --------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// -------------------- MIDDLEWARE --------------------
app.use(
  cors({
    origin: ["http://localhost:3000", "https://cd-ielts.netlify.app"],
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // DB init happens AFTER server is alive
  setupDatabase()
    .then(() => console.log("Database initialized"))
    .catch((err) =>
      console.error("Database init failed (non-fatal):", err.message)
    );
});
