import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import API_CONFIG from "../config/api";
import "./ReadingTestDashboard.css";
import testDataJson from "./mock_2.json";

// ==================== HELPER FUNCTION ====================
const extractInstructionsForRange = (fullInstructions, questionIds) => {
  if (!fullInstructions || !questionIds || questionIds.length === 0) {
    return null;
  }

  const startQ = questionIds[0];
  const endQ = questionIds[questionIds.length - 1];

  const pattern = new RegExp(
    `Questions?\\s+${startQ}[^\\d]*(?:${endQ})?[^:]*:\\s*(.+?)(?=Questions?\\s+\\d|$)`,
    "is"
  );

  const match = fullInstructions.match(pattern);

  if (match && match[1]) {
    const extractedText = `Questions ${startQ}-${endQ}:\n${match[1].trim()}`;
    return extractedText;
  }

  return null;
};

// ==================== PASSAGE RENDERER ====================
const PassageRenderer = ({ passage, highlights, onContextMenu }) => {
  if (!passage) return null;

  return (
    <div className="reading-passage" onContextMenu={onContextMenu}>
      <h2 className="passage-title">{passage.title}</h2>
      <div className="passage-content">
        {passage.formatted_content.split("\n\n").map((paragraph, idx) => {
          // Check if paragraph starts with a letter marker (A-Z) followed by space
          const markerMatch = paragraph.match(/^([A-Z])\s+(.*)$/s);

          if (markerMatch) {
            const [, marker, rest] = markerMatch;
            return (
              <div key={idx}>
                <p className="passage-paragraph-marker">
                  <strong className="paragraph-marker">{marker}</strong>
                </p>
                <p className="passage-paragraph">{rest}</p>
              </div>
            );
          }

          return (
            <p key={idx} className="passage-paragraph">
              {paragraph}
            </p>
          );
        })}
      </div>
    </div>
  );
};

// ==================== QUESTIONS RENDERER ====================
const QuestionsRenderer = ({ passage, answers, onAnswerChange }) => {
  if (!passage || !passage.questions) return null;

  // Group questions by range
  const questionGroups = [];
  const questionGroups_raw = passage.visual_structure?.question_groups || [];

  if (questionGroups_raw.length > 0) {
    questionGroups_raw.forEach((group) => {
      questionGroups.push({
        instructions: group.instructions,
        questionIds: group.question_ids || [],
        title: group.title,
      });
    });
  } else {
    // If no visual structure, group all questions together
    questionGroups.push({
      instructions: null,
      questionIds: passage.questions.map((q) => q.id),
      title: null,
    });
  }

  return (
    <div className="reading-questions">
      {questionGroups.map((group, groupIdx) => {
        // Ensure questionIds is an array before using it
        const questionIdsList = Array.isArray(group.questionIds)
          ? group.questionIds
          : [];
        const groupQuestions = passage.questions.filter((q) =>
          questionIdsList.includes(q.id)
        );

        return (
          <div key={groupIdx} className="question-group">
            {/* Instructions for this group */}
            {group.instructions && (
              <div className="component-instructions">
                <p>{group.instructions}</p>
              </div>
            )}

            {/* Questions in this group */}
            {groupQuestions.map((question) => {
              const answer = answers[question.id];

              return (
                <div key={question.id} className="question-card">
                  <div className="question-header">
                    <span className="question-number">{question.id}</span>
                  </div>

                  {question.type === "true_false_ng" &&
                    question.statement &&
                    question.options && (
                      <div className="question-content">
                        <p className="question-statement">
                          {question.statement}
                        </p>
                        <div className="tfng-options">
                          {question.options.map((option, idx) => (
                            <label key={idx} className="tfng-option">
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={answer === option}
                                onChange={(e) =>
                                  onAnswerChange(question.id, e.target.value)
                                }
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                  {question.type === "yes_no_ng" &&
                    question.statement &&
                    question.options && (
                      <div className="question-content">
                        <p className="question-statement">
                          {question.statement}
                        </p>
                        <div className="tfng-options">
                          {question.options.map((option, idx) => (
                            <label key={idx} className="tfng-option">
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={answer === option}
                                onChange={(e) =>
                                  onAnswerChange(question.id, e.target.value)
                                }
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                  {question.type === "gap_fill" && question.prompt && (
                    <div className="question-content">
                      <p className="question-prompt">
                        {question.prompt
                          .split(/(\d+\s*(?:\.{2,}|…+|_{2,}))/)
                          .map((part, i) => {
                            if (!part) return null;
                            // Filter out dot-only parts (no actual content)
                            if (part.match(/^[\.\u2026_\s]+$/)) return null;
                            // Match gap pattern: number followed by dots/ellipsis (at start and end of part)
                            const gapMatch = part.match(
                              /^(\d+)\s*(?:\.{2,}|…+|_{2,})$/
                            );

                            if (gapMatch) {
                              return (
                                <span key={i} className="gap-input-container">
                                  <input
                                    type="text"
                                    className="gap-fill-input"
                                    value={answer || ""}
                                    onChange={(e) =>
                                      onAnswerChange(
                                        question.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder={question.id}
                                    maxLength={
                                      question.word_limit &&
                                      typeof question.word_limit === "string" &&
                                      question.word_limit.includes("ONE WORD")
                                        ? 20
                                        : 40
                                    }
                                    autoComplete="off"
                                  />
                                </span>
                              );
                            }

                            return <span key={i}>{part}</span>;
                          })}
                      </p>
                    </div>
                  )}

                  {question.type === "paragraph_matching" &&
                    question.prompt && (
                      <div className="question-content">
                        <p className="question-prompt">{question.prompt}</p>
                        <div className="matching-select-wrapper">
                          <select
                            className="matching-select"
                            value={answer || ""}
                            onChange={(e) =>
                              onAnswerChange(question.id, e.target.value)
                            }
                          >
                            <option value="">-- Select paragraph --</option>
                            {["A", "B", "C", "D", "E", "F", "G", "H"].map(
                              (letter) => (
                                <option key={letter} value={letter}>
                                  {letter}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>
                    )}

                  {question.type === "matching" &&
                    (question.question || question.prompt) &&
                    question.matching_options && (
                      <div className="question-content">
                        <p className="question-prompt">
                          {question.question || question.prompt}
                        </p>
                        <div className="matching-select-wrapper">
                          <select
                            className="matching-select"
                            value={answer || ""}
                            onChange={(e) =>
                              onAnswerChange(question.id, e.target.value)
                            }
                          >
                            <option value="">-- Select an answer --</option>
                            {question.matching_options.map((option, idx) => {
                              const letter = option.split(" ")[0];
                              return (
                                <option key={idx} value={letter}>
                                  {option}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const ReadingTestDashboard = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ielts_mock_theme") || "light";
  });
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [highlights, setHighlights] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ==================== FULLSCREEN HELPER ====================
  const enterFullscreen = async () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  };

  // ==================== THEME MANAGEMENT ====================
  useEffect(() => {
    const updateTheme = () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      setTheme(currentTheme);
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateTheme);
    };
  }, []);

  // ==================== FULLSCREEN AND EXIT PREVENTION ====================
  useEffect(() => {
    const blockRestrictedKeys = (e) => {
      let shouldBlock = false;

      // Block ESC and F11 with maximum prevention
      if (
        e.key === "Escape" ||
        e.key === "F11" ||
        e.keyCode === 122 ||
        e.keyCode === 27
      ) {
        shouldBlock = true;
      }
      // Block F12 (Developer Tools)
      else if (e.key === "F12" || e.keyCode === 123) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+I (Developer Tools)
      else if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.keyCode === 73)) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+J (Console)
      else if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.keyCode === 74)) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+C (Inspect Element)
      else if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.keyCode === 67)) {
        shouldBlock = true;
      }
      // Block Alt+Tab
      else if (e.altKey && (e.key === "Tab" || e.keyCode === 9)) {
        shouldBlock = true;
      }

      if (shouldBlock) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const handleKeyDown = (e) => blockRestrictedKeys(e);
    const handleKeyPress = (e) => blockRestrictedKeys(e);
    const handleKeyUp = (e) => blockRestrictedKeys(e);

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleFullscreenChange = () => {
      // Check all fullscreen states for cross-browser support
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        // User tried to exit fullscreen, immediately re-enter with minimal delay
        setTimeout(() => {
          enterFullscreen().catch(() => {});
        }, 10);
      }
    };

    // Continuous fullscreen monitor using requestAnimationFrame - runs at screen refresh rate (~60Hz)
    let fullscreenMonitorId = null;

    const monitorFullscreen = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      // If not in fullscreen, immediately try to re-enter
      if (!isCurrentlyFullscreen) {
        enterFullscreen().catch(() => {});
      }

      // Schedule next check at screen refresh rate
      fullscreenMonitorId = requestAnimationFrame(monitorFullscreen);
    };

    // Start the fullscreen monitor
    fullscreenMonitorId = requestAnimationFrame(monitorFullscreen);

    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Add to document, window, and document.body with BOTH capture and bubble phases
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, false);
    document.addEventListener("keypress", handleKeyPress, true);
    document.addEventListener("keypress", handleKeyPress, false);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("keyup", handleKeyUp, false);

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keydown", handleKeyDown, false);
    window.addEventListener("keypress", handleKeyPress, true);
    window.addEventListener("keypress", handleKeyPress, false);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("keyup", handleKeyUp, false);

    // Also bind to document.body and html element
    if (document.body) {
      document.body.addEventListener("keydown", handleKeyDown, true);
      document.body.addEventListener("keydown", handleKeyDown, false);
      document.body.addEventListener("keypress", handleKeyPress, true);
      document.body.addEventListener("keypress", handleKeyPress, false);
      document.body.addEventListener("keyup", handleKeyUp, true);
      document.body.addEventListener("keyup", handleKeyUp, false);
    }

    const htmlElement = document.documentElement;
    if (htmlElement) {
      htmlElement.addEventListener("keydown", handleKeyDown, true);
      htmlElement.addEventListener("keydown", handleKeyDown, false);
      htmlElement.addEventListener("keypress", handleKeyPress, true);
      htmlElement.addEventListener("keypress", handleKeyPress, false);
      htmlElement.addEventListener("keyup", handleKeyUp, true);
      htmlElement.addEventListener("keyup", handleKeyUp, false);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      // Cancel the animation frame monitor
      if (fullscreenMonitorId !== null) {
        cancelAnimationFrame(fullscreenMonitorId);
      }

      // Remove all keyboard listeners
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keydown", handleKeyDown, false);
      document.removeEventListener("keypress", handleKeyPress, true);
      document.removeEventListener("keypress", handleKeyPress, false);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("keyup", handleKeyUp, false);

      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keydown", handleKeyDown, false);
      window.removeEventListener("keypress", handleKeyPress, true);
      window.removeEventListener("keypress", handleKeyPress, false);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("keyup", handleKeyUp, false);

      if (document.body) {
        document.body.removeEventListener("keydown", handleKeyDown, true);
        document.body.removeEventListener("keydown", handleKeyDown, false);
        document.body.removeEventListener("keypress", handleKeyPress, true);
        document.body.removeEventListener("keypress", handleKeyPress, false);
        document.body.removeEventListener("keyup", handleKeyUp, true);
        document.body.removeEventListener("keyup", handleKeyUp, false);
      }

      const htmlElement = document.documentElement;
      if (htmlElement) {
        htmlElement.removeEventListener("keydown", handleKeyDown, true);
        htmlElement.removeEventListener("keydown", handleKeyDown, false);
        htmlElement.removeEventListener("keypress", handleKeyPress, true);
        htmlElement.removeEventListener("keypress", handleKeyPress, false);
        htmlElement.removeEventListener("keyup", handleKeyUp, true);
        htmlElement.removeEventListener("keyup", handleKeyUp, false);
      }

      window.removeEventListener("beforeunload", handleBeforeUnload);
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
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // ==================== LOAD TEST DATA ====================
  useEffect(() => {
    try {
      const readingSection = testDataJson.sections.find(
        (s) => s.type === "reading"
      );

      if (readingSection) {
        setTestData({
          type: "reading",
          passages: readingSection.passages,
        });
      } else {
        console.error("No reading section found in test data");
      }
    } catch (error) {
      console.error("Error loading test data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== TIMER COUNTDOWN ====================
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Auto-submit when timer reaches 0
      setShowSubmitConfirm(false);
      navigate("/test/writing", {
        state: { startTime: new Date().toISOString() },
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, navigate]);

  // ==================== ANSWER CHANGE HANDLER ====================
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // ==================== TEXT HIGHLIGHTING HANDLERS ====================
  const handleContextMenu = (e) => {
    e.preventDefault();
    const selected = window.getSelection().toString().trim();

    if (selected.length === 0) {
      setContextMenu(null);
      return;
    }

    setSelectedText(selected);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const highlightSelectedText = () => {
    const selection = window.getSelection();

    if (selection.toString().length === 0) {
      setContextMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.className = "text-highlight";
    span.style.backgroundColor = "#FFFF00";
    span.style.cursor = "pointer";
    span.style.fontWeight = "bold";
    span.style.color = "#000";

    try {
      range.surroundContents(span);

      const highlight = {
        id: Date.now(),
        text: selection.toString(),
        timestamp: new Date().toLocaleTimeString(),
      };

      setHighlights([...highlights, highlight]);

      span.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          const parent = span.parentNode;
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          parent.removeChild(span);
          setHighlights(highlights.filter((h) => h.id !== highlight.id));
        }
      });
    } catch (err) {
      console.warn("Could not highlight text (complex selection):", err);
    }

    setContextMenu(null);
    selection.removeAllRanges();
  };

  // Close context menu on click anywhere
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ==================== SUBMIT TEST HANDLER ====================
  const handleSubmitTest = useCallback(() => {
    setShowSubmitConfirm(true);
  }, []);

  const confirmSubmitTest = useCallback(async () => {
    console.log("Reading test submitted with answers:", answers);

    const totalQuestions =
      testData?.passages.reduce(
        (sum, passage) => sum + passage.questions.length,
        0
      ) || 0;
    const answeredQuestions = Object.keys(answers).length;

    console.log(
      `Test submitted!\nYou answered ${answeredQuestions} out of ${totalQuestions} questions.`
    );

    setShowSubmitConfirm(false);

    try {
      // Get participant data from localStorage
      const participantString = localStorage.getItem("currentParticipant");
      const participantData = JSON.parse(participantString || "{}");

      if (!participantData.id || !participantData.full_name) {
        console.error("Participant data not found");
        alert("Error: Participant data not found. Please restart the test.");
        return;
      }

      // Submit reading answers to backend
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/test-sessions/submit-reading`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participant_id: participantData.id,
            full_name: participantData.full_name,
            reading_answers: answers,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit reading test");
      }

      const result = await response.json();
      console.log("Reading submission response:", result);

      navigate("/test/writing", {
        state: { startTime: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error submitting reading test:", error);
      alert(`Error submitting test: ${error.message}`);
    }
  }, [answers, navigate, testData]);

  const cancelSubmitTest = useCallback(() => {
    setShowSubmitConfirm(false);
  }, []);

  // ==================== FORMAT TIME ====================
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="reading-test-dashboard" data-theme={theme}>
        <div className="loading-screen">Loading reading test...</div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (!testData || !testData.passages || testData.passages.length === 0) {
    return (
      <div className="reading-test-dashboard" data-theme={theme}>
        <div className="error-screen">Error loading test data</div>
      </div>
    );
  }

  const currentPassage = testData.passages[currentPassageIndex];

  // ==================== MAIN RENDER ====================
  return (
    <div
      className="reading-test-dashboard"
      data-theme={theme}
      onContextMenu={handleContextMenu}
    >
      {/* ==================== CONTEXT MENU ==================== */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <button className="context-menu-item" onClick={highlightSelectedText}>
            <span className="menu-icon">🔆</span>
            Highlight
          </button>
        </div>
      )}

      {/* ==================== TOP BAR ==================== */}
      <div className="reading-top-bar">
        <div className="top-bar-left">
          <h1 className="test-title">IELTS Reading Test</h1>
        </div>
        <div className="top-bar-center">
          <div className="timer">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="time-text">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        <div className="top-bar-right">
          <ThemeToggle />
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="reading-content">
        {/* LEFT COLUMN - PASSAGE */}
        <div className="passage-column">
          <PassageRenderer
            passage={currentPassage}
            highlights={highlights}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* RIGHT COLUMN - QUESTIONS */}
        <div className="questions-column">
          <div className="questions-wrapper">
            <QuestionsRenderer
              passage={currentPassage}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
          </div>
        </div>
      </div>

      {/* ==================== BOTTOM BAR ==================== */}
      <div className="reading-bottom-bar">
        <div className="passages-navigation">
          {testData.passages.map((passage, index) => (
            <button
              key={index}
              className={`passage-button ${
                currentPassageIndex === index ? "active" : ""
              }`}
              onClick={() => setCurrentPassageIndex(index)}
            >
              Passage {passage.passage_number}
            </button>
          ))}
        </div>
        <div className="progress-info">
          Answered: {Object.keys(answers).length} /{" "}
          {testData.passages.reduce(
            (sum, passage) => sum + passage.questions.length,
            0
          )}
        </div>
        <button
          className="submit-button-bottom"
          onClick={handleSubmitTest}
          title="Submit Test"
        >
          Submit Test
        </button>
      </div>

      {/* ==================== SUBMIT CONFIRMATION MODAL ==================== */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <h2>Submit Reading Test?</h2>
            </div>
            <div className="modal-body">
              <p className="answered-summary">
                You have answered <strong>{Object.keys(answers).length}</strong>{" "}
                out of <strong>40</strong> questions.
              </p>
              <p className="warning-message">
                Once you submit, you cannot return to modify your answers.
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={cancelSubmitTest}>
                Cancel
              </button>
              <button className="confirm-button" onClick={confirmSubmitTest}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingTestDashboard;
