import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import API_CONFIG from "../config/api";
import { apiClient } from "../services/api";
import useAnswersWithStorage from "../hooks/useAnswersWithStorage";
import useTimerWithStorage from "../hooks/useTimerWithStorage";
import "./WritingTestDashboard.css";
import testDataJson2 from "./mock_2.json";
import testDataJson3 from "./mock_3.json";

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

    // Determine axis labels - support both old and new formats
    const xAxisLabel = graphData.x_axis?.title || graphData.x_axis || "X Axis";
    const yAxisLabel = graphData.y_axis?.title || graphData.y_axis || "Y Axis";

    // X-axis label
    ctx.fillText(xAxisLabel, canvas.width / 2, canvas.height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // Determine data structure - support both old and new formats
    let chartData = [];
    const colors = ["#2563eb", "#dc2626", "#2ca02c", "#d62728"];
    let seriesNames = [];

    // Check if new format (with series array)
    if (graphData.series && Array.isArray(graphData.series)) {
      // New format: convert series to plottable format
      chartData = graphData.series.map((series, idx) => ({
        name: series.name,
        points: series.points,
        color: series.color_suggestion || colors[idx],
      }));
      seriesNames = chartData.map((s) => s.name);

      // Handle categorical x-axis
      const xLabels = graphData.x_axis?.labels || [];
      const yMin = graphData.y_axis?.min || 0;
      const yMax = graphData.y_axis?.max || 10;

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

      // Draw Y-axis grid and numbers
      const yStep = graphData.y_axis?.step || (yMax - yMin) / 5;
      for (let value = yMin; value <= yMax; value += yStep) {
        const y =
          canvas.height - padding - ((value - yMin) / (yMax - yMin)) * height;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        ctx.fillText(value, padding - 12, y + 4);
      }

      // Draw X-axis labels
      ctx.textAlign = "center";
      const xStep = Math.max(1, Math.floor(xLabels.length / 6));
      xLabels.forEach((label, idx) => {
        const x = padding + (idx / (xLabels.length - 1 || 1)) * width;
        if (idx % xStep === 0 || idx === xLabels.length - 1) {
          ctx.fillText(label, x, canvas.height - padding + 20);
        }
      });

      // Draw each series
      chartData.forEach((series) => {
        ctx.strokeStyle = series.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let first = true;

        series.points.forEach((value, idx) => {
          const x = padding + (idx / (series.points.length - 1 || 1)) * width;
          const y =
            canvas.height - padding - ((value - yMin) / (yMax - yMin)) * height;

          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Draw points
        ctx.fillStyle = series.color;
        series.points.forEach((value, idx) => {
          const x = padding + (idx / (series.points.length - 1 || 1)) * width;
          const y =
            canvas.height - padding - ((value - yMin) / (yMax - yMin)) * height;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    } else if (graphData.data && graphData.data.length > 0) {
      // Old format: simple two-series chart
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

    // Draw legend for new format series
    if (chartData.length > 0 && seriesNames.length > 0) {
      ctx.font = "12px Arial";
      ctx.textAlign = "left";

      seriesNames.forEach((name, idx) => {
        const color = chartData[idx]?.color || colors[idx];
        const yPos = 20 + idx * 20;

        ctx.fillStyle = color;
        ctx.fillRect(canvas.width - 150, yPos, 12, 12);
        ctx.fillStyle =
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "#ccc"
            : "#333";
        ctx.fillText(name, canvas.width - 130, yPos + 10);
      });
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
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
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
  const [answers, setAnswers] = useAnswersWithStorage("writing_answers");
  const [timeRemaining, setTimeRemaining] = useTimerWithStorage(
    60 * 60,
    "writing_timer"
  ); // 60 minutes
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const loadTestData = async () => {
      try {
        // Get test_materials_id from participant data stored in localStorage
        const participant = JSON.parse(
          localStorage.getItem("currentParticipant") || "{}"
        );
        const testMaterialsId = participant.test_materials_id || 2; // Default to mock 2

        let selectedTestData = null;

        try {
          const response = await apiClient.get(
            `/api/materials/sets/${testMaterialsId}/content`
          );
          if (response?.content?.sections) {
            selectedTestData = response.content;
          }
        } catch (err) {
          selectedTestData = null;
        }

        if (!selectedTestData) {
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
        }

        const writingSection = selectedTestData.sections.find(
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
    };

    loadTestData();
  }, []);

  // ==================== TIMER COUNTDOWN ====================
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Auto-submit when timer reaches 0
      setShowSubmitConfirm(false);
      navigate("/test/end", {
        state: { submittedAt: new Date().toISOString() },
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
        console.error(
          "Participant data not found - id:",
          participantData.id,
          "full_name:",
          participantData.full_name
        );
        alert("Error: Participant data not found. Please restart the test.");
        setIsSubmitting(false);
        return;
      }

      // Format answers with essay content
      const formattedAnswers = {
        1: (answers[1] || "").trim(),
        2: (answers[2] || "").trim(),
      };

      // Calculate word counts for each task
      const countWords = (text) => {
        return text.split(/\s+/).filter((word) => word.length > 0).length;
      };

      // Send to backend API with full essay content
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/test-sessions/submit-writing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participant_id: participantData.id,
            participant_id_code: participantData.participant_id_code,
            session_id: participantData.session_id,
            full_name: participantData.full_name,
            phone_number: participantData.phone_number || "",
            writing_answers: formattedAnswers,
            task_1_word_count: countWords(formattedAnswers[1]),
            task_2_word_count: countWords(formattedAnswers[2]),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit writing test");
      }

      const result = await response.json();
      console.log("Writing submission response:", result);

      // Clear ALL localStorage keys after successful submission of final test
      // Listening test keys
      localStorage.removeItem("listening_answers");
      localStorage.removeItem("listening_audio_state");
      localStorage.removeItem("listening_timer");

      // Reading test keys
      localStorage.removeItem("reading_answers");
      localStorage.removeItem("reading_timer");

      // Writing test keys
      localStorage.removeItem("writing_answers");
      localStorage.removeItem("writing_timer");

      console.log("✓ All test data cleared from localStorage");

      setShowSubmitConfirm(false);

      // Navigate to end test screen
      navigate("/test/end", {
        state: { submittedAt: new Date().toISOString() },
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
