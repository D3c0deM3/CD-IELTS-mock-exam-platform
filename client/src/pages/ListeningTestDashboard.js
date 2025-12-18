import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import API_CONFIG from "../config/api";
import audioService from "../services/audioService";
import "./ListeningTestDashboard.css";
import testDataJson from "./mock_2.json";

// ==================== COMPONENT IMPORTS ====================
const TableRenderer = ({ tableData, questions, answers, onAnswerChange }) => {
  if (!tableData) return null;

  const columns = [
    { header: "House or flat", key: "house_or_flat" },
    { header: "Details", key: "details" },
    { header: "Rent per month", key: "rent" },
    { header: "Address", key: "address" },
    { header: "Location", key: "location" },
  ];

  return (
    <div className="visual-table">
      {tableData.title && <h3 className="table-title">{tableData.title}</h3>}

      <table className="ielts-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx}>{col.header}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => {
                const cellContent = row[col.key] ?? "";
                const parts = cellContent.split(/(\d+\s*(?:\.{2,}|…+))/);

                return (
                  <td key={`${rowIndex}-${colIndex}`}>
                    {parts.map((part, i) => {
                      const gapMatch = part.match(/(\d+)\s*(?:\.{2,}|…+)/);

                      if (gapMatch) {
                        const questionNum = parseInt(gapMatch[1], 10);
                        const question = questions.find(
                          (q) => q.id === questionNum
                        );

                        if (!question) {
                          console.error(
                            "Missing question for gap:",
                            questionNum
                          );
                          return null;
                        }

                        return (
                          <input
                            key={i}
                            type="text"
                            className="table-gap-input"
                            value={answers[question.id] || ""}
                            onChange={(e) =>
                              onAnswerChange(question.id, e.target.value)
                            }
                            placeholder={question.id}
                            maxLength={
                              question.word_limit?.includes("ONE WORD")
                                ? 15
                                : 30
                            }
                            style={{ minWidth: 90 }}
                            autoComplete="off"
                          />
                        );
                      }

                      return <span key={i}>{part}</span>;
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {tableData.note && (
        <div className="table-note">
          <strong>Note:</strong> {tableData.note}
        </div>
      )}
    </div>
  );
};

const NotesRenderer = ({ notesData, questions, answers, onAnswerChange }) => {
  if (!notesData) return null;

  return (
    <div className="visual-notes">
      {notesData.title && <h3 className="notes-title">{notesData.title}</h3>}

      <ul className="ielts-notes">
        {notesData.items.map((item, index) => {
          const questionId = notesData.question_ids?.[index];
          const question = questions.find((q) => q.id === questionId);

          if (!question) {
            return (
              <li key={index} className="note-item">
                {item}
              </li>
            );
          }

          const parts = item.split(/(\d+\s*(?:\.{2,}|…+))/);

          return (
            <li key={index} className="note-item-with-gap">
              {parts.map((part, partIndex) => {
                if (part.match(/\d+\s*(?:\.{2,}|…+)/)) {
                  return (
                    <input
                      key={partIndex}
                      type="text"
                      className="notes-gap-input"
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        onAnswerChange(question.id, e.target.value)
                      }
                      placeholder={question.id}
                      maxLength={
                        question.word_limit?.includes("ONE WORD") ? 15 : 30
                      }
                      style={{ minWidth: 90 }}
                      autoComplete="off"
                    />
                  );
                }

                return <span key={partIndex}>{part}</span>;
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const StructuredNotesRenderer = ({
  structuredData,
  questions,
  answers,
  onAnswerChange,
}) => {
  if (!structuredData) return null;

  return (
    <div className="visual-structured-notes">
      {structuredData.title && (
        <h2 className="structured-title">{structuredData.title}</h2>
      )}
      {structuredData.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="structured-section">
          {section.title && <h3 className="section-title">{section.title}</h3>}
          <ul className="section-items">
            {section.items.map((item, itemIndex) => {
              if (item.type === "question") {
                const question = questions.find(
                  (q) => q.id === item.question_id
                );
                if (question) {
                  const parts = item.content.split(/(\d+\s*(?:\.{2,}|…+))/g);
                  return (
                    <li key={itemIndex} className="structured-item-with-gap">
                      {parts.map((part, partIndex) => {
                        if (part.match(/\d+\s*…+/)) {
                          return (
                            <input
                              type="text"
                              className="structured-gap-input"
                              value={answers[question.id] || ""}
                              onChange={(e) =>
                                onAnswerChange(question.id, e.target.value)
                              }
                              placeholder={question.id}
                              maxLength={
                                question.word_limit?.includes("ONE WORD")
                                  ? 20
                                  : 30
                              }
                            />
                          );
                        }
                        return <span key={partIndex}>{part}</span>;
                      })}
                    </li>
                  );
                }
              }
              return (
                <li key={itemIndex} className="structured-item">
                  {item.content}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

const MatchingTableRenderer = ({
  matchingData,
  questions,
  answers,
  onAnswerChange,
}) => {
  const [draggedOption, setDraggedOption] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const scrollIntervalRef = useRef(null);
  const isDraggingRef = useRef(false);

  if (!matchingData) return null;

  // Handle global dragover for auto-scroll
  useEffect(() => {
    const handleGlobalDragOver = (e) => {
      if (!isDraggingRef.current) return;

      const threshold = 100;
      const clientY = e.clientY;
      const viewportHeight = window.innerHeight;
      const isNearBottom = clientY > viewportHeight - threshold;

      if (isNearBottom) {
        // Start auto-scrolling if not already
        if (!scrollIntervalRef.current) {
          scrollIntervalRef.current = setInterval(() => {
            window.scrollBy(0, 12);
          }, 16);
        }
      } else {
        // Stop scrolling if away from bottom
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      }
    };

    document.addEventListener("dragover", handleGlobalDragOver);

    return () => {
      document.removeEventListener("dragover", handleGlobalDragOver);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, []);

  const handleDragStart = (e, option, source = "options") => {
    const letter = option.charAt(0);
    setDraggedOption(letter);
    setDragSource(source);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e, questionId) => {
    e.preventDefault();
    isDraggingRef.current = false;

    // Stop auto-scroll on drop
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    if (draggedOption) {
      onAnswerChange(questionId, draggedOption);
    }
    setDraggedOption(null);
    setDragSource(null);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;

    // Stop auto-scroll when drag ends
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    setDraggedOption(null);
    setDragSource(null);
  };

  const handleClearAnswer = (questionId) => {
    onAnswerChange(questionId, "");
  };

  return (
    <div className="visual-matching-table">
      <h3 className="matching-title">{matchingData.title}</h3>
      <div className="matching-instructions">{matchingData.instructions}</div>

      {matchingData.options_box && (
        <div className="matching-options-box drag-enabled">
          <h4>{matchingData.options_box.title}</h4>
          <div className="options-grid draggable-options">
            {matchingData.options_box.options.map((option, idx) => {
              const letter = option.charAt(0);
              const isUsed = Object.values(answers).includes(letter);
              return (
                <div
                  key={idx}
                  className={`option-tag draggable ${isUsed ? "used" : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, option)}
                  onDragEnd={handleDragEnd}
                  title="Drag to match with a question"
                >
                  {option}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="matching-table-wrapper">
        <table className="matching-pairs-table">
          <thead>
            <tr>
              {matchingData.columns.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matchingData.matching_pairs.map((pair, idx) => {
              const question = questions.find((q) => q.id === pair.question_id);
              const selectedAnswer = answers[question?.id];
              const selectedOption = matchingData.options_box?.options.find(
                (opt) => opt.charAt(0) === selectedAnswer
              );

              return (
                <tr key={idx}>
                  <td className="person-cell">{pair.person}</td>
                  <td
                    className="answer-cell drop-zone"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, question.id)}
                  >
                    <div className="drop-target">
                      {selectedAnswer ? (
                        <div className="matched-answer">
                          <span className="answer-letter">
                            {selectedAnswer}
                          </span>
                          <span className="answer-text">{selectedOption}</span>
                          <button
                            className="clear-btn"
                            onClick={() => handleClearAnswer(question.id)}
                            title="Clear this match"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="drop-hint">Drop here</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MatchingListRenderer = ({
  matchingData,
  questions,
  answers,
  onAnswerChange,
}) => {
  if (!matchingData) return null;

  return (
    <div className="visual-matching-list">
      <h3 className="matching-list-title">{matchingData.title}</h3>
      <div className="matching-list-instructions">
        {matchingData.instructions}
      </div>

      {matchingData.options_box && (
        <div className="matching-list-options">
          <h4>{matchingData.options_box.title}</h4>
          <div className="options-list">
            {matchingData.options_box.options.map((option, idx) => (
              <div key={idx} className="option-list-item">
                {option}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="matching-items-list">
        {matchingData.items.map((item, idx) => {
          const question = questions.find((q) => q.id === item.question_id);
          return (
            <div key={idx} className="matching-item-row">
              <span className="item-label">{item.label}</span>
              <select
                className="matching-list-select"
                value={answers[question?.id] || ""}
                onChange={(e) => {
                  if (!question) return;
                  onAnswerChange(question.id, e.target.value);
                }}
              >
                <option value="">Choose answer</option>
                {matchingData.options_box?.options.map((option, optIdx) => {
                  const letter = option.charAt(0);
                  return (
                    <option key={optIdx} value={letter}>
                      {option}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MultipleChoiceBlockRenderer = ({
  questions,
  answers,
  onAnswerChange,
}) => {
  return (
    <div className="multiple-choice-block">
      <h3 className="mc-block-title">Multiple Choice Questions</h3>
      {questions
        .filter((q) => q.type === "multiple_choice")
        .map((question, idx) => (
          <div key={question.id} className="mc-block-item">
            <p className="mc-question-text">{question.question}</p>
            <div className="options-list">
              {question.options.map((option, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = answers[question.id] === letter;
                // Strip letter prefix if it exists (e.g., "A Some text" -> "Some text")
                const cleanedOption = option.replace(/^[A-Z]\s+/, "");
                return (
                  <label
                    key={optIdx}
                    className={`option-item ${isSelected ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={letter}
                      checked={isSelected}
                      onChange={(e) =>
                        onAnswerChange(question.id, e.target.value)
                      }
                    />
                    <span className="option-letter">{letter}</span>
                    <span className="option-content">{cleanedOption}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

// Helper function to extract instructions for specific question range
const extractInstructionsForRange = (fullInstructions, questionIds) => {
  if (!fullInstructions || !questionIds || questionIds.length === 0) {
    return null;
  }

  const startQ = questionIds[0];
  const endQ = questionIds[questionIds.length - 1];

  // Use regex to find the section that mentions this question range
  // Pattern: "Questions X-Y:" or "Questions X:" followed by text until the next "Questions" marker
  const pattern = new RegExp(
    `Questions?\\s+${startQ}[^\\d]*(?:${endQ})?[^:]*:\\s*(.+?)(?=Questions?\\s+\\d|$)`,
    "is"
  );

  const match = fullInstructions.match(pattern);

  if (match && match[1]) {
    // Clean up the extracted text
    const extractedText = `Questions ${startQ}-${endQ}:\n${match[1].trim()}`;
    return extractedText;
  }

  return null;
};

const VisualStructureRenderer = ({
  visualStructure,
  questions,
  answers,
  onAnswerChange,
  partNumber,
  partInstructions,
  partContext,
}) => {
  if (!visualStructure) {
    // No visual structure - show instructions then questions
    return (
      <>
        {partInstructions && (
          <div className="test-instructions">
            <h2>Instructions</h2>
            <p>{partInstructions}</p>
            {partContext && (
              <p className="context-text">
                <strong>Context:</strong> {partContext}
              </p>
            )}
          </div>
        )}
        {questions.map((question) => (
          <StandaloneQuestionRenderer
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onAnswerChange={onAnswerChange}
          />
        ))}
      </>
    );
  }

  switch (visualStructure.type) {
    case "mixed":
      return (
        <div className="mixed-visual-structure">
          {visualStructure.components.map((component, idx) => {
            // Extract question IDs based on component type
            let componentQuestionIds = component.question_ids || [];

            if (
              component.type === "matching_table" &&
              component.matching_pairs
            ) {
              componentQuestionIds = component.matching_pairs.map(
                (p) => p.question_id
              );
            } else if (component.type === "matching_list" && component.items) {
              componentQuestionIds = component.items.map(
                (item) => item.question_id
              );
            } else if (component.type === "multiple_choice_block") {
              // For multiple_choice_block, extract IDs from multiple_choice questions
              componentQuestionIds = questions
                .filter((q) => q.type === "multiple_choice")
                .map((q) => q.id);
            }

            // Filter questions for this component
            const componentQuestions = questions.filter((q) =>
              componentQuestionIds.includes(q.id)
            );

            // Skip if no questions found
            if (componentQuestions.length === 0) {
              return null;
            }

            // Extract instruction text for this specific question range
            const componentInstructions =
              componentQuestionIds.length > 0
                ? extractInstructionsForRange(
                    partInstructions,
                    componentQuestionIds
                  )
                : null;

            return (
              <div key={idx} className="component-section">
                {/* Show section-specific instructions above each component */}
                {componentInstructions && (
                  <div className="component-instructions">
                    <p>{componentInstructions}</p>
                  </div>
                )}

                {component.type === "table" && (
                  <TableRenderer
                    tableData={component}
                    questions={componentQuestions}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                    partNumber={partNumber}
                  />
                )}
                {component.type === "notes" && (
                  <NotesRenderer
                    notesData={component}
                    questions={componentQuestions}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                )}
                {component.type === "multiple_choice_block" && (
                  <MultipleChoiceBlockRenderer
                    questions={componentQuestions}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                )}
                {component.type === "matching_table" && (
                  <MatchingTableRenderer
                    matchingData={component}
                    questions={componentQuestions}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                )}
                {component.type === "matching_list" && (
                  <MatchingListRenderer
                    matchingData={component}
                    questions={componentQuestions}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                )}
              </div>
            );
          })}
        </div>
      );

    case "structured_notes":
      return (
        <>
          {partInstructions && (
            <div className="test-instructions">
              <h2>Instructions</h2>
              <p>{partInstructions}</p>
              {partContext && (
                <p className="context-text">
                  <strong>Context:</strong> {partContext}
                </p>
              )}
            </div>
          )}
          <StructuredNotesRenderer
            structuredData={visualStructure}
            questions={questions}
            answers={answers}
            onAnswerChange={onAnswerChange}
          />
        </>
      );

    default:
      return (
        <>
          {partInstructions && (
            <div className="test-instructions">
              <h2>Instructions</h2>
              <p>{partInstructions}</p>
              {partContext && (
                <p className="context-text">
                  <strong>Context:</strong> {partContext}
                </p>
              )}
            </div>
          )}
          {questions.map((question) => (
            <StandaloneQuestionRenderer
              key={question.id}
              question={question}
              answer={answers[question.id]}
              onAnswerChange={onAnswerChange}
            />
          ))}
        </>
      );
  }
};

const StandaloneQuestionRenderer = ({ question, answer, onAnswerChange }) => {
  if (!question) return null;

  if (question.type === "gap_fill") {
    return (
      <div className="question-card gap-fill-card standalone">
        <div className="question-body">
          <p className="question-prompt">{question.prompt}</p>
          <div className="gap-input-container">
            <span className="question-num">{question.id}</span>
            <input
              type="text"
              className="answer-input gap-fill-input"
              value={answer || ""}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              placeholder="Type your answer..."
              maxLength={question.word_limit?.includes("ONE WORD") ? 15 : 30}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="question-card mc-card standalone">
        <div className="question-body">
          <p className="mc-question-text">{question.question}</p>
          <div className="options-list">
            {question.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = answer === letter;
              return (
                <label
                  key={idx}
                  className={`option-item ${isSelected ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={letter}
                    checked={isSelected}
                    onChange={(e) =>
                      onAnswerChange(question.id, e.target.value)
                    }
                  />
                  <span className="option-letter">{letter}</span>
                  <span className="option-content">{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "matching") {
    return (
      <div className="question-card matching-card standalone">
        <div className="question-body">
          <p className="matching-question-text">{question.question}</p>
          {question.matching_instruction && (
            <p className="matching-instruction">
              {question.matching_instruction}
            </p>
          )}
          <div className="select-container">
            <select
              className="matching-select"
              value={answer || ""}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
            >
              <option value="">-- Select an answer --</option>
              {question.matching_options?.map((option, idx) => {
                const letter = option.split(" ")[0];
                return (
                  <option key={idx} value={letter}>
                    {option}
                  </option>
                );
              })}
            </select>
          </div>
          {answer && (
            <div className="answer-preview-box">
              Your answer: <strong>{answer}</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const ListeningTestDashboard = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ielts_mock_theme") || "light";
  });
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef(null);

  // ==================== AUDIO PLAYBACK ====================
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);

  // ==================== TEXT HIGHLIGHTING ====================
  const [highlights, setHighlights] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedText, setSelectedText] = useState("");

  // ==================== SUBMIT CONFIRMATION ====================
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ==================== FULLSCREEN AND EXIT PREVENTION ====================
  useEffect(() => {
    // Note: Fullscreen can only be triggered by user gesture, not automatically
    // The browser will prevent automatic fullscreen requests for security reasons

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "F11") {
        e.preventDefault();
      }
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleFullscreenChange = () => {
      setTimeout(() => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          enterFullscreen().catch(() => {});
        }
      }, 100);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

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

  // ==================== AUDIO PLAYBACK - AUTO PLAY WITH DYNAMIC TIMER ====================
  useEffect(() => {
    const playAudioAndSetTimer = async () => {
      try {
        console.log("⏳ Attempting to start audio playback...");

        // First, ensure audio is preloaded (in case it wasn't preloaded in starter)
        let duration = audioService.getAudioDuration();
        let audio = audioService.getAudioElement();

        if (!audio || !duration) {
          console.log("🔄 Audio not cached, preloading now...");
          try {
            const result = await audioService.preloadAudio();
            duration = result.duration;
            audio = result.audio;
            console.log(
              `✓ Audio preloaded in dashboard. Duration: ${duration.toFixed(
                2
              )}s`
            );
          } catch (preloadErr) {
            console.error("✗ Failed to preload audio:", preloadErr);
            setAudioLoaded(true);
            return;
          }
        }

        // Validate audio and duration
        if (!audio) {
          console.warn("✗ Audio element is null");
          setAudioLoaded(true);
          return;
        }

        if (!duration || duration <= 0) {
          console.warn("✗ Audio duration invalid:", duration);
          setAudioLoaded(true);
          return;
        }

        // Set timer to audio duration + 5 minutes (300 seconds) for answers
        const totalTime = Math.ceil(duration) + 300;
        setTimeRemaining(totalTime);
        setAudioDuration(duration);

        console.log(
          `📊 Timer set - Duration: ${duration.toFixed(
            2
          )}s, Total test time: ${totalTime}s (${Math.floor(
            totalTime / 60
          )}:${String(totalTime % 60).padStart(2, "0")})`
        );

        // Store audio reference
        audioRef.current = audio;

        // Play audio automatically
        console.log("▶ Starting audio playback...");
        try {
          await audioService.playAudio();
          setAudioLoaded(true);
          console.log("✓ Audio now playing");
        } catch (playErr) {
          console.error("✗ Playback error:", playErr);
          setAudioLoaded(true);
        }
      } catch (err) {
        console.error("✗ Audio effect error:", err);
        setAudioLoaded(true); // Continue even if audio fails
      }
    };

    // Play audio after brief delay to ensure page is fully rendered
    const timer = setTimeout(playAudioAndSetTimer, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // ==================== SUBMIT TEST HANDLER ====================
  const handleSubmitTest = useCallback(() => {
    setShowSubmitConfirm(true);
  }, []);

  const confirmSubmitTest = useCallback(async () => {
    console.log("Test submitted with answers:", answers);

    // Calculate score
    const totalQuestions =
      testData?.parts.reduce((sum, part) => sum + part.questions.length, 0) ||
      0;
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

      // Submit listening answers to backend
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/test-sessions/submit-listening`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participant_id: participantData.id,
          full_name: participantData.full_name,
          listening_answers: answers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit listening test");
      }

      const result = await response.json();
      console.log("Listening submission response:", result);

      // Stop audio before leaving the test
      audioService.stopAudio();
      console.log("✓ Audio stopped");

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }

      // Navigate to reading starter
      navigate("/test/reading", {
        state: { startTime: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error submitting listening test:", error);
      alert(`Error submitting test: ${error.message}`);
    }
  }, [answers, navigate, testData]);

  const cancelSubmitTest = useCallback(() => {
    setShowSubmitConfirm(false);
  }, []);

  // ==================== TIMER COUNTDOWN ====================
  // ==================== TIMER COUNTDOWN ====================
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Auto-submit when timer reaches 0
      // Stop audio before leaving the test
      audioService.stopAudio();
      console.log("✓ Audio stopped");

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }

      // Navigate to reading starter
      navigate("/test/reading", {
        state: { startTime: new Date().toISOString() },
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, navigate]);

  // ==================== LOAD TEST DATA ====================
  useEffect(() => {
    try {
      const listeningSection = testDataJson.sections.find(
        (s) => s.type === "listening"
      );

      if (listeningSection) {
        setTestData({
          type: "listening",
          parts: listeningSection.parts,
        });
      } else {
        console.error("No listening section found in test data");
      }
    } catch (error) {
      console.error("Error loading test data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ANSWER CHANGE HANDLER ====================
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // ==================== VOLUME CHANGE HANDLER ====================
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    // Update CSS variable for slider background gradient
    e.target.style.setProperty("--volume-value", `${newVolume}%`);
    // Set audio volume using audioService
    audioService.setVolume(newVolume / 100);
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

    try {
      range.surroundContents(span);

      // Store highlight info
      const highlight = {
        id: Date.now(),
        text: selection.toString(),
        timestamp: new Date().toLocaleTimeString(),
      };

      setHighlights([...highlights, highlight]);

      // Add click handler to remove highlight
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
      <div className="listening-test-dashboard" data-theme={theme}>
        <div className="loading-screen">Loading test...</div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (!testData || !testData.parts || testData.parts.length === 0) {
    return (
      <div className="listening-test-dashboard" data-theme={theme}>
        <div className="error-screen">Error loading test data</div>
      </div>
    );
  }

  const currentPart = testData.parts[currentPartIndex];

  // ==================== MAIN RENDER ====================
  return (
    <div
      className="listening-test-dashboard"
      data-theme={theme}
      onContextMenu={handleContextMenu}
    >
      {/* Audio element is managed by audioService - volume changes apply to it */}

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

      {/* ==================== HEADER ==================== */}
      <div className="test-header">
        <div className="test-title">
          <h1>IELTS Listening Test</h1>
          <p>
            {currentPart.title} - Part {currentPart.part_number}
          </p>
        </div>
        <div className="test-controls">
          {/* Timer - Centered */}
          <div className="timer-container">
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

          {/* Volume Control */}
          <div className="volume-control">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              style={{ "--volume-value": `${volume}%` }}
            />
            <span className="volume-percent">{volume}%</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="test-container">
        {/* Part Header */}
        <div className="part-header">
          <h1 className="part-title">Listening</h1>
          <p className="part-subtitle">
            Questions {currentPart.questions[0]?.id || 1} -{" "}
            {currentPart.questions[currentPart.questions.length - 1]?.id || 10}
          </p>
        </div>

        {/* Visual Structure Renderer - Instructions moved inside components */}
        <div className="visual-structure-container">
          <VisualStructureRenderer
            visualStructure={currentPart.visual_structure}
            questions={currentPart.questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            partNumber={currentPart.part_number}
            partInstructions={currentPart.instructions}
            partContext={currentPart.context}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <button
            className="nav-button prev-button"
            onClick={() =>
              setCurrentPartIndex(Math.max(0, currentPartIndex - 1))
            }
            disabled={currentPartIndex === 0}
          >
            ← Previous Part
          </button>
          <button
            className="nav-button next-button"
            onClick={() =>
              setCurrentPartIndex(
                Math.min(testData.parts.length - 1, currentPartIndex + 1)
              )
            }
            disabled={currentPartIndex === testData.parts.length - 1}
          >
            Next Part →
          </button>
        </div>
      </div>

      {/* ==================== BOTTOM NAVIGATION ==================== */}
      <div className="test-bottom-nav">
        <div className="parts-navigation">
          {testData.parts.map((part, index) => (
            <button
              key={index}
              className={`part-button ${
                currentPartIndex === index ? "active" : ""
              }`}
              onClick={() => setCurrentPartIndex(index)}
            >
              Part {part.part_number}
            </button>
          ))}
        </div>
        <div className="progress-info">
          Answered: {Object.keys(answers).length} /{" "}
          {testData.parts.reduce((sum, part) => sum + part.questions.length, 0)}
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
              <h2>Submit Listening Test?</h2>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to submit your answers and move to the
                reading section?
              </p>
              <div className="modal-stats">
                <p>
                  <strong>Answered Questions:</strong>{" "}
                  {Object.keys(answers).length} /{" "}
                  {testData.parts.reduce(
                    (sum, part) => sum + part.questions.length,
                    0
                  )}
                </p>
              </div>
              <p className="modal-warning">
                Once you submit, you cannot return to modify your answers.
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={cancelSubmitTest}>
                Cancel
              </button>
              <button className="confirm-button" onClick={confirmSubmitTest}>
                Yes, Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeningTestDashboard;
