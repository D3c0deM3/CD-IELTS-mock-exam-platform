import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import API_CONFIG from "../config/api";
import "./ReadingTestDashboard.css";
import testDataJson2 from "./mock_2.json";
import testDataJson3 from "./mock_3.json";

// ==================== HIGHLIGHT RE-APPLICATION HELPER ====================
const reapplyHighlights = (
  highlightsList,
  passageContent,
  onRemoveHighlight
) => {
  if (!highlightsList || highlightsList.length === 0 || !passageContent) return;

  try {
    // Collect all text nodes first
    const textNodes = [];
    const walker = document.createTreeWalker(
      passageContent,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    // Sort highlights by position to apply them in order
    const sortedHighlights = highlightsList.sort((a, b) => {
      const aPos = passageContent.textContent.indexOf(a.text);
      const bPos = passageContent.textContent.indexOf(b.text);
      return aPos - bPos;
    });

    // Track which occurrences we've already highlighted
    const occurrenceCount = {};

    sortedHighlights.forEach((highlight) => {
      const text = highlight.text;
      if (!text) return;

      // Count how many times we've highlighted this text
      occurrenceCount[text] = (occurrenceCount[text] || 0) + 1;
      const targetOccurrence = occurrenceCount[text];

      let currentOccurrence = 0;

      try {
        textNodes.forEach((textNode) => {
          if (currentOccurrence >= targetOccurrence) return;

          const nodeText = textNode.textContent;
          if (!nodeText.includes(text)) return;

          // Only process if this is still a valid text node
          if (textNode.parentNode === null) return;

          const index = nodeText.indexOf(text);
          if (index < 0) return;

          currentOccurrence++;

          if (currentOccurrence !== targetOccurrence) return;

          // Create range
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + text.length);

          const span = document.createElement("span");
          span.className = "text-highlight";
          span.style.backgroundColor = "#FFFF00";
          span.style.cursor = "pointer";
          span.style.fontWeight = "bold";
          span.style.color = "#000";
          span.dataset.highlightId = highlight.id;

          range.surroundContents(span);

          // Add click handler
          span.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
              const parent = span.parentNode;
              if (parent) {
                while (span.firstChild) {
                  parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
              }
              if (onRemoveHighlight) {
                onRemoveHighlight(highlight.id);
              }
            }
          });
        });
      } catch (err) {
        // Silently fail for this specific highlight
      }
    });
  } catch (err) {
    console.warn("Error re-applying highlights:", err);
  }
};

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
const PassageRenderer = React.forwardRef(
  ({ passage, highlights, onContextMenu }, ref) => {
    if (!passage) return null;

    return (
      <div ref={ref} className="reading-passage" onContextMenu={onContextMenu}>
        <h2 className="passage-title">{passage.title}</h2>
        <div className="passage-content">
          {passage.formatted_content.split("\n\n").map((paragraph, idx) => {
            // Check if paragraph starts with a letter marker (A-Z) followed by space
            const markerMatch = paragraph.match(/^([A-Z])\s+(.*)$/s);

            if (markerMatch) {
              const [, marker, rest] = markerMatch;
              return (
                <div key={idx} className="paragraph-with-marker">
                  <p className="passage-paragraph">
                    <strong className="paragraph-marker">{marker}.</strong>{" "}
                    {rest}
                  </p>
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
  }
);

// ==================== QUESTIONS RENDERER ====================
const QuestionsRenderer = ({ passage, answers, onAnswerChange }) => {
  if (!passage || !passage.questions) return null;

  // Group questions by range
  const questionGroups = [];
  const questionGroups_raw = passage.visual_structure?.question_groups || [];

  if (questionGroups_raw.length > 0) {
    questionGroups_raw.forEach((group) => {
      questionGroups.push({
        type: group.type,
        instructions: group.instructions,
        questionIds: group.question_ids || [],
        title: group.title,
        steps: group.steps,
        options_box: group.options_box,
        labels: group.labels,
        diagram_description: group.diagram_description,
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

            {/* Render flowchart if group type is flowchart */}
            {group.type === "flowchart" && group.steps && (
              <div className="visual-flowchart">
                <div className="flowchart-steps">
                  {group.steps.map((step, stepIndex) => {
                    return (
                      <div key={stepIndex} className="flowchart-step-item">
                        <div className="step-content">
                          <div className="step-text-with-gap">
                            {step.split(/(\d+\.{2,})/g).map((part, partIdx) => {
                              const gapMatch = part.match(/^(\d+)\.{2,}$/);
                              if (gapMatch) {
                                const gapNumber = parseInt(gapMatch[1], 10);
                                const answer = answers[gapNumber];
                                return (
                                  <span
                                    key={partIdx}
                                    className="gap-input-container"
                                  >
                                    <input
                                      type="text"
                                      className="gap-fill-input"
                                      value={answer || ""}
                                      onChange={(e) =>
                                        onAnswerChange(
                                          gapNumber,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`Q${gapNumber}`}
                                      maxLength={40}
                                      autoComplete="off"
                                    />
                                  </span>
                                );
                              }
                              return <span key={partIdx}>{part}</span>;
                            })}
                          </div>
                        </div>
                        {stepIndex < group.steps.length - 1 && (
                          <div className="flowchart-arrow">↓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Render diagram labeling if group type is diagram_labeling */}
            {group.type === "diagram_labeling" && group.labels && (
              <div className="diagram-labeling-section">
                {group.diagram_description && (
                  <p className="diagram-description">
                    {group.diagram_description}
                  </p>
                )}
                <div className="diagram-container">
                  <div className="diagram-image">
                    <img src={require("./image.png")} alt="Diagram" />
                  </div>
                  <div className="diagram-labels">
                    {group.labels.map((label, labelIdx) => {
                      const questionId = group.questionIds?.[labelIdx];
                      const answer = answers[questionId];

                      return (
                        <div key={labelIdx} className="label-item">
                          <p className="label-prompt">{label.prompt}</p>
                          <span className="gap-input-container">
                            <input
                              type="text"
                              className="gap-fill-input"
                              value={answer || ""}
                              onChange={(e) =>
                                onAnswerChange(questionId, e.target.value)
                              }
                              placeholder={`Q${questionId}`}
                              maxLength={40}
                              autoComplete="off"
                              key={`input-${questionId}`}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Questions in this group - skip if flowchart or diagram_labeling type */}
            {group.type !== "flowchart" &&
              group.type !== "diagram_labeling" &&
              groupQuestions.map((question) => {
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
                                        typeof question.word_limit ===
                                          "string" &&
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

                    {question.type === "multiple_choice" &&
                      question.question &&
                      question.options && (
                        <div className="question-content">
                          <p className="question-prompt">{question.question}</p>
                          <div className="mc-options">
                            {question.options.map((option, idx) => {
                              const letter = option.charAt(0);
                              return (
                                <label key={idx} className="mc-option">
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={letter}
                                    checked={answer === letter}
                                    onChange={(e) =>
                                      onAnswerChange(
                                        question.id,
                                        e.target.value
                                      )
                                    }
                                  />
                                  <span>{option}</span>
                                </label>
                              );
                            })}
                          </div>
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
                              {[
                                "A",
                                "B",
                                "C",
                                "D",
                                "E",
                                "F",
                                "G",
                                "H",
                                "I",
                                "J",
                              ].map((letter) => (
                                <option key={letter} value={letter}>
                                  {letter}
                                </option>
                              ))}
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

                    {question.type === "summary_completion" &&
                      question.prompt &&
                      question.options && (
                        <div className="question-content">
                          <p className="question-prompt">
                            {question.prompt
                              .split(/(\d+\s*(?:\.{2,}|…+|_{2,}))/)
                              .map((part, i) => {
                                if (!part) return null;
                                // Filter out dot-only parts (no actual content)
                                if (part.match(/^[\.\u2026_\s]+$/)) return null;
                                // Match gap pattern: number followed by dots/ellipsis
                                const gapMatch = part.match(
                                  /^(\d+)\s*(?:\.{2,}|…+|_{2,})$/
                                );

                                if (gapMatch) {
                                  return (
                                    <span
                                      key={i}
                                      className="gap-select-container"
                                    >
                                      <select
                                        className="summary-completion-select"
                                        value={answer || ""}
                                        onChange={(e) =>
                                          onAnswerChange(
                                            question.id,
                                            e.target.value
                                          )
                                        }
                                      >
                                        <option value="">--</option>
                                        {question.options.map((option, idx) => {
                                          const letter = option.split(" ")[0];
                                          return (
                                            <option key={idx} value={letter}>
                                              {option}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </span>
                                  );
                                }

                                return <span key={i}>{part}</span>;
                              })}
                          </p>
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
  const passageContentRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ielts_mock_theme") || "light";
  });
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [highlightsByPassage, setHighlightsByPassage] = useState({});
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
      const isInputElement =
        e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

      // Skip blocking on keypress events - they handle text input
      if (e.type === "keypress") {
        return;
      }

      let shouldBlock = false;

      // Block ESC and F11 with maximum prevention
      if (e.keyCode === 122 || e.keyCode === 27) {
        shouldBlock = true;
      }
      // Block F12 (Developer Tools)
      else if (e.keyCode === 123) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+I (Developer Tools) - only outside input fields
      else if (!isInputElement && e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+J (Console) - only outside input fields
      else if (!isInputElement && e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+C (Inspect Element) - only outside input fields
      else if (!isInputElement && e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        shouldBlock = true;
      }
      // Block Alt+Tab
      else if (e.altKey && e.keyCode === 9) {
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
      // Get test_materials_id from participant data stored in localStorage
      const participant = JSON.parse(
        localStorage.getItem("currentParticipant") || "{}"
      );
      const testMaterialsId = participant.test_materials_id || 2; // Default to mock 2

      // Select the correct test data based on test_materials_id
      let selectedTestData;
      switch (testMaterialsId) {
        case 2:
          selectedTestData = testDataJson2;
          break;
        case 3:
          selectedTestData = testDataJson3;
          break;
        default:
          console.warn(
            `No test data found for test materials ${testMaterialsId}, defaulting to mock 2`
          );
          selectedTestData = testDataJson2;
      }

      const readingSection = selectedTestData.sections.find(
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

      // Capture context around the highlighted text to identify specific occurrence
      const rangeClone = range.cloneRange();
      rangeClone.setStart(passageContentRef.current, 0);
      const precedingText = rangeClone.toString();
      const contextBefore = precedingText.slice(
        Math.max(0, precedingText.length - 30)
      );

      const rangeClone2 = range.cloneRange();
      rangeClone2.setEnd(
        passageContentRef.current,
        passageContentRef.current.childNodes.length
      );
      const followingText = rangeClone2
        .toString()
        .slice(selection.toString().length);
      const contextAfter = followingText.slice(0, 30);

      const highlight = {
        id: Date.now(),
        text: selection.toString(),
        contextBefore,
        contextAfter,
        timestamp: new Date().toLocaleTimeString(),
      };

      // Get current passage key (using passage number as identifier)
      const passageKey = `passage_${currentPassageIndex}`;
      const currentPassageHighlights = highlightsByPassage[passageKey] || [];

      setHighlightsByPassage({
        ...highlightsByPassage,
        [passageKey]: [...currentPassageHighlights, highlight],
      });

      span.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          const parent = span.parentNode;
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          parent.removeChild(span);

          const passageKey = `passage_${currentPassageIndex}`;
          const updatedHighlights = (
            highlightsByPassage[passageKey] || []
          ).filter((h) => h.id !== highlight.id);

          if (updatedHighlights.length === 0) {
            const newHighlightsByPassage = { ...highlightsByPassage };
            delete newHighlightsByPassage[passageKey];
            setHighlightsByPassage(newHighlightsByPassage);
          } else {
            setHighlightsByPassage({
              ...highlightsByPassage,
              [passageKey]: updatedHighlights,
            });
          }
        }
      });
    } catch (err) {
      console.warn("Could not highlight text (complex selection):", err);
    }

    setContextMenu(null);
    selection.removeAllRanges();
  };

  // ==================== HANDLE HIGHLIGHT REMOVAL ====================
  const handleRemoveHighlight = useCallback(
    (highlightId) => {
      const passageKey = `passage_${currentPassageIndex}`;
      const updatedHighlights = (highlightsByPassage[passageKey] || []).filter(
        (h) => h.id !== highlightId
      );

      if (updatedHighlights.length === 0) {
        const newHighlightsByPassage = { ...highlightsByPassage };
        delete newHighlightsByPassage[passageKey];
        setHighlightsByPassage(newHighlightsByPassage);
      } else {
        setHighlightsByPassage({
          ...highlightsByPassage,
          [passageKey]: updatedHighlights,
        });
      }
    },
    [currentPassageIndex, highlightsByPassage]
  );

  // Close context menu on click anywhere
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ==================== RE-APPLY HIGHLIGHTS ON PASSAGE CHANGE ====================
  useEffect(() => {
    if (
      !passageContentRef.current ||
      !testData ||
      testData.passages.length === 0
    )
      return;

    const passageKey = `passage_${currentPassageIndex}`;
    const currentHighlights = highlightsByPassage[passageKey] || [];

    // Clear any existing highlight spans
    const existingHighlights =
      passageContentRef.current.querySelectorAll(".text-highlight");
    existingHighlights.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
      }
    });

    // Re-apply highlights for this passage - with a small delay to ensure DOM is ready
    if (currentHighlights.length > 0) {
      const timeoutId = setTimeout(() => {
        reapplyHighlights(
          currentHighlights,
          passageContentRef.current,
          handleRemoveHighlight
        );
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [currentPassageIndex, testData, handleRemoveHighlight]);

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
            ref={passageContentRef}
            passage={currentPassage}
            highlights={
              highlightsByPassage[`passage_${currentPassageIndex}`] || []
            }
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
