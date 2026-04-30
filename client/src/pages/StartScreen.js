import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";
import testSessionService from "../services/testSessionService";
import "./StartScreen.css";

function StartScreen() {
  const navigate = useNavigate();
  const [idCode, setIdCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [pendingGuestSession, setPendingGuestSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);

  // Add theme effect from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("ielts_mock_theme");
    if (storedTheme) {
      document.documentElement.setAttribute("data-theme", storedTheme);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!idCode.trim()) {
      setError("Please enter your candidate ID or guest access code");
      return;
    }

    if (pendingGuestSession && guestName.trim().length < 2) {
      setError("Please enter your full name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const userData = localStorage.getItem("user");

      if (pendingGuestSession) {
        const response = await testSessionService.claimGuestAccessCode(
          idCode.trim().toUpperCase(),
          guestName.trim()
        );

        if (response?.participant) {
          localStorage.setItem(
            "currentParticipant",
            JSON.stringify(response.participant)
          );
          localStorage.setItem("ielts_mock_user_id", response.participant.participant_id_code);
          localStorage.setItem("ielts_mock_start_time", new Date().toISOString());
          navigate("/pending", {
            state: { idCode: response.participant.participant_id_code },
          });
        }
        return;
      }

      if (!userData) {
        const response = await testSessionService.validateGuestAccessCode(
          idCode.trim().toUpperCase()
        );
        setPendingGuestSession(response.session);
        setError("");
        return;
      }

      const user = JSON.parse(userData);
      const fullName = user.full_name;

      try {
        const response = await testSessionService.checkInParticipant(
          idCode.trim(),
          fullName
        );

        if (response?.participant) {
          localStorage.setItem(
            "currentParticipant",
            JSON.stringify(response.participant)
          );
        }

        localStorage.setItem("ielts_mock_user_id", idCode.trim());
        localStorage.setItem("ielts_mock_start_time", new Date().toISOString());
        navigate("/pending", { state: { idCode: idCode.trim() } });
      } catch (registeredErr) {
        if (registeredErr.response?.status === 404) {
          const response = await testSessionService.validateGuestAccessCode(
            idCode.trim().toUpperCase()
          );
          setPendingGuestSession(response.session);
          setError("");
          return;
        }

        throw registeredErr;
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to check in. Please try again.";
      setError(errorMessage);
      console.error("Check-in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setIdCode(value);
    setPendingGuestSession(null);
    setGuestName("");
    if (error) setError("");
  };

  return (
    <div className="start-screen">
      <Navbar />
      <ThemeToggle />

      <div className="background-overlay"></div>

      <div className="start-container">
        <div className="page-intro">
          <h1>IELTS CD Mock</h1>
          <p>Computer Delivered Practice Test</p>
        </div>

        <div className="form-section">
          <div className="form-card">
            <div className="form-header">
              <h2>Start Your Test</h2>
              <p>
                {pendingGuestSession
                  ? `Guest access for ${pendingGuestSession.test_name}`
                  : "Enter your candidate ID or guest access code"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="compact-form">
              <div className="input-group">
                <label htmlFor="idCode">
                  Candidate ID
                  <span className="label-hint">
                    (or guest access code)
                  </span>
                </label>

                <div
                  className={`input-wrapper ${isFocused ? "focused" : ""} ${
                    error ? "error" : ""
                  }`}
                >
                  {/* <div className="input-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div> */}

                  <input
                    id="idCode"
                    type="text"
                    value={idCode}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Enter your candidate ID"
                    autoComplete="off"
                    disabled={isLoading || Boolean(pendingGuestSession)}
                  />
                </div>
              </div>

              {pendingGuestSession && (
                <div className="input-group">
                  <label htmlFor="guestName">Full Name</label>

                  <div
                    className={`input-wrapper ${
                      isNameFocused ? "focused" : ""
                    } ${error ? "error" : ""}`}
                  >
                    <input
                      id="guestName"
                      type="text"
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(e.target.value);
                        if (error) setError("");
                      }}
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={isLoading}
                    />
                  </div>

                {error && (
                  <div className="error-message">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="error-icon"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 8V12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>
              )}

              {!pendingGuestSession && error && (
                <div className="error-message">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="error-icon"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 8V12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16" r="1" fill="currentColor" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className={`submit-btn ${isLoading ? "loading" : ""}`}
                disabled={
                  isLoading ||
                  !idCode.trim() ||
                  (pendingGuestSession && guestName.trim().length < 2)
                }
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Checking...
                  </>
                ) : (
                  <>
                    {pendingGuestSession ? "Enter Waiting Room" : "Continue"}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="arrow-icon"
                    >
                      <path
                        d="M5 12H19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 5L19 12L12 19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="form-footer">
              <div className="test-info">
                <div className="info-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="info-icon"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 7V12L15 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>2h 45m duration</span>
                </div>
                <div className="info-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="info-icon"
                  >
                    <path
                      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Save progress</span>
                </div>
              </div>

              <p className="disclaimer">
                This is a practice test. Scores are for reference only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartScreen;
