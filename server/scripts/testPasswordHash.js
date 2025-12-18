const pool = require("../db");
const bcrypt = require("bcrypt");

const testPasswordHash = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    const phoneNumber = process.argv[2] || "+998915817711";

    // Get the admin user
    const [rows] = await connection.execute(
      "SELECT id, full_name, password, role, status FROM users WHERE phone_number = ?",
      [phoneNumber]
    );

    if (rows.length === 0) {
      console.error("❌ User not found with phone number:", phoneNumber);
      process.exit(1);
    }

    const user = rows[0];
    console.log("\n📋 User Found:");
    console.log("ID:", user.id);
    console.log("Full Name:", user.full_name);
    console.log("Role:", user.role);
    console.log("Status:", user.status);
    console.log(
      "Password Hash (first 50 chars):",
      user.password.substring(0, 50) + "..."
    );

    // Test with the default password
    const testPassword = "DecodeM3";
    console.log("\n🔐 Testing password: " + testPassword);

    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log("Password Match:", isMatch ? "✅ YES" : "❌ NO");

    if (!isMatch) {
      console.log("\n⚠️  Password doesn't match!");
      console.log("This means the stored hash was created differently.");
      console.log("\nYou should reset the password with:");
      console.log(
        `node scripts/fixAdminPassword.js "${phoneNumber}" "DecodeM3"`
      );
    }

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

testPasswordHash();
