import React, { useState, useEffect } from "react";
import adminService from "../services/adminService";
import "./AnswerChecker.css";

const AnswerChecker = ({ participant, fetchAnswersFn }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, correct, incorrect, listening, reading

  useEffect(() => {
    fetchAnswers();
  }, [participant.id]);

  const fetchAnswers = async () => {
    try {
      setLoading(true);
      // Use provided fetch function or default to adminService
      const response = fetchAnswersFn
        ? await fetchAnswersFn(participant.id)
        : await adminService.getParticipantAnswers(participant.id);
      setAnswers(response.answers || []);
      setError("");
    } catch (err) {
      setError("Failed to load answers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterAnswers = () => {
    let filtered = answers;

    if (filter === "correct") {
      filtered = filtered.filter((a) => a.is_correct === 1);
    } else if (filter === "incorrect") {
      filtered = filtered.filter((a) => a.is_correct === 0);
    } else if (filter === "listening") {
      filtered = filtered.filter((a) => a.section_type === "listening");
    } else if (filter === "reading") {
      filtered = filtered.filter((a) => a.section_type === "reading");
    }

    return filtered;
  };

  const getStats = () => {
    const listeningAnswers = answers.filter(
      (a) => a.section_type === "listening"
    );
    const readingAnswers = answers.filter((a) => a.section_type === "reading");

    const listeningCorrect = listeningAnswers.filter(
      (a) => a.is_correct === 1
    ).length;
    const readingCorrect = readingAnswers.filter(
      (a) => a.is_correct === 1
    ).length;

    return {
      listeningTotal: listeningAnswers.length,
      listeningCorrect,
      readingTotal: readingAnswers.length,
      readingCorrect,
    };
  };

  const filteredAnswers = filterAnswers();
  const stats = getStats();

  if (loading) {
    return <div className="answer-checker-loading">Loading answers...</div>;
  }

  if (error) {
    return <div className="answer-checker-error">{error}</div>;
  }

  if (answers.length === 0) {
    return (
      <div className="answer-checker-empty">
        No answers found for this participant
      </div>
    );
  }

  return (
    <div className="answer-checker">
      <div className="answer-checker-header">
        <h3>Answer Review for {participant.full_name}</h3>
        <p className="participant-id">ID: {participant.participant_id_code}</p>
      </div>

      <div className="answer-checker-stats">
        <div className="stat-item">
          <label>Listening</label>
          <span className="stat-score">
            {stats.listeningCorrect}/{stats.listeningTotal}
          </span>
        </div>
        <div className="stat-item">
          <label>Reading</label>
          <span className="stat-score">
            {stats.readingCorrect}/{stats.readingTotal}
          </span>
        </div>
      </div>

      <div className="answer-checker-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === "correct" ? "active" : ""}`}
          onClick={() => setFilter("correct")}
        >
          ✓ Correct
        </button>
        <button
          className={`filter-btn ${filter === "incorrect" ? "active" : ""}`}
          onClick={() => setFilter("incorrect")}
        >
          ✗ Incorrect
        </button>
        <button
          className={`filter-btn ${filter === "listening" ? "active" : ""}`}
          onClick={() => setFilter("listening")}
        >
          Listening
        </button>
        <button
          className={`filter-btn ${filter === "reading" ? "active" : ""}`}
          onClick={() => setFilter("reading")}
        >
          Reading
        </button>
      </div>

      <div className="answer-checker-list">
        {filteredAnswers.length === 0 ? (
          <div className="no-results">No answers match the selected filter</div>
        ) : (
          <div className="answers-table">
            <div className="answers-table-header">
              <div className="cell cell-q">Q</div>
              <div className="cell cell-type">Section</div>
              <div className="cell cell-your">Your Answer</div>
              <div className="cell cell-correct">Correct</div>
              <div className="cell cell-status">Status</div>
            </div>
            <div className="answers-table-body">
              {filteredAnswers.map((answer) => (
                <div
                  key={`${answer.section_type}-${answer.question_number}`}
                  className={`answers-table-row ${
                    answer.is_correct ? "correct" : "incorrect"
                  }`}
                >
                  <div className="cell cell-q">{answer.question_number}</div>
                  <div className="cell cell-type">
                    {answer.section_type === "listening" ? "L" : "R"}
                  </div>
                  <div className="cell cell-your">
                    {answer.user_answer || <span className="empty">—</span>}
                  </div>
                  <div className="cell cell-correct">
                    {answer.is_correct
                      ? answer.user_answer
                      : answer.correct_answer}
                  </div>
                  <div className="cell cell-status">
                    {answer.is_correct ? (
                      <span className="status-badge status-correct">
                        <svg width="14" height="14" viewBox="0 0 20 20">
                          <path
                            d="M6 10l3 3 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="status-badge status-incorrect">
                        <svg width="14" height="14" viewBox="0 0 20 20">
                          <path
                            d="M7 7l6 6M13 7l-6 6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerChecker;
