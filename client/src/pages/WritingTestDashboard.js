import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import API_CONFIG from "../config/api";
import "./WritingTestDashboard.css";
import testDataJson from "./mock_2.json";

// ==================== CHART RENDERER ====================
const ChartRenderer = ({ graphData }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const padding = 60;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    // Clear canvas
    ctx.fillStyle =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "#1a1a1a"
        : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw axes
    ctx.strokeStyle =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "#666"
        : "#333";
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "#ccc"
        : "#333";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    // X-axis label
    ctx.fillText(
      graphData.x_axis || "X Axis",
      canvas.width / 2,
      canvas.height - 10
    );

    // Y-axis label
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(graphData.y_axis || "Y Axis", 0, 0);
    ctx.restore();

    // Plot data
    if (graphData.data && graphData.data.length > 0) {
      const maxYear = Math.max(...graphData.data.map((d) => d.year));
      const minYear = Math.min(...graphData.data.map((d) => d.year));
      const maxValue = Math.max(
        ...graphData.data.flatMap((d) => [d.dog_owners || 0, d.cat_owners || 0])
      );

      // Draw grid and Y-axis numbers
      ctx.strokeStyle =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "#333"
          : "#eee";
      ctx.lineWidth = 0.5;
      ctx.fillStyle =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "#999"
          : "#666";
      ctx.font = "11px Arial";
      ctx.textAlign = "right";

      for (let i = 0; i <= 5; i++) {
        const y = padding + (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        // Draw Y-axis numbers
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillText(value, padding - 12, y + 4);
      }

      // Draw X-axis numbers (years)
      ctx.textAlign = "center";
      const yearStep = Math.ceil((maxYear - minYear) / 6);
      for (let year = minYear; year <= maxYear; year += yearStep) {
        const x = padding + ((year - minYear) / (maxYear - minYear)) * width;
        ctx.fillText(year, x, canvas.height - padding + 20);
      }

      // Draw dog owners line (blue)
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let first = true;
      graphData.data.forEach((point) => {
        const x =
          padding + ((point.year - minYear) / (maxYear - minYear)) * width;
        const y =
          canvas.height - padding - (point.dog_owners / maxValue) * height;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw cat owners line (red)
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      first = true;
      graphData.data.forEach((point) => {
        const x =
          padding + ((point.year - minYear) / (maxYear - minYear)) * width;
        const y =
          canvas.height - padding - (point.cat_owners / maxValue) * height;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      graphData.data.forEach((point) => {
        const x =
          padding + ((point.year - minYear) / (maxYear - minYear)) * width;
        const yDog =
          canvas.height - padding - (point.dog_owners / maxValue) * height;
        const yCat =
          canvas.height - padding - (point.cat_owners / maxValue) * height;

        // Dog points
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(x, yDog, 3, 0, Math.PI * 2);
        ctx.fill();

        // Cat points
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(x, yCat, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw legend
      ctx.fillStyle =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "#ccc"
          : "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "left";

      ctx.fillStyle = "#2563eb";
      ctx.fillRect(canvas.width - 150, 20, 12, 12);
      ctx.fillStyle =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "#ccc"
          : "#333";
      ctx.fillText("Dog Owners", canvas.width - 130, 30);

      ctx.fillStyle = "#dc2626";
      ctx.fillRect(canvas.width - 150, 40, 12, 12);
      ctx.fillStyle =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "#ccc"
          : "#333";
      ctx.fillText("Cat Owners", canvas.width - 130, 50);
    }
  }, [graphData]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} width={500} height={350} />
    </div>
  );
};

// ==================== TASK RENDERER ====================
const TaskRenderer = ({ task, answers, onAnswerChange }) => {
  if (!task) return null;

  const taskAnswer = answers[task.task_number] || "";
  const textareaRef = useRef(null);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [taskAnswer]);

  return (
    <div className="task-content-wrapper">
      <div className="essay-box">
        <textarea
          ref={textareaRef}
          className="essay-textarea"
          placeholder="Start writing your essay here..."
          value={taskAnswer}
          onChange={(e) => onAnswerChange(task.task_number, e.target.value)}
          spellCheck="true"
        />
        <div className="word-count">
          Words: {taskAnswer.split(/\s+/).filter((w) => w.length > 0).length}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const WritingTestDashboard = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ielts_mock_theme") || "light";
  });
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ==================== LOAD TEST DATA ====================
  useEffect(() => {
    try {
      const writingSection = testDataJson.sections.find(
        (s) => s.type === "writing"
      );

      if (writingSection) {
        setTestData({
          type: "writing",
          tasks: writingSection.tasks,
        });
      } else {
        console.error("No writing section found in test data");
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
      navigate("/test/speaking", {
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
  const handleAnswerChange = (taskNumber, value) => {
    setAnswers((prev) => ({
      ...prev,
      [taskNumber]: value,
    }));
  };

  // ==================== SUBMIT TEST HANDLER ====================
  const handleSubmitTest = useCallback(() => {
    setShowSubmitConfirm(true);
  }, []);

  const confirmSubmitTest = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      // Get participant info from localStorage
      const participantString = localStorage.getItem("currentParticipant");
      console.log("localStorage currentParticipant:", participantString);
      
      const participantData = JSON.parse(participantString || "{}");
      console.log("Parsed participant data:", participantData);
      
      if (!participantData.id || !participantData.full_name) {
        console.error("Participant data not found - id:", participantData.id, "full_name:", participantData.full_name);
        alert("Error: Participant data not found. Please restart the test.");
        setIsSubmitting(false);
        return;
      }

      // Format answers with uppercase normalization for text answers
      const formattedAnswers = {
        1: (answers[1] || "").trim(),
        2: (answers[2] || "").trim(),
      };

      // Send to backend API
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/test-sessions/submit-writing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participant_id: participantData.id,
          full_name: participantData.full_name,
          writing_answers: formattedAnswers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit writing test");
      }

      const result = await response.json();
      console.log("Writing submission response:", result);

      setShowSubmitConfirm(false);
      
      // Navigate to speaking test
      navigate("/test/speaking", {
        state: { startTime: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error submitting writing test:", error);
      alert(`Error submitting test: ${error.message}`);
      setIsSubmitting(false);
    }
  }, [answers, navigate]);

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
      <div className="writing-test-dashboard" data-theme={theme}>
        <div className="loading-screen">Loading writing test...</div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (!testData || !testData.tasks || testData.tasks.length === 0) {
    return (
      <div className="writing-test-dashboard" data-theme={theme}>
        <div className="error-screen">Error loading test data</div>
      </div>
    );
  }

  const currentTask = testData.tasks[currentTaskIndex];

  // ==================== MAIN RENDER ====================
  return (
    <div className="writing-test-dashboard" data-theme={theme}>
      {/* ==================== TOP BAR ==================== */}
      <div className="writing-top-bar">
        <div className="top-bar-left">
          <h1 className="test-title">IELTS Writing Test</h1>
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
      <div className="writing-content">
        {/* LEFT COLUMN - GRAPH/TOPIC */}
        <div className="graph-column">
          {currentTask.type === "graph_description" &&
            currentTask.graph_data && (
              <div className="graph-wrapper">
                <h2 className="graph-title">{currentTask.graph_data.title}</h2>
                <p className="instruction-text">{currentTask.instructions}</p>
                {currentTask.requirements && (
                  <p className="requirement-text">
                    <strong>Requirements:</strong> {currentTask.requirements}
                  </p>
                )}
                <ChartRenderer key={theme} graphData={currentTask.graph_data} />
                <div className="task-meta">
                  <span className="word-limit">
                    Minimum {currentTask.word_limit} words
                  </span>
                  <span className="time-limit">
                    {currentTask.time_limit} minutes
                  </span>
                </div>
              </div>
            )}
          {currentTask.type === "essay" && (
            <div className="essay-topic-wrapper">
              <h2 className="topic-title">
                Topic: Task {currentTask.task_number}
              </h2>
              <p className="topic-text">{currentTask.instructions}</p>
              {currentTask.questions && currentTask.questions.length > 0 && (
                <div className="topic-questions">
                  {currentTask.questions.map((question, idx) => (
                    <p key={idx} className="topic-question-item">
                      {idx + 1}. {question}
                    </p>
                  ))}
                </div>
              )}
              {currentTask.requirements && (
                <p className="requirement-text">
                  <strong>Requirements:</strong> {currentTask.requirements}
                </p>
              )}
              <div className="task-meta">
                <span className="word-limit">
                  Minimum {currentTask.word_limit} words
                </span>
                <span className="time-limit">
                  {currentTask.time_limit} minutes
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - ESSAY WRITING BOX */}
        <div className="essay-column">
          <TaskRenderer
            task={currentTask}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        </div>
      </div>

      {/* ==================== BOTTOM BAR ==================== */}
      <div className="writing-bottom-bar">
        <div className="tasks-navigation">
          {testData.tasks.map((task, index) => (
            <button
              key={index}
              className={`task-button ${
                currentTaskIndex === index ? "active" : ""
              }`}
              onClick={() => setCurrentTaskIndex(index)}
            >
              Task {task.task_number}
            </button>
          ))}
        </div>

        <div className="word-count-info">
          Task 1:{" "}
          {(answers[1] || "").split(/\s+/).filter((w) => w.length > 0).length}{" "}
          words | Task 2:{" "}
          {(answers[2] || "").split(/\s+/).filter((w) => w.length > 0).length}{" "}
          words
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
              <h2>Submit Writing Test?</h2>
            </div>
            <div className="modal-body">
              <p className="word-summary">
                Task 1:{" "}
                <strong>
                  {
                    (answers[1] || "").split(/\s+/).filter((w) => w.length > 0)
                      .length
                  }
                </strong>{" "}
                words
              </p>
              <p className="word-summary">
                Task 2:{" "}
                <strong>
                  {
                    (answers[2] || "").split(/\s+/).filter((w) => w.length > 0)
                      .length
                  }
                </strong>{" "}
                words
              </p>
              <p className="warning-message">
                Once you submit, you cannot return to modify your answers.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={cancelSubmitTest}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="confirm-button" 
                onClick={confirmSubmitTest}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingTestDashboard;
