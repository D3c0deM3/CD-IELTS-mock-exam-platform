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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        session_date DATETIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        max_capacity INT,
        status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
        admin_notes TEXT,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        session_id INT NOT NULL,
        registration_status ENUM('registered', 'attended', 'absent', 'cancelled') DEFAULT 'registered',
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_session (student_id, session_id)
      )
    `);

    // Table for test participants with assigned IDs and score tracking
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        participant_id_code VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(255),
        listening_score DECIMAL(5, 2),
        reading_score DECIMAL(5, 2),
        writing_score DECIMAL(5, 2),
        speaking_score DECIMAL(5, 2),
        has_entered_startscreen BOOLEAN DEFAULT 0,
        entered_at DATETIME,
        test_started BOOLEAN DEFAULT 0,
        test_started_at DATETIME,
        current_screen VARCHAR(50) DEFAULT 'not_started',
        test_status VARCHAR(50) DEFAULT 'not_started',
        last_activity_at DATETIME,
        test_completed_at DATETIME,
        total_pause_duration INT DEFAULT 0,
        paused_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
      )
    `);

    // Add new timing fields to test_sessions if they don't exist
    try {
      await connection.execute(`
        ALTER TABLE test_sessions ADD COLUMN test_started_at DATETIME
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        throw err;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE test_sessions ADD COLUMN test_end_at DATETIME
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        throw err;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE test_sessions ADD COLUMN test_paused_at DATETIME
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        throw err;
      }
    }

    // Add missing columns to test_participants if they don't exist
    const missingColumns = [
      { name: "listening_score", type: "DECIMAL(5, 2)" },
      { name: "reading_score", type: "DECIMAL(5, 2)" },
      { name: "current_screen", type: "VARCHAR(50) DEFAULT 'not_started'" },
      { name: "test_status", type: "VARCHAR(50) DEFAULT 'not_started'" },
      { name: "last_activity_at", type: "DATETIME" },
      { name: "test_completed_at", type: "DATETIME" },
      { name: "total_pause_duration", type: "INT DEFAULT 0" },
      { name: "paused_at", type: "DATETIME" },
    ];

    for (const column of missingColumns) {
      try {
        await connection.execute(`
          ALTER TABLE test_participants ADD COLUMN ${column.name} ${column.type}
        `);
      } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
          throw err;
        }
      }
    }

    // Table for test configuration with section timings (IELTS standard durations)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL UNIQUE,
        listening_minutes INT DEFAULT 40,
        reading_minutes INT DEFAULT 60,
        writing_minutes INT DEFAULT 60,
        speaking_minutes INT DEFAULT 15,
        total_minutes INT GENERATED ALWAYS AS (listening_minutes + reading_minutes + writing_minutes + 60) STORED,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
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
