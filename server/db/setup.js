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
      {
        name: "participant_status",
        type: "ENUM('unused', 'in_progress', 'expired') DEFAULT 'unused'",
      },
      { name: "status_updated_at", type: "DATETIME" },
      { name: "ip_address", type: "VARCHAR(45)" },
      { name: "device_locked_at", type: "DATETIME" },
      { name: "device_id", type: "VARCHAR(100)" },
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

    // Table for test materials (passages, answer keys, audio)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        material_type ENUM('passages', 'answers', 'audio') NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_url VARCHAR(500),
        file_size BIGINT,
        uploaded_by INT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
        KEY idx_test_type (test_id, material_type)
      )
    `);

    // Table for test passages (Reading/Listening content)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_passages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        section_type ENUM('reading', 'listening', 'writing') NOT NULL,
        section_number INT NOT NULL,
        passage_number INT,
        title VARCHAR(255),
        content LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        KEY idx_test_section (test_id, section_type),
        UNIQUE KEY unique_passage (test_id, section_type, section_number, passage_number)
      )
    `);

    // Table for test questions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        passage_id INT,
        section_type ENUM('reading', 'listening', 'writing') NOT NULL,
        section_number INT NOT NULL,
        question_number INT NOT NULL,
        question_text LONGTEXT NOT NULL,
        question_type VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (passage_id) REFERENCES test_passages(id) ON DELETE SET NULL,
        KEY idx_test_passage (test_id, passage_id),
        KEY idx_test_section (test_id, section_type)
      )
    `);

    // Table for question options (for multiple choice questions)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS question_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        option_label VARCHAR(10) NOT NULL,
        option_text LONGTEXT NOT NULL,
        is_correct BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE,
        KEY idx_question (question_id),
        UNIQUE KEY unique_option (question_id, option_label)
      )
    `);

    // Table for answer keys
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS question_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        answer_text LONGTEXT NOT NULL,
        answer_type ENUM('text', 'multiple_choice', 'true_false') NOT NULL,
        explanation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE,
        KEY idx_question (question_id)
      )
    `);

    // Table for storing participant answers (listening and reading)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS participant_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        participant_id INT NOT NULL,
        participant_id_code VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        section_type ENUM('listening', 'reading') NOT NULL,
        question_number INT NOT NULL,
        user_answer LONGTEXT,
        correct_answer LONGTEXT,
        is_correct BOOLEAN,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (participant_id) REFERENCES test_participants(id) ON DELETE CASCADE,
        KEY idx_session_participant (session_id, participant_id),
        KEY idx_section_type (section_type),
        UNIQUE KEY unique_answer (participant_id, section_type, question_number)
      )
    `);

    // Table for writing essay submissions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS writing_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        participant_id INT NOT NULL,
        participant_id_code VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(255),
        task_1_content LONGTEXT,
        task_2_content LONGTEXT,
        task_1_word_count INT DEFAULT 0,
        task_2_word_count INT DEFAULT 0,
        writing_score DECIMAL(5, 2),
        admin_notes TEXT,
        is_reviewed BOOLEAN DEFAULT 0,
        reviewed_by INT,
        reviewed_at DATETIME,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (participant_id) REFERENCES test_participants(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        KEY idx_session_participant (session_id, participant_id),
        KEY idx_reviewed (is_reviewed)
      )
    `);

    // Add missing columns to writing_submissions if they don't exist
    try {
      await connection.execute(`
        ALTER TABLE writing_submissions ADD COLUMN full_name VARCHAR(255)
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        console.log("Note: full_name column:", err.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE writing_submissions ADD COLUMN phone_number VARCHAR(255)
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        console.log("Note: phone_number column:", err.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE writing_submissions ADD COLUMN writing_score DECIMAL(5, 2)
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        console.log("Note: writing_score column:", err.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE writing_submissions ADD COLUMN is_reviewed BOOLEAN DEFAULT 0
      `);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") {
        console.log("Note: is_reviewed column:", err.message);
      }
    }

    console.log("Database tables created successfully.");
  } catch (err) {
    console.error("Error creating database tables:", err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = setupDatabase;
