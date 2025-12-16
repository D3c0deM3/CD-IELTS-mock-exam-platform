import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./ReadingStarter.css";

function ReadingStarter() {
  const navigate = useNavigate();
  const [agreedToStart, setAgreedToStart] = useState(false);
  const idCode = localStorage.getItem("ielts_mock_user_id") || "Test Candidate";

  // Handle start test
  const handleStartTest = () => {
    if (!agreedToStart) {
      alert("Please confirm you are ready to start");
      return;
    }
    // Navigate to reading section
    navigate("/test/reading", {
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
    <div className="reading-starter">
      <ThemeToggle />

      <div className="reading-container">
        {/* Header */}
        <div className="reading-header">
          <div className="header-content">
            <h1>Reading Test - Instructions & Guidelines</h1>
            <p className="candidate-info">Candidate: {idCode}</p>
          </div>
          <div className="header-badge">
            <span className="section-label">Section 2</span>
            <span className="time-label">60 minutes</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="reading-content">
          {/* Instructions */}
          <div className="instructions-panel">
            <h2>
              <span className="icon">📖</span>
              Test Instructions
            </h2>

            <div className="instructions-content">
              <div className="instruction-item">
                <h4>Test Format</h4>
                <ul>
                  <li>3 reading passages with increasing difficulty</li>
                  <li>40 questions total across all passages</li>
                  <li>60 minutes total duration</li>
                  <li>
                    Question types: True/False/Not Given, Multiple Choice,
                    Matching, Gap Fill
                  </li>
                </ul>
              </div>

              <div className="instruction-item">
                <h4>How to Answer</h4>
                <ul>
                  <li>Read the passage carefully before answering questions</li>
                  <li>
                    Use the search and highlight tools to find relevant
                    information
                  </li>
                  <li>Transfer your answers to the answer sheet</li>
                  <li>You can move between passages as needed</li>
                </ul>
              </div>

              <div className="instruction-item">
                <h4>Time Management Tips</h4>
                <ul>
                  <li>Passage 1: ~18 minutes</li>
                  <li>Passage 2: ~20 minutes</li>
                  <li>Passage 3: ~22 minutes</li>
                  <li>Spend first 5-10 minutes skimming each passage</li>
                </ul>
              </div>

              <div className="instruction-item info-box">
                <h4>💡 Pro Tip</h4>
                <p>
                  Don't spend too much time on difficult questions. Mark them
                  and come back later if you have time.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="features-panel">
            <h2>
              <span className="icon">⚙️</span>
              Available Tools
            </h2>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">🔍</div>
                <h4>Search Function</h4>
                <p>
                  Search for keywords within passages to quickly locate relevant
                  information
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">✏️</div>
                <h4>Highlight Tool</h4>
                <p>
                  Highlight important text in passages to make notes while
                  reading
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">📋</div>
                <h4>Answer Sheet</h4>
                <p>
                  Automatic tracking of your answers with clear progress
                  indicators
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">⏱️</div>
                <h4>Timer</h4>
                <p>
                  Real-time countdown timer showing remaining time for this
                  section
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🎯</div>
                <h4>Question Navigator</h4>
                <p>
                  Jump between passages and questions with the question
                  navigation panel
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <h4>Progress Tracker</h4>
                <p>
                  See overview of answered, unanswered, and reviewed questions
                </p>
              </div>
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
                <span>I have read and understood the test instructions</span>
              </label>
              <label className="checkbox-item">
                <input type="checkbox" disabled checked />
                <span>I understand the question types and formats</span>
              </label>
              <label className="checkbox-item">
                <input type="checkbox" disabled checked />
                <span>I am familiar with the available tools</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={agreedToStart}
                  onChange={(e) => setAgreedToStart(e.target.checked)}
                />
                <span>I am ready to start the reading test</span>
              </label>
            </div>

            <button
              className="start-button"
              onClick={handleStartTest}
              disabled={!agreedToStart}
            >
              <span className="button-icon">▶</span>
              Start Reading Test
            </button>

            <p className="disclaimer">
              Once you start, you have 60 minutes to complete the reading
              section. Use your time wisely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReadingStarter;
