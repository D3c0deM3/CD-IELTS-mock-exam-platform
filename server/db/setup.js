const pool = require("../db");

const setupDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Creating database tables if they don't exist...");

    // Create parent tables (without dropping - preserves data on restart)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(255) DEFAULT 'student',
        status ENUM('active', 'inactive') DEFAULT 'inactive'
      )
    `);

    // Add status column if it doesn't exist (for existing databases)
    try {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'inactive'
      `);
    } catch (err) {
      // Column might already exist, ignore error
      if (err.code !== "ER_DUP_FIELDNAME") {
        throw err;
      }
    }

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        type VARCHAR(255),
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_type VARCHAR(255),
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        answer_text TEXT NOT NULL,
        is_correct BOOLEAN,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(512) NOT NULL,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_id INT,
        answer_text TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE SET NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        test_id INT NOT NULL,
        reading_score DECIMAL(5, 2),
        listening_score DECIMAL(5, 2),
        writing_score DECIMAL(5, 2),
        speaking_score DECIMAL(5, 2),
        total_score DECIMAL(5, 2),
        reading_completed BOOLEAN DEFAULT 0,
        listening_completed BOOLEAN DEFAULT 0,
        writing_completed BOOLEAN DEFAULT 0,
        speaking_completed BOOLEAN DEFAULT 0,
        is_writing_scored BOOLEAN DEFAULT 0,
        is_speaking_scored BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_test (student_id, test_id)
      )
    `);

    console.log("Database tables created successfully.");
  } catch (err) {
    console.error("Error creating database tables:", err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = setupDatabase;
