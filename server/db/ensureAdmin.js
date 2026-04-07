const pool = require("../db");
const bcrypt = require("bcrypt"); // Use bcrypt, not bcryptjs for consistency with login route

const ensureAdminExists = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    const fullName = process.env.ADMIN_FULL_NAME || "Admin";
    const phoneNumber = process.env.ADMIN_PHONE_NUMBER;
    const password = process.env.ADMIN_PASSWORD;
    const role = "admin";
    const status = "active";

    if (!phoneNumber || !password) {
      console.log("Admin auto-create skipped: ADMIN_PHONE_NUMBER and ADMIN_PASSWORD are not set");
      return;
    }

    // Check if admin already exists
    const [existingAdmin] = await connection.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phoneNumber]
    );

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    // Hash the password using bcrypt (same as server's login uses)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new admin user
    await connection.execute(
      "INSERT INTO users (full_name, phone_number, password, role, status) VALUES (?, ?, ?, ?, ?)",
      [fullName, phoneNumber, hashedPassword, role, status]
    );

    console.log("Admin user created automatically.");
  } catch (err) {
    console.error("Could not create admin user:", err.message);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = ensureAdminExists;
