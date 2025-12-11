const express = require("express");
const cors = require("cors");
const app = express();
const usersRoute = require("./routes/users");
const adminRoute = require("./routes/admin");
const testsRoute = require("./routes/tests");
require("dotenv").config();

const setupDatabase = require("./db/setup");

async function start() {
  try {
    await setupDatabase();

    // Enable CORS for frontend communication
    app.use(
      cors({
        origin: ["http://localhost:3000", "http://localhost:3001"],
        credentials: true,
      })
    );

    app.use(express.json());
    app.use("/api/users", usersRoute);
    app.use("/api/admin", adminRoute);
    app.use("/api/tests", testsRoute);

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
