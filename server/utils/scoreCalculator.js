/**
 * Score Calculator for IELTS Writing Section
 * Compares user answers with correct answers from answers.json
 */

const fs = require("fs");
const path = require("path");

/**
 * Load the correct answers from answers.json
 * @returns {Object} The answers data
 */
const loadAnswersKey = () => {
  try {
    const answersPath = path.join(__dirname, "../routes/answers.json");
    const answersData = fs.readFileSync(answersPath, "utf8");
    return JSON.parse(answersData);
  } catch (error) {
    console.error("Error loading answers.json:", error);
    throw new Error("Failed to load answer key");
  }
};

/**
 * Normalize text for comparison (uppercase, trim whitespace)
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
const normalizeText = (text) => {
  if (!text) return "";
  return text.trim().toUpperCase().replace(/\s+/g, " "); // Normalize multiple spaces
};

/**
 * Calculate writing score based on user answers
 * For writing section, we primarily count correct word counts and formatting
 * Since writing is subjective, this returns a preliminary auto-score
 * @param {Object} userAnswers - User's written answers { task_number: answer_text }
 * @param {Object} testData - Test metadata
 * @returns {Object} Score details
 */
const calculateWritingScore = (userAnswers, testData = {}) => {
  const scores = {
    task_1: {
      word_count: 0,
      meets_minimum: false,
      preliminary_score: 0,
    },
    task_2: {
      word_count: 0,
      meets_minimum: false,
      preliminary_score: 0,
    },
    auto_score: 0, // Will be 0 until admin reviews
    status: "pending_review", // pending_review, reviewed
  };

  // Task 1 requirements (minimum 150 words)
  if (userAnswers[1]) {
    const task1Text = userAnswers[1];
    const task1WordCount = task1Text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    scores.task_1.word_count = task1WordCount;
    scores.task_1.meets_minimum = task1WordCount >= 150;

    // Preliminary auto-score based on word count
    if (task1WordCount >= 150) {
      scores.task_1.preliminary_score = 5; // Base score for meeting minimum
      // Could add more sophisticated scoring here
    }
  }

  // Task 2 requirements (minimum 250 words)
  if (userAnswers[2]) {
    const task2Text = userAnswers[2];
    const task2WordCount = task2Text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    scores.task_2.word_count = task2WordCount;
    scores.task_2.meets_minimum = task2WordCount >= 250;

    // Preliminary auto-score based on word count
    if (task2WordCount >= 250) {
      scores.task_2.preliminary_score = 5; // Base score for meeting minimum
      // Could add more sophisticated scoring here
    }
  }

  return scores;
};

/**
 * Compare user listening/reading answers with answer key
 * @param {Array} userAnswers - Array of user answers [ { question: 1, answer: "ABC" }, ... ]
 * @param {Array} correctAnswers - Array of correct answers from answers.json
 * @param {string} section - "listening" or "reading"
 * @returns {Object} Comparison results
 */
const compareAnswers = (userAnswers, correctAnswers, section) => {
  const results = {
    correct: 0,
    incorrect: 0,
    details: [],
  };

  if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) {
    console.error("Invalid answers format");
    return results;
  }

  userAnswers.forEach((userAnswer) => {
    const questionNum = userAnswer.question;
    const userAns = normalizeText(userAnswer.answer);

    const correctAnswer = correctAnswers.find(
      (a) => a.question === questionNum
    );

    if (correctAnswer) {
      const correctAns = normalizeText(correctAnswer.answer);
      const isCorrect = userAns === correctAns;

      if (isCorrect) {
        results.correct++;
      } else {
        results.incorrect++;
      }

      results.details.push({
        question: questionNum,
        user_answer: userAns,
        correct_answer: correctAns,
        is_correct: isCorrect,
      });
    }
  });

  return results;
};

/**
 * Calculate band score based on raw score
 * Using Cambridge official conversion tables
 * @param {number} rawScore - Number of correct answers
 * @param {string} section - "listening" or "reading"
 * @returns {number} Band score (0-9)
 */
const calculateBandScore = (rawScore, section) => {
  const bandTable =
    section === "listening" || section === "reading"
      ? [
          { min: 39, max: 40, band: 9.0 },
          { min: 37, max: 38, band: 8.5 },
          { min: 35, max: 36, band: 8.0 },
          { min: 33, max: 34, band: 7.5 },
          { min: 30, max: 32, band: 7.0 },
          { min: 27, max: 29, band: 6.5 },
          { min: 23, max: 26, band: 6.0 },
          { min: 19, max: 22, band: 5.5 },
          { min: 15, max: 18, band: 5.0 },
          { min: 13, max: 14, band: 4.5 },
          { min: 10, max: 12, band: 4.0 },
          { min: 7, max: 9, band: 3.5 },
          { min: 5, max: 6, band: 3.0 },
          { min: 3, max: 4, band: 2.5 },
          { min: 1, max: 2, band: 2.0 },
          { min: 0, max: 0, band: 0.0 },
        ]
      : [];

  const entry = bandTable.find(
    (item) => rawScore >= item.min && rawScore <= item.max
  );
  return entry ? entry.band : 0.0;
};

/**
 * Process and score writing answers
 * @param {Object} writingAnswers - User's writing answers
 * @returns {Object} Processed score object
 */
const processWritingScore = (writingAnswers) => {
  const scoreData = calculateWritingScore(writingAnswers);

  return {
    writing_raw_score: scoreData,
    writing_band_score: 0, // To be set by admin after manual review
    writing_preliminary_score: 0, // Auto-calculated based on requirements met
    is_writing_scored: false,
    writing_status: "pending_admin_review",
    writing_answers_submitted: true,
    submitted_at: new Date(),
  };
};

/**
 * Normalize answer for comparison (handles abbreviations)
 * @param {string} answer - Answer to normalize
 * @returns {string} Normalized answer
 */
const normalizeAnswer = (answer) => {
  if (!answer) return "";
  const normalized = normalizeText(answer);

  // Convert abbreviated answers
  switch (normalized) {
    case "T":
    case "TRUE":
      return "T";
    case "F":
    case "FALSE":
      return "F";
    case "NG":
    case "NOT GIVEN":
      return "NG";
    case "Y":
    case "YES":
      return "Y";
    case "N":
    case "NO":
      return "N";
    default:
      return normalized;
  }
};

/**
 * Calculate listening score and return both raw and band score
 * @param {Object} userAnswers - User's listening answers { question_number: answer }
 * @returns {Object} { rawScore, bandScore }
 */
const calculateListeningScore = (userAnswers) => {
  try {
    const answersKey = loadAnswersKey();
    const correctAnswers = answersKey.answers.listening;

    let correctCount = 0;

    correctAnswers.forEach((item) => {
      // Check both string and numeric keys for the answer
      const userAnswer =
        userAnswers[item.question] || userAnswers[String(item.question)];

      if (
        userAnswer &&
        normalizeAnswer(userAnswer) === normalizeAnswer(item.answer)
      ) {
        correctCount++;
      }
    });

    console.log(`Listening score calculation: ${correctCount}/40 correct`);
    const bandScore = calculateBandScore(correctCount, "listening");
    console.log(`Listening band score: ${bandScore}`);
    return { rawScore: correctCount, bandScore: bandScore };
  } catch (error) {
    console.error("Error calculating listening score:", error);
    return { rawScore: 0, bandScore: 0 };
  }
};

/**
 * Calculate reading score and return both raw and band score
 * @param {Object} userAnswers - User's reading answers { question_number: answer }
 * @returns {Object} { rawScore, bandScore }
 */
const calculateReadingScore = (userAnswers) => {
  try {
    const answersKey = loadAnswersKey();
    const correctAnswers = answersKey.answers.reading;

    let correctCount = 0;

    correctAnswers.forEach((item) => {
      // Check both string and numeric keys for the answer
      const userAnswer =
        userAnswers[item.question] || userAnswers[String(item.question)];

      if (
        userAnswer &&
        normalizeAnswer(userAnswer) === normalizeAnswer(item.answer)
      ) {
        correctCount++;
      }
    });

    console.log(`Reading score calculation: ${correctCount}/40 correct`);
    const bandScore = calculateBandScore(correctCount, "reading");
    console.log(`Reading band score: ${bandScore}`);
    return { rawScore: correctCount, bandScore: bandScore };
  } catch (error) {
    console.error("Error calculating reading score:", error);
    return { rawScore: 0, bandScore: 0 };
  }
};

module.exports = {
  loadAnswersKey,
  normalizeText,
  calculateWritingScore,
  calculateListeningScore,
  calculateReadingScore,
  compareAnswers,
  calculateBandScore,
  processWritingScore,
};
