const pool = require("../db");
const bcrypt = require("bcryptjs");

const insertAdmin = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Admin credentials - CHANGE THESE!
    const fullName = "Admin";
    const phoneNumber = "+998915817711"; // Use a phone number format
    const password = "DecodeM3"; // Change this to a secure password
    const role = "admin";
    const status = "active";

    // Hash the password using bcryptjs (same as server uses)
    const hashedPassword = await bcrypt.hash(password, 10);

    // First, check if user already exists
    const [existingUser] = await connection.execute(
      "SELECT id FROM users WHERE phone_number = ?",
      [phoneNumber]
    );

    if (existingUser.length > 0) {
      // Update existing user to admin
      await connection.execute(
        "UPDATE users SET role = ?, password = ?, status = ? WHERE phone_number = ?",
        [role, hashedPassword, status, phoneNumber]
      );
      console.log("✅ Admin user updated successfully!");
    } else {
      // Insert new admin user
      const result = await connection.execute(
        "INSERT INTO users (full_name, phone_number, password, role, status) VALUES (?, ?, ?, ?, ?)",
        [fullName, phoneNumber, hashedPassword, role, status]
      );
      console.log("✅ Admin user inserted successfully!");
      console.log("Admin ID:", result[0].insertId);
    }

    console.log("\n📝 Login with these credentials:");
    console.log("Phone Number:", phoneNumber);
    console.log("Password:", password);
    console.log("Role:", role);
    console.log("Status:", status);
    console.log("\n⚠️  Change the password immediately after first login!");

    process.exit(0);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.error("❌ Admin user already exists with this phone number.");
    } else {
      console.error("❌ Error inserting admin user:", err.message);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    await pool.end();
  }
};

insertAdmin();
