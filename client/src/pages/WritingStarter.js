import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./WritingStarter.css";

function WritingStarter() {
  const navigate = useNavigate();
  const [agreedToStart, setAgreedToStart] = useState(false);
  const idCode = localStorage.getItem("ielts_mock_user_id") || "Test Candidate";

  // Handle start test
  const handleStartTest = () => {
    if (!agreedToStart) {
      alert("Please confirm you are ready to start");
      return;
    }
    // Navigate to writing section
    navigate("/test/writing", {
      state: { startTime: new Date().toISOString() },
    });
  };

  // Security: Prevent navigation away
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="writing-starter">
      <ThemeToggle />

      <div className="writing-container">
        {/* Header */}
        <div className="writing-header">
          <div className="header-content">
            <h1>Writing Test - Task Instructions</h1>
            <p className="candidate-info">Candidate: {idCode}</p>
          </div>
          <div className="header-badge">
            <span className="section-label">Section 3</span>
            <span className="time-label">60 minutes</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="writing-content">
          {/* Task 1 */}
          <div className="task-panel">
            <h2>
              <span className="icon">📊</span>
              Task 1: Academic Writing (20 minutes)
            </h2>

            <div className="task-content">
              <div className="task-description">
                <h4>Objective</h4>
                <p>
                  You will be shown a graph, table, chart, or diagram. You must
                  write at least 150 words describing the key information
                  presented.
                </p>
              </div>

              <div className="task-requirements">
                <h4>Key Requirements</h4>
                <ul>
                  <li>
                    <strong>Minimum 150 words</strong> - Write below this will
                    lose marks
                  </li>
                  <li>
                    <strong>Describe main features</strong> - Focus on the most
                    important information
                  </li>
                  <li>
                    <strong>Make comparisons</strong> - Where relevant, compare
                    different data points
                  </li>
                  <li>
                    <strong>Use academic vocabulary</strong> - Formal and
                    professional tone
                  </li>
                  <li>
                    <strong>Good grammar and spelling</strong> - Accuracy is
                    important
                  </li>
                  <li>
                    <strong>Organized paragraphs</strong> - Introduction, body,
                    conclusion
                  </li>
                </ul>
              </div>

              <div className="tips-box">
                <h4>💡 Writing Tips</h4>
                <ul>
                  <li>Don't copy text from the task - use your own words</li>
                  <li>Introduce the visual before describing it</li>
                  <li>Use varied sentence structures</li>
                  <li>Spend 2-3 minutes planning before writing</li>
                  <li>Leave time to proofread your work</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Task 2 */}
          <div className="task-panel">
            <h2>
              <span className="icon">✍️</span>
              Task 2: Essay Writing (40 minutes)
            </h2>

            <div className="task-content">
              <div className="task-description">
                <h4>Objective</h4>
                <p>
                  You will be given a topic with 1-3 questions. You must write
                  an essay of at least 250 words presenting your ideas clearly
                  and persuasively.
                </p>
              </div>

              <div className="task-requirements">
                <h4>Key Requirements</h4>
                <ul>
                  <li>
                    <strong>Minimum 250 words</strong> - Significantly below
                    this loses marks
                  </li>
                  <li>
                    <strong>Address all parts</strong> - Answer all questions
                    posed
                  </li>
                  <li>
                    <strong>Present ideas clearly</strong> - Your position
                    should be obvious
                  </li>
                  <li>
                    <strong>Support with examples</strong> - Use specific,
                    relevant examples
                  </li>
                  <li>
                    <strong>Logical organization</strong> - Introduction, body
                    paragraphs, conclusion
                  </li>
                  <li>
                    <strong>Academic tone</strong> - Formal and professional
                    language
                  </li>
                </ul>
              </div>

              <div className="tips-box">
                <h4>💡 Essay Tips</h4>
                <ul>
                  <li>Spend 5 minutes planning your essay structure</li>
                  <li>Write clear topic sentences for each paragraph</li>
                  <li>
                    Use linking words and phrases (Furthermore, In addition,
                    etc.)
                  </li>
                  <li>
                    Write a strong conclusion that summarizes your main points
                  </li>
                  <li>
                    Allocate time: Planning (5 min), Writing (30 min), Checking
                    (5 min)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* General Tips */}
        <div className="general-tips">
          <h2>
            <span className="icon">⭐</span>
            Important Information
          </h2>

          <div className="tips-grid">
            <div className="tip-card">
              <h4>Legibility</h4>
              <p>Write clearly and neatly. Illegible text cannot be marked.</p>
            </div>

            <div className="tip-card">
              <h4>Spelling</h4>
              <p>
                British English spelling is preferred (e.g., "colour" not
                "color")
              </p>
            </div>

            <div className="tip-card">
              <h4>Word Count</h4>
              <p>
                Count your words carefully. Aim for 160+ words (Task 1) and 270+
                (Task 2)
              </p>
            </div>

            <div className="tip-card">
              <h4>Handwriting</h4>
              <p>
                If writing by hand, use a black or blue pen and write in CAPITAL
                letters for better clarity
              </p>
            </div>

            <div className="tip-card">
              <h4>No Bullet Points</h4>
              <p>
                Write in full sentences and paragraphs. Bullet points are not
                allowed.
              </p>
            </div>

            <div className="tip-card">
              <h4>Time Management</h4>
              <p>
                Task 1 (20 min): Plan (2), Write (15), Check (3) | Task 2 (40
                min): Plan (5), Write (30), Check (5)
              </p>
            </div>
          </div>
        </div>

        {/* Ready to Start Section */}
        <div className="ready-to-start-section">
          <div className="confirmation-box">
            <h3>Ready to Begin?</h3>

            <div className="checklist">
              <label className="checkbox-item">
                <input type="checkbox" disabled checked />
                <span>I understand the requirements for both tasks</span>
              </label>
              <label className="checkbox-item">
                <input type="checkbox" disabled checked />
                <span>
                  I know the minimum word count requirements (150 and 250 words)
                </span>
              </label>
              <label className="checkbox-item">
                <input type="checkbox" disabled checked />
                <span>I am familiar with the assessment criteria</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={agreedToStart}
                  onChange={(e) => setAgreedToStart(e.target.checked)}
                />
                <span>I am ready to start the writing test</span>
              </label>
            </div>

            <button
              className="start-button"
              onClick={handleStartTest}
              disabled={!agreedToStart}
            >
              <span className="button-icon">▶</span>
              Start Writing Test
            </button>

            <p className="disclaimer">
              You have 60 minutes total for both tasks. Once you start, the
              timer cannot be paused. Plan your time carefully.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WritingStarter;
