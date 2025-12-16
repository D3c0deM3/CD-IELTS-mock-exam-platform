import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./ListeningTestDashboard.css";
import testDataJson from "./mock_2.json";

// ==================== COMPONENT IMPORTS ====================
const TableRenderer = ({
  tableData,
  questions,
  answers,
  onAnswerChange,
  partNumber,
}) => {
  if (!tableData) return null;

  return (
    <div className="visual-table">
      {tableData.title && <h3 className="table-title">{tableData.title}</h3>}
      <table className="ielts-table">
        <thead>
          <tr>
            {tableData.headers.map((header, idx) => (
              <th
                key={idx}
                className={`header-${header.toLowerCase().replace(" ", "-")}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {tableData.headers.map((header, colIndex) => {
                const headerKey = header.toLowerCase().replace(" ", "_");
                const cellContent = row[headerKey];

                // Check if this cell contains a gap fill
                const gapMatch = cellContent?.match(/\d+……+/);
                if (gapMatch) {
                  // Extract question number from gap (e.g., "1………..")
                  const questionNum = parseInt(cellContent.match(/\d+/)[0]);
                  const question = questions.find((q) => q.id === questionNum);

                  if (question) {
                    const parts = cellContent.split(/(\d+……+)/);
                    return (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className="table-cell-with-gap"
                      >
                        {parts.map((part, partIndex) => {
                          if (part.match(/\d+……+/)) {
                            return (
                              <input
                                key={partIndex}
                                type="text"
                                className="table-gap-input"
                                value={answers[question.id] || ""}
                                onChange={(e) =>
                                  onAnswerChange(question.id, e.target.value)
                                }
                                style={{
                                  width: `${Math.max(part.length * 8, 50)}px`,
                                }}
                                maxLength={
                                  question.word_limit.includes("ONE WORD")
                                    ? 15
                                    : 30
                                }
                              />
                            );
                          }
                          return <span key={partIndex}>{part}</span>;
                        })}
                      </td>
                    );
                  }
                }
                return <td key={`${rowIndex}-${colIndex}`}>{cellContent}</td>;
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
          const gapMatch = item.match(/\d+……+/);
          if (gapMatch) {
            const questionNum = parseInt(item.match(/\d+/)[0]);
            const question = questions.find((q) => q.id === questionNum);

            if (question) {
              const parts = item.split(/(\d+……+)/);
              return (
                <li key={index} className="note-item-with-gap">
                  {parts.map((part, partIndex) => {
                    if (part.match(/\d+……+/)) {
                      return (
                        <input
                          key={partIndex}
                          type="text"
                          className="notes-gap-input"
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            onAnswerChange(question.id, e.target.value)
                          }
                          style={{
                            width: `${Math.max(part.length * 8, 50)}px`,
                          }}
                          maxLength={
                            question.word_limit.includes("ONE WORD") ? 15 : 30
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
            <li key={index} className="note-item">
              {item}
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
                  const parts = item.content.split(/(\d+ …………)/g);
                  return (
                    <li key={itemIndex} className="structured-item-with-gap">
                      {parts.map((part, partIndex) => {
                        if (part.match(/\d+ …………/)) {
                          return (
                            <input
                              key={partIndex}
                              type="text"
                              className="structured-gap-input"
                              value={answers[question.id] || ""}
                              onChange={(e) =>
                                onAnswerChange(question.id, e.target.value)
                              }
                              style={{ width: "100px" }}
                              maxLength={
                                question.word_limit.includes("ONE WORD")
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
  if (!matchingData) return null;

  return (
    <div className="visual-matching-table">
      <h3 className="matching-title">{matchingData.title}</h3>
      <div className="matching-instructions">{matchingData.instructions}</div>

      {matchingData.options_box && (
        <div className="matching-options-box">
          <h4>{matchingData.options_box.title}</h4>
          <div className="options-grid">
            {matchingData.options_box.options.map((option, idx) => (
              <div key={idx} className="option-tag">
                {option}
              </div>
            ))}
          </div>
        </div>
      )}

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
            return (
              <tr key={idx}>
                <td className="person-cell">{pair.person}</td>
                <td className="answer-cell">
                  <select
                    className="matching-select"
                    value={answers[question?.id] || ""}
                    onChange={(e) =>
                      onAnswerChange(question.id, e.target.value)
                    }
                  >
                    <option value="">Select answer</option>
                    {matchingData.options_box?.options.map((option, optIdx) => {
                      const letter = option.charAt(0);
                      return (
                        <option key={optIdx} value={letter}>
                          {option}
                        </option>
                      );
                    })}
                  </select>
                  {answers[question?.id] && (
                    <span className="selected-answer-preview">
                      Selected: {answers[question?.id]}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
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
            <div className="question-header-row">
              <span className="question-num">Question {question.id}</span>
            </div>
            <p className="mc-question-text">{question.question}</p>
            <div className="options-list">
              {question.options.map((option, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = answers[question.id] === letter;
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
                    <span className="option-content">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

const VisualStructureRenderer = ({
  visualStructure,
  questions,
  answers,
  onAnswerChange,
  partNumber,
}) => {
  if (!visualStructure) {
    return questions.map((question) => (
      <StandaloneQuestionRenderer
        key={question.id}
        question={question}
        answer={answers[question.id]}
        onAnswerChange={onAnswerChange}
      />
    ));
  }

  switch (visualStructure.type) {
    case "mixed":
      return (
        <div className="mixed-visual-structure">
          {visualStructure.components.map((component, idx) => {
            switch (component.type) {
              case "table":
                return (
                  <TableRenderer
                    key={idx}
                    tableData={component}
                    questions={questions.filter((q) =>
                      component.question_ids?.includes(q.id)
                    )}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                    partNumber={partNumber}
                  />
                );
              case "notes":
                return (
                  <NotesRenderer
                    key={idx}
                    notesData={component}
                    questions={questions.filter((q) =>
                      component.question_ids?.includes(q.id)
                    )}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                );
              case "multiple_choice_block":
                return (
                  <MultipleChoiceBlockRenderer
                    key={idx}
                    questions={questions}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                );
              case "matching_table":
                return (
                  <MatchingTableRenderer
                    key={idx}
                    matchingData={component}
                    questions={questions.filter((q) =>
                      component.matching_pairs?.some(
                        (p) => p.question_id === q.id
                      )
                    )}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                );
              case "matching_list":
                return (
                  <MatchingListRenderer
                    key={idx}
                    matchingData={component}
                    questions={questions.filter((q) =>
                      component.items?.some((item) => item.question_id === q.id)
                    )}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      );

    case "structured_notes":
      return (
        <StructuredNotesRenderer
          structuredData={visualStructure}
          questions={questions}
          answers={answers}
          onAnswerChange={onAnswerChange}
        />
      );

    default:
      return questions.map((question) => (
        <StandaloneQuestionRenderer
          key={question.id}
          question={question}
          answer={answers[question.id]}
          onAnswerChange={onAnswerChange}
        />
      ));
  }
};

const StandaloneQuestionRenderer = ({ question, answer, onAnswerChange }) => {
  if (question.type === "gap_fill") {
    return (
      <div className="question-card gap-fill-card standalone">
        <div className="question-header-row">
          <span className="question-num">Question {question.id}</span>
          {question.word_limit && (
            <span className="word-limit-tag">{question.word_limit}</span>
          )}
        </div>
        <div className="question-body">
          <p className="question-prompt">{question.prompt}</p>
          <input
            type="text"
            className="answer-input gap-fill-input"
            value={answer || ""}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            maxLength={question.word_limit.includes("ONE WORD") ? 15 : 30}
            autoComplete="off"
          />
        </div>
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="question-card mc-card standalone">
        <div className="question-header-row">
          <span className="question-num">Question {question.id}</span>
          <span className="question-type-tag">Multiple Choice</span>
        </div>
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
        <div className="question-header-row">
          <span className="question-num">Question {question.id}</span>
          <span className="question-type-tag">Matching</span>
        </div>
        <div className="question-body">
          <p className="matching-question-text">{question.question}</p>
          {question.matching_instruction && (
            <p className="matching-instruction">
              {question.matching_instruction}
            </p>
          )}
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
  const [volume, setVolume] = useState(75);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  // ==================== AUDIO PLAYBACK ====================
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ==================== FULLSCREEN AND EXIT PREVENTION ====================
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } catch (error) {
        console.log("Fullscreen request failed:", error);
      }
    };

    enterFullscreen();

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

  // ==================== SUBMIT TEST HANDLER ====================
  const handleSubmitTest = useCallback(() => {
    console.log("Test submitted with answers:", answers);

    // Calculate score
    const totalQuestions =
      testData?.parts.reduce((sum, part) => sum + part.questions.length, 0) ||
      0;
    const answeredQuestions = Object.keys(answers).length;

    alert(
      `Test submitted!\nYou answered ${answeredQuestions} out of ${totalQuestions} questions.`
    );

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }

    navigate("/dashboard");
  }, [answers, navigate, testData]);

  // ==================== TIMER COUNTDOWN ====================
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleSubmitTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, handleSubmitTest]);

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
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  // ==================== AUDIO CONTROLS ====================
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

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
    <div className="listening-test-dashboard" data-theme={theme}>
      {/* Audio Player (hidden) */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
      >
        <source src="/audio/listening-part-1.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* ==================== HEADER ==================== */}
      <div className="test-header">
        <div className="test-title">
          <h1>IELTS Listening Test</h1>
          <p>
            {currentPart.title} - Part {currentPart.part_number}
          </p>
        </div>
        <div className="test-controls">
          {/* Audio Controls */}
          <div className="audio-controls">
            <button className="audio-control-btn" onClick={handlePlayPause}>
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <input
              type="range"
              className="audio-progress"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
            />
            <span className="audio-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Timer */}
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
            <span>{formatTime(timeRemaining)}</span>
          </div>

          {/* Volume Control */}
          <div className="volume-control-nav">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              className="volume-slider-nav"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
            />
            <span className="volume-percent">{volume}%</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="test-container">
        {/* Instructions Section */}
        <div className="test-instructions">
          <h2>Instructions</h2>
          <p>{currentPart.instructions}</p>
          {currentPart.context && (
            <p className="context-text">
              <strong>Context:</strong> {currentPart.context}
            </p>
          )}
        </div>

        {/* Visual Structure Renderer */}
        <div className="visual-structure-container">
          <VisualStructureRenderer
            visualStructure={currentPart.visual_structure}
            questions={currentPart.questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            partNumber={currentPart.part_number}
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
    </div>
  );
};

export default ListeningTestDashboard;
