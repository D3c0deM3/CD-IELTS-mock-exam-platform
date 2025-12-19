import React from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./EndTestScreen.css";

const EndTestScreen = () => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    // Clear test data from localStorage
    localStorage.removeItem("currentParticipant");
    localStorage.removeItem("testData");
    navigate("/");
  };

  return (
    <div className="end-test-screen">
      <div className="end-test-header">
        <div className="header-left">
          <h1 className="header-title">Test Completed</h1>
        </div>
        <ThemeToggle />
      </div>

      <div className="end-test-content">
        <div className="completion-card">
          <div className="checkmark-icon">
            <svg viewBox="0 0 60 60" width="60" height="60">
              <circle
                cx="30"
                cy="30"
                r="28"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
              />
              <path
                d="M15 30l8 8 20-20"
                stroke="#dc2626"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="completion-title">Test Completed Successfully!</h2>

          <p className="completion-message">
            You have successfully submitted your answer. Thank you for taking
            the IELTS mock exam with us!
          </p>

          <div className="results-info">
            <p className="results-label">Results:</p>
            <p className="results-description">
              Your results will be announced in the telegram channel or you can
              see them on the website once they are out.
            </p>
          </div>

          <button className="return-btn" onClick={handleReturnHome}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndTestScreen;
