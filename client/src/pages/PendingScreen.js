import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import testSessionService from "../services/testSessionService";
import { getOrCreateDeviceId } from "../utils/deviceIdGenerator";
import "./PendingScreen.css";

function PendingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [adminStarted, setAdminStarted] = useState(false);
  const [ipValidationError, setIpValidationError] = useState("");

  const idCode =
    location.state?.idCode || localStorage.getItem("ielts_mock_user_id");

  // Redirect if no ID code
  useEffect(() => {
    if (!idCode) {
      navigate("/");
    }
  }, [idCode, navigate]);

  // CRITICAL: Validate IP address when entering pending screen
  // This prevents another device with same ID code from accessing the test
  useEffect(() => {
    const validateIPAddress = async () => {
      try {
        const userData = localStorage.getItem("user");
        const user = userData ? JSON.parse(userData) : null;
        const fullName = user?.full_name;

        // Get device ID (unique identifier for this device)
        const deviceId = getOrCreateDeviceId();

        // Call validation endpoint - this checks if device_id and IP match the locked values
        const response = await testSessionService.validateParticipantIP(
          idCode,
          fullName,
          deviceId
        );

        if (!response.ip_match) {
          // Device doesn't match - this is a different device trying to use same code
          setIpValidationError(
            "Another device is already using this participant ID code. Each ID code can only be used on one device at a time."
          );
          // Redirect after showing error
          setTimeout(() => {
            navigate("/");
          }, 3000);
        }
      } catch (err) {
        console.error("IP validation error:", err);
        // Network error or other issue
        if (err.response?.status === 403) {
          setIpValidationError(
            err.response?.data?.error ||
              "Another device is already using this participant ID code."
          );
          setTimeout(() => {
            navigate("/");
          }, 3000);
        }
      }
    };

    if (idCode) {
      validateIPAddress();
    }
  }, [idCode, navigate]);

  // Show error screen if IP validation failed
  if (ipValidationError) {
    return (
      <div className="pending-screen error-screen">
        <ThemeToggle />
        <div className="pending-container">
          <div className="error-content">
            <div className="error-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <h2>Access Denied</h2>
            <p>{ipValidationError}</p>
            <p className="redirect-message">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // Security: Prevent navigating away
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Security: Prevent going back
  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Security: Prevent keyboard shortcuts (F12, Ctrl+Shift+I, etc.)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Escape
      if (
        e.key === "F12" ||
        e.key === "Escape" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j"))
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Security: Right-click disabled
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Helper function to check fullscreen status
  const checkFullscreenStatus = () => {
    const inFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    console.log("Fullscreen status check:", inFullscreen);
    return inFullscreen;
  };

  // Request fullscreen
  const handleEnterFullscreen = async () => {
    try {
      const element = document.documentElement;
      console.log("Attempting to enter fullscreen...");

      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }

      console.log("Fullscreen request completed");

      // Check fullscreen status with multiple delays
      setTimeout(() => {
        const status = checkFullscreenStatus();
        console.log("Fullscreen check after 100ms:", status);
        setIsFullscreen(status);
      }, 100);

      setTimeout(() => {
        const status = checkFullscreenStatus();
        console.log("Fullscreen check after 500ms:", status);
        setIsFullscreen(status);
      }, 500);
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      alert("Please enable fullscreen to start the test");
    }
  };

  // Monitor fullscreen exit and continuous polling
  useEffect(() => {
    const handleFullscreenChange = () => {
      console.log("Fullscreen change event fired");
      const status = checkFullscreenStatus();
      setIsFullscreen(status);
    };

    // Add event listeners for all browser standards
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // Check initial fullscreen state on mount
    const initialStatus = checkFullscreenStatus();
    console.log("Initial fullscreen status on mount:", initialStatus);
    setIsFullscreen(initialStatus);

    // Fallback: Poll for fullscreen status every 500ms
    const fullscreenPoll = setInterval(() => {
      const status = checkFullscreenStatus();
      setIsFullscreen(status);
    }, 500);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
      clearInterval(fullscreenPoll);
    };
  }, []);

  // Poll for admin starting the test
  useEffect(() => {
    if (!agreedToRules || !isFullscreen) return;

    // Helper function to check if test can start (via testSessionService)
    const checkIfTestCanStart = async () => {
      try {
        const testSessionService =
          require("../services/testSessionService").default;
        // Get user's full name from localStorage
        const userData = localStorage.getItem("user");
        const user = userData ? JSON.parse(userData) : null;
        const fullName = user?.full_name;

        const response = await testSessionService.canStartTest(
          idCode,
          fullName
        );
        return response?.can_start === true;
      } catch (err) {
        return false;
      }
    };

    const checkCanStart = async () => {
      try {
        const canStart = await checkIfTestCanStart();
        if (canStart) {
          setAdminStarted(true);
          // Redirect to listening starter screen after short delay
          setTimeout(() => {
            navigate("/test/listening", { state: { idCode } });
          }, 1500);
        }
      } catch (err) {
        console.error("Error checking test status:", err);
      }
    };

    const interval = setInterval(checkCanStart, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [agreedToRules, isFullscreen, idCode, navigate]);

  const handleStartTest = async () => {
    console.log("handleStartTest called, isFullscreen:", isFullscreen);

    if (!isFullscreen) {
      console.log("Not in fullscreen, requesting fullscreen...");
      await handleEnterFullscreen();
    } else {
      console.log("Already in fullscreen");
    }
    // Admin will start the test, this component will detect it via polling
  };

  return (
    <div className="pending-screen" data-fullscreen={isFullscreen}>
      <ThemeToggle />
      <div className="pending-container">
        {/* Pending Status Section */}
        {!adminStarted && (
          <>
            <div className="pending-header">
              <div className="status-icon">
                {isFullscreen ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 7v5l3 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
              <h1>Waiting for Test to Start</h1>
              <p className="candidate-id">Candidate ID: {idCode}</p>
            </div>

            {/* Rules Section */}
            <div className="rules-section">
              <h2>IELTS CD Mock Test Rules & Guidelines</h2>

              <div className="rules-content">
                <div className="rule-category">
                  <h3>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="rule-icon"
                    >
                      <path
                        d="M9 11l3 3L22 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Test Guidelines
                  </h3>
                  <ul>
                    <li>
                      This is an official IELTS Computer Delivered practice test
                    </li>
                    <li>The test duration is 2 hours and 45 minutes</li>
                    <li>
                      You must complete all four sections: Listening, Reading,
                      Writing, and Speaking
                    </li>
                    <li>
                      Scores are for practice purposes and may not reflect
                      official IELTS results
                    </li>
                  </ul>
                </div>

                <div className="rule-category">
                  <h3>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="rule-icon"
                    >
                      <path
                        d="M12 1v6m0 0v6M5.636 5.636l-4.243-4.243m0 0l4.243 4.243M5.636 5.636L9.88 1.393m0 0L5.636 5.636m8.728-4.243l4.243-4.243m0 0l-4.243 4.243m4.243-4.243l-4.243 4.243"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    Important Security Rules
                  </h3>
                  <ul>
                    <li>
                      <strong>Do not close the browser window</strong> - This
                      will end your test session
                    </li>
                    <li>
                      <strong>Keep fullscreen mode enabled</strong> - You cannot
                      minimize or switch away from the test window
                    </li>
                    <li>
                      <strong>Do not use developer tools</strong> - DevTools,
                      inspector, and other debugging tools are disabled
                    </li>
                    <li>
                      <strong>Do not navigate away</strong> - You cannot use
                      browser back/forward buttons
                    </li>
                    <li>
                      <strong>Do not take screenshots</strong> - Unauthorized
                      screen captures are not permitted
                    </li>
                  </ul>
                </div>

                <div className="rule-category">
                  <h3>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="rule-icon"
                    >
                      <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    During the Test
                  </h3>
                  <ul>
                    <li>
                      Save your progress regularly - incomplete answers will not
                      be saved
                    </li>
                    <li>You can review questions within the time limit</li>
                    <li>No external resources or aids are permitted</li>
                    <li>Maintain a quiet environment during the test</li>
                  </ul>
                </div>

                <div className="rule-category">
                  <h3>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="rule-icon"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 6v6l4 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    After the Test
                  </h3>
                  <ul>
                    <li>
                      Your responses will be submitted automatically when time
                      expires
                    </li>
                    <li>
                      Results will be available after the test is completed
                    </li>
                    <li>You can review your answers on the results page</li>
                  </ul>
                </div>
              </div>

              {/* Acknowledgement Checkbox */}
              <div className="acknowledgement">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreedToRules}
                    onChange={(e) => setAgreedToRules(e.target.checked)}
                    disabled={adminStarted}
                  />
                  <span>
                    I understand and agree to follow all the rules and
                    guidelines above. I take full responsibility for maintaining
                    test integrity.
                  </span>
                </label>
              </div>

              {/* Status Messages */}
              <div className="status-messages">
                {!isFullscreen && (
                  <div className="message warning">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 9v2m0 4v2m-9-9h18a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Fullscreen mode is required to start the test</span>
                  </div>
                )}

                {isFullscreen && agreedToRules && !adminStarted && (
                  <div className="message info">
                    <div className="spinner"></div>
                    <span>
                      Waiting for test administrator to start the test...
                    </span>
                  </div>
                )}

                {adminStarted && (
                  <div className="message success">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Test is starting...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="action-section">
              <button
                className={`start-btn ${
                  !isFullscreen || (isFullscreen && agreedToRules)
                    ? "ready"
                    : "disabled"
                }`}
                onClick={handleStartTest}
                disabled={isFullscreen && !agreedToRules}
              >
                {isFullscreen ? "Ready for Test" : "Enter Fullscreen Mode"}
              </button>
              <p className="help-text">
                {isFullscreen
                  ? "Your screen is in fullscreen mode. Waiting for the administrator to start the test..."
                  : "Click to enable fullscreen mode and read all rules carefully before proceeding."}
              </p>
            </div>
          </>
        )}

        {/* Test Starting Animation */}
        {adminStarted && (
          <div className="test-starting">
            <div className="starting-animation">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2>Test is Starting...</h2>
              <p>Please wait, the test environment is being loaded...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PendingScreen;
