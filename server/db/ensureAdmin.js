const pool = require("../db");
const bcrypt = require("bcrypt"); // Use bcrypt, not bcryptjs for consistency with login route

const ensureAdminExists = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Admin credentials
    const fullName = "Admin";
    const phoneNumber = "+998915817711";
    const password = "DecodeM3";
    const role = "admin";
    const status = "active";

    // Check if admin already exists
    const [existingAdmin] = await connection.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phoneNumber]
    );

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Hash the password using bcrypt (same as server's login uses)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new admin user
    const result = await connection.execute(
      "INSERT INTO users (full_name, phone_number, password, role, status) VALUES (?, ?, ?, ?, ?)",
      [fullName, phoneNumber, hashedPassword, role, status]
    );

    console.log("✅ Admin user created automatically!");
    console.log("   Phone:", phoneNumber);
    console.log("   Password:", password);
  } catch (err) {
    console.error("⚠️  Could not create admin user:", err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = ensureAdminExists;
