const pool = require("../db");
const bcrypt = require("bcrypt"); // Use same bcrypt package as server

const fixAdminPassword = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Get the admin user
    const phoneNumber = process.argv[2]; // Pass phone number as argument
    const newPassword = process.argv[3]; // Pass password as argument

    if (!phoneNumber || !newPassword) {
      console.log("Usage: node fixAdminPassword.js <phone_number> <new_password>");
      console.log("Example: node fixAdminPassword.js 1234567890 MyPassword123!");
      process.exit(1);
    }

    // Check if user exists
    const [existingUser] = await connection.execute(
      "SELECT id, role FROM users WHERE phone_number = ?",
      [phoneNumber]
    );

    if (existingUser.length === 0) {
      console.error("❌ User not found with phone number:", phoneNumber);
      process.exit(1);
    }

    const user = existingUser[0];

    // Hash the new password with bcrypt (same as server uses)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    await connection.execute(
      "UPDATE users SET password = ? WHERE phone_number = ?",
      [hashedPassword, phoneNumber]
    );

    console.log("✅ Admin password updated successfully!");
    console.log("\n📝 Login with:");
    console.log("Phone Number:", phoneNumber);
    console.log("Password:", newPassword);
    console.log("Current Role:", user.role);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    await pool.end();
  }
};

fixAdminPassword();
