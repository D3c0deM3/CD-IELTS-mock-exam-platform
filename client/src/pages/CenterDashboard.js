import React, { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";
import AnswerChecker from "../components/AnswerChecker";
import centerService from "../services/centerService";
import "./CenterDashboard.css";

const CenterDashboard = () => {
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [tests, setTests] = useState([]);
  const [testMaterials, setTestMaterials] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [centerProfile, setCenterProfile] = useState(null);

  // Students
  const [students, setStudents] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [showStudentStatsModal, setShowStudentStatsModal] = useState(false);
  const [selectedStudentStats, setSelectedStudentStats] = useState(null);

  // Session creation
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    test_id: "",
    test_materials_id: "",
    session_date: "",
    location: "",
    max_capacity: "",
    admin_notes: "",
  });

  // Participant registration with search
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [participantSearchResults, setParticipantSearchResults] = useState([]);
  const [participantSearchLoading, setParticipantSearchLoading] = useState(false);

  // Scores modal
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [scoresForm, setScoresForm] = useState({ writing_score: "", speaking_score: "" });
  const [scoresModalTab, setScoresModalTab] = useState("scores");

  // Dashboard / monitoring
  const [dashboardStats, setDashboardStats] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerActive, setTimerActive] = useState(false);

  // Delete session
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Incomplete scores
  const [showIncompleteScoresModal, setShowIncompleteScoresModal] = useState(false);
  const [incompleteScoresData, setIncompleteScoresData] = useState([]);

  // Results
  const [results, setResults] = useState([]);

  // Writing submissions
  const [writingSubmissions, setWritingSubmissions] = useState([]);

  const searchTimeoutRef = useRef(null);
  const participantSearchTimeoutRef = useRef(null);

  // ==================== DATA FETCHING ====================

  useEffect(() => {
    fetchSessions();
    fetchTests();
    fetchTestMaterials();
    fetchProfile();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionParticipants(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
    }
  }, [selectedSession]);

  // Polling for monitoring
  useEffect(() => {
    if (selectedSession && activeTab === "session-monitor") {
      const interval = setInterval(() => {
        fetchSessionDashboard(selectedSession.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedSession, activeTab]);

  // Timer countdown - fixed behavior
  useEffect(() => {
    if (!dashboardStats?.session?.test_started_at) {
      return;
    }

    // If test_end_at exists, check if already expired
    if (dashboardStats.session.test_end_at) {
      const endTime = new Date(dashboardStats.session.test_end_at).getTime();
      const now = Date.now();

      if (now >= endTime) {
        setTimeRemaining(0);
        setTimerActive(false);
        return;
      }

      // Timer is active
      setTimerActive(true);

      const timer = setInterval(() => {
        const currentTime = Date.now();
        const msRemaining = endTime - currentTime;

        if (msRemaining <= 0) {
          setTimeRemaining(0);
          setTimerActive(false);
          clearInterval(timer);
        } else {
          setTimeRemaining(Math.ceil(msRemaining / 1000));
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [dashboardStats?.session?.test_started_at, dashboardStats?.session?.test_end_at]);

  // Stop timer when all completed
  useEffect(() => {
    if (
      dashboardStats?.stats?.test_completed === dashboardStats?.stats?.total &&
      dashboardStats?.stats?.total > 0
    ) {
      setTimerActive(false);
      setTimeRemaining(null);
    }
  }, [dashboardStats?.stats?.test_completed, dashboardStats?.stats?.total]);

  const fetchProfile = async () => {
    try {
      const response = await centerService.getProfile();
      setCenterProfile(response);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await centerService.getSessions();
      setSessions(response);
    } catch (err) {
      setError("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await centerService.getTests();
      setTests(response);
    } catch (err) {
      console.error("Failed to fetch tests:", err);
    }
  };

  const fetchTestMaterials = async () => {
    try {
      const response = await centerService.getTestMaterials();
      setTestMaterials(response.materials || response);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await centerService.getStudents();
      setStudents(response);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  const fetchSessionParticipants = async (sessionId) => {
    try {
      const response = await centerService.getSessionParticipants(sessionId);
      setParticipants(response);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    }
  };

  const fetchSessionDashboard = async (sessionId) => {
    try {
      const response = await centerService.getSessionDashboard(sessionId);
      setDashboardStats(response);
      setParticipants(response.participants);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await centerService.getResults();
      setResults(response);
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWritingSubmissions = async (sessionId) => {
    try {
      setLoading(true);
      const response = await centerService.getWritingSubmissions(sessionId);
      setWritingSubmissions(response.submissions || []);
    } catch (err) {
      console.error("Failed to fetch writing submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STUDENT MANAGEMENT ====================

  const handleStudentSearch = useCallback(
    (query) => {
      setStudentSearchQuery(query);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      if (query.trim().length < 2) {
        setStudentSearchResults([]);
        return;
      }

      setStudentSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await centerService.searchStudents(query);
          setStudentSearchResults(results);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setStudentSearchLoading(false);
        }
      }, 300);
    },
    []
  );

  const handleAddStudent = async (studentId) => {
    try {
      await centerService.addStudent(studentId);
      setStudentSearchQuery("");
      setStudentSearchResults([]);
      fetchStudents();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to add student";
      setError(msg);
    }
  };

  const handleRemoveStudent = async (centerStudentId) => {
    if (!window.confirm("Remove this student from your center?")) return;
    try {
      await centerService.removeStudent(centerStudentId);
      fetchStudents();
    } catch (err) {
      setError("Failed to remove student");
    }
  };

  const handleViewStudentStats = async (userId) => {
    try {
      setLoading(true);
      const stats = await centerService.getStudentStats(userId);
      setSelectedStudentStats(stats);
      setShowStudentStatsModal(true);
    } catch (err) {
      setError("Failed to load student stats");
    } finally {
      setLoading(false);
    }
  };

  // ==================== SESSION MANAGEMENT ====================

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.test_id || !sessionForm.test_materials_id || !sessionForm.session_date || !sessionForm.location) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await centerService.createSession(
        sessionForm.test_id,
        sessionForm.session_date,
        sessionForm.location,
        sessionForm.max_capacity,
        sessionForm.admin_notes,
        sessionForm.test_materials_id
      );
      setSessionForm({ test_id: "", session_date: "", location: "", max_capacity: "", admin_notes: "", test_materials_id: "" });
      setShowCreateSessionModal(false);
      fetchSessions();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (deleteConfirmationText.trim() !== "Yes delete this session") {
      alert("Please type exactly 'Yes delete this session' to confirm");
      return;
    }

    try {
      setLoading(true);
      await centerService.deleteSession(sessionToDelete.id);
      setShowDeleteSessionModal(false);
      setDeleteConfirmationText("");
      setSessionToDelete(null);
      setSelectedSession(null);
      fetchSessions();
    } catch (err) {
      setError("Failed to delete session");
    } finally {
      setLoading(false);
    }
  };

  // ==================== PARTICIPANT MANAGEMENT (with search) ====================

  const handleParticipantSearch = useCallback(
    (query) => {
      setParticipantSearchQuery(query);
      if (participantSearchTimeoutRef.current) clearTimeout(participantSearchTimeoutRef.current);

      if (query.trim().length < 1 || !selectedSession) {
        setParticipantSearchResults([]);
        return;
      }

      setParticipantSearchLoading(true);
      participantSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await centerService.searchSessionStudents(selectedSession.id, query);
          setParticipantSearchResults(results);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setParticipantSearchLoading(false);
        }
      }, 300);
    },
    [selectedSession]
  );

  const handleAddParticipant = async (student) => {
    try {
      setLoading(true);
      setError("");
      const response = await centerService.registerParticipant(
        selectedSession.id,
        student.full_name,
        student.phone_number
      );
      setParticipantSearchQuery("");
      setParticipantSearchResults([]);
      alert(`Participant registered! ID: ${response.participant.participant_id_code}`);
      fetchSessionParticipants(selectedSession.id);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to register participant";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEST CONTROLS ====================

  const handleStartAllTests = async () => {
    if (!window.confirm("Start test for all entered participants? This cannot be undone.")) return;
    try {
      setLoading(true);
      const response = await centerService.startAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`Test started for ${response.updated_count} participants!`);
    } catch (err) {
      setError("Failed to start tests");
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAll = async () => {
    if (!window.confirm("Pause all active tests?")) return;
    try {
      setLoading(true);
      const response = await centerService.pauseAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`${response.paused_count} tests paused`);
    } catch (err) {
      setError("Failed to pause");
    } finally {
      setLoading(false);
    }
  };

  const handleRestartAll = async () => {
    if (!window.confirm("Restart all paused tests?")) return;
    try {
      setLoading(true);
      const response = await centerService.restartAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`${response.restarted_count} tests restarted`);
    } catch (err) {
      setError("Failed to restart");
    } finally {
      setLoading(false);
    }
  };

  const handleEndAll = async () => {
    if (!window.confirm("End all active/paused tests? This cannot be undone.")) return;
    try {
      setLoading(true);
      setTimerActive(false);
      setTimeRemaining(null);
      const response = await centerService.endAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`${response.ended_count} tests ended`);
    } catch (err) {
      setError("Failed to end tests");
    } finally {
      setLoading(false);
    }
  };

  const handlePauseParticipant = async (pid) => {
    try {
      await centerService.pauseParticipantTest(selectedSession.id, pid);
      fetchSessionDashboard(selectedSession.id);
    } catch (err) {
      setError("Failed to pause");
    }
  };

  const handleRestartParticipant = async (pid) => {
    try {
      await centerService.restartParticipantTest(selectedSession.id, pid);
      fetchSessionDashboard(selectedSession.id);
    } catch (err) {
      setError("Failed to restart");
    }
  };

  const handleEndParticipant = async (pid) => {
    if (!window.confirm("End test for this participant?")) return;
    try {
      await centerService.endParticipantTest(selectedSession.id, pid);
      fetchSessionDashboard(selectedSession.id);
    } catch (err) {
      setError("Failed to end test");
    }
  };

  // ==================== SCORES ====================

  const openScoresModal = (participant) => {
    setSelectedParticipant(participant);
    setScoresForm({
      writing_score: participant.writing_score || "",
      speaking_score: participant.speaking_score || "",
    });
    setScoresModalTab("scores");
    setShowScoresModal(true);
  };

  const handleUpdateScores = async (e) => {
    e.preventDefault();
    if (scoresForm.writing_score === "" || scoresForm.speaking_score === "") {
      setError("Both scores are required");
      return;
    }

    try {
      setLoading(true);
      await centerService.updateParticipantScores(
        selectedParticipant.id,
        parseFloat(scoresForm.writing_score),
        parseFloat(scoresForm.speaking_score)
      );
      setShowScoresModal(false);
      setSelectedParticipant(null);
      fetchSessionParticipants(selectedSession.id);
      alert("Scores updated!");
    } catch (err) {
      setError("Failed to update scores");
    } finally {
      setLoading(false);
    }
  };

  // ==================== SAVE & END ====================

  const handleSaveAndEndSession = async () => {
    const completedParticipants = participants.filter((p) => p.test_status === "completed");

    if (completedParticipants.length === 0) {
      setIncompleteScoresData([]);
      setShowIncompleteScoresModal(true);
      return;
    }

    const incompleteScores = completedParticipants.filter(
      (p) =>
        p.listening_score === null || p.reading_score === null ||
        p.writing_score === null || p.writing_score === 0 ||
        p.speaking_score === null || p.speaking_score === 0
    );

    if (incompleteScores.length > 0) {
      const incompleteList = incompleteScores.map((p) => {
        const missing = [];
        if (p.listening_score === null) missing.push("Listening");
        if (p.reading_score === null) missing.push("Reading");
        if (p.writing_score === null || p.writing_score === 0) missing.push("Writing");
        if (p.speaking_score === null || p.speaking_score === 0) missing.push("Speaking");
        return { name: p.full_name, missing: missing.join(", ") };
      });
      setIncompleteScoresData(incompleteList);
      setShowIncompleteScoresModal(true);
      return;
    }

    if (!window.confirm("Save all results and end session? This will finalize scores.")) return;

    try {
      setLoading(true);
      const response = await centerService.saveAndEndSession(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`Session completed! ${response.saved_count} results saved.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save session");
    } finally {
      setLoading(false);
    }
  };

  // ==================== HELPERS ====================

  const formatTimeRemaining = (seconds) => {
    if (seconds == null) return "--:--:--";
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const getScreenLabel = (screen) => {
    const labels = {
      not_started: "Not Started",
      listening: "Listening",
      reading: "Reading",
      writing: "Writing",
      results: "Results",
      pending: "Pending",
    };
    return labels[screen] || screen || "Not Started";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "completed";
      case "in_progress": return "active";
      case "paused": return "paused";
      default: return "inactive";
    }
  };

  // ==================== PROGRESS BAR COMPONENT ====================

  const StudentProgressBar = ({ student }) => {
    const totalTests = student.total_tests || 0;
    const avgScore = student.avg_score ? parseFloat(student.avg_score) : 0;
    const progressPercent = Math.min(100, (avgScore / 9) * 100);

    return (
      <div className="student-progress-bar">
        <div className="progress-info">
          <span className="progress-tests">{totalTests} tests</span>
          <span className="progress-avg">
            {avgScore > 0 ? `Avg: ${avgScore.toFixed(1)}` : "No scores"}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                avgScore >= 7 ? "var(--success)" :
                avgScore >= 5 ? "var(--warning)" :
                avgScore > 0 ? "var(--error)" : "var(--bg-secondary)",
            }}
          />
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="center-dashboard-wrapper">
      <Navbar />
      <ThemeToggle />
      <div className="center-dashboard">
        <div className="center-container">
          {/* Header */}
          <div className="center-header">
            <h1>Course Center Dashboard</h1>
            <p>
              {centerProfile?.center?.center_name || "Course Center"} — Manage sessions, students, and results
              {centerProfile?.center?.max_session_users && (
                <span className="capacity-badge">
                  Max {centerProfile.center.max_session_users} users/session
                </span>
              )}
            </p>
          </div>

          {error && (
            <div className="admin-alert admin-alert-error" onClick={() => setError("")}>
              {error}
              <span style={{ float: "right", cursor: "pointer" }}>×</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === "sessions" ? "active" : ""}`}
              onClick={() => setActiveTab("sessions")}
            >
              Sessions
            </button>
            <button
              className={`tab-button ${activeTab === "session-monitor" ? "active" : ""}`}
              onClick={() => setActiveTab("session-monitor")}
              disabled={!selectedSession}
            >
              Monitor Session
            </button>
            <button
              className={`tab-button ${activeTab === "writing-submissions" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("writing-submissions");
                if (selectedSession) fetchWritingSubmissions(selectedSession.id);
              }}
              disabled={!selectedSession}
            >
              Writing Submissions
            </button>
            <button
              className={`tab-button ${activeTab === "tests" ? "active" : ""}`}
              onClick={() => setActiveTab("tests")}
            >
              Tests & Materials
            </button>
            <button
              className={`tab-button ${activeTab === "students" ? "active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              My Students
            </button>
            <button
              className={`tab-button ${activeTab === "results" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("results");
                fetchResults();
              }}
            >
              Results
            </button>
          </div>

          {/* ==================== SESSIONS TAB ==================== */}
          {activeTab === "sessions" && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>Test Sessions</h2>
                  <button className="btn btn-primary" onClick={() => setShowCreateSessionModal(true)}>
                    + Create Session
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <p style={{ color: "var(--muted)", padding: "16px" }}>No sessions yet. Create one to get started.</p>
                ) : (
                  <div className="sessions-list">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`session-item ${selectedSession?.id === session.id ? "active" : ""}`}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <div onClick={() => setSelectedSession(session)} style={{ flex: 1, cursor: "pointer" }}>
                          <div className="session-title">{session.test_name}</div>
                          <div className="session-meta">
                            <span>📅 {new Date(session.session_date).toLocaleString()}</span>
                            <span>📍 {session.location}</span>
                            <span>👥 {session.registered_count}/{session.max_capacity || "∞"} participants</span>
                            <span className="badge badge-info">{session.status}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(session);
                            setShowDeleteSessionModal(true);
                            setDeleteConfirmationText("");
                          }}
                          style={{ marginLeft: "12px" }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== SESSION MONITOR TAB ==================== */}
          {activeTab === "session-monitor" && selectedSession && dashboardStats && (
            <div>
              {/* Monitoring Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total</div>
                  <div className="stat-value">{dashboardStats.stats.total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Entered</div>
                  <div className="stat-value">{dashboardStats.stats.entered_startscreen}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">In Progress</div>
                  <div className="stat-value">{dashboardStats.stats.test_started}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active Now</div>
                  <div className="stat-value" style={{ color: "var(--success)" }}>
                    {dashboardStats.stats.currently_active}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Paused</div>
                  <div className="stat-value" style={{ color: "var(--warning)" }}>
                    {dashboardStats.stats.paused}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Offline</div>
                  <div className="stat-value" style={{ color: "var(--error)" }}>
                    {dashboardStats.stats.offline_or_disconnected}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Completed</div>
                  <div className="stat-value">{dashboardStats.stats.test_completed}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Tab Switches</div>
                  <div className="stat-value" style={{ color: dashboardStats.stats.total_tab_switches > 0 ? "var(--error)" : "var(--muted)" }}>
                    {dashboardStats.stats.total_tab_switches || 0}
                  </div>
                </div>
              </div>

              {/* Timer */}
              {dashboardStats.session.test_started_at && timerActive && timeRemaining !== null && (
                <div
                  className="card timer-card"
                  style={{
                    borderLeft: timeRemaining <= 300 ? "4px solid var(--error)" : "4px solid var(--success)",
                  }}
                >
                  <div className="card-header">
                    <h3>Test Timer</h3>
                  </div>
                  <div className="timer-content">
                    <p><strong>Started:</strong> {new Date(dashboardStats.session.test_started_at).toLocaleTimeString()}</p>
                    <p><strong>Expires:</strong> {new Date(dashboardStats.session.test_end_at).toLocaleTimeString()}</p>
                    <div className={`timer-display ${timeRemaining <= 300 ? "timer-danger" : "timer-normal"}`}>
                      <p className="timer-label">Time Remaining</p>
                      <p className="timer-value">{formatTimeRemaining(timeRemaining)}</p>
                      {timeRemaining <= 300 && <p className="timer-warning">Less than 5 minutes remaining</p>}
                    </div>
                  </div>
                </div>
              )}

              {dashboardStats.session.test_started_at && !timerActive && timeRemaining === null && (
                <div className="card" style={{ borderLeft: "4px solid var(--success)", backgroundColor: "rgba(34, 197, 94, 0.05)" }}>
                  <div className="card-header"><h3>Test Completed</h3></div>
                  <div style={{ padding: "12px 16px", textAlign: "center" }}>
                    <p style={{ color: "var(--success)", fontWeight: "bold" }}>All tests have been ended or expired</p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="card">
                <div className="card-header"><h3>Session Controls</h3></div>
                <div className="controls-bar">
                  <button className="btn btn-success" onClick={handleStartAllTests} disabled={dashboardStats.session.test_started_at}>
                    Start All
                  </button>
                  <button className="btn btn-warning" onClick={handlePauseAll} disabled={!dashboardStats.session.test_started_at}>
                    Pause All
                  </button>
                  <button className="btn btn-info" onClick={handleRestartAll} disabled={!dashboardStats.session.test_started_at}>
                    Restart All
                  </button>
                  <button className="btn btn-danger" onClick={handleEndAll} disabled={!dashboardStats.session.test_started_at}>
                    End All
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleSaveAndEndSession}
                    disabled={!dashboardStats.session.test_started_at || dashboardStats.session.status === "completed"}
                    style={{ marginLeft: "auto" }}
                  >
                    Save & End Session
                  </button>
                </div>
              </div>

              {/* Participants Table with Monitoring */}
              <div className="card">
                <div className="card-header">
                  <h3>Participants ({participants.length})</h3>
                  <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)}>
                    + Add Participant
                  </button>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Screen</th>
                        <th>Status</th>
                        <th>L</th>
                        <th>R</th>
                        <th>W</th>
                        <th>S</th>
                        <th>Tabs</th>
                        <th>Focus</th>
                        <th>Activity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className={p.tab_switch_count > 0 || p.focus_lost_count > 0 ? "flagged-row" : ""}>
                          <td><strong>{p.participant_id_code}</strong></td>
                          <td>{p.full_name}</td>
                          <td>{p.phone_number || "—"}</td>
                          <td>
                            <span className={`screen-badge screen-${p.current_screen || "not_started"}`}>
                              {getScreenLabel(p.current_screen)}
                            </span>
                          </td>
                          <td>
                            <span className="status-indicator">
                              <span className={`status-dot ${getStatusColor(p.test_status)}`}></span>
                              {p.test_status || "not_started"}
                            </span>
                          </td>
                          <td>{p.listening_score != null ? `${Math.round(p.listening_score)}/40` : "—"}</td>
                          <td>{p.reading_score != null ? `${Math.round(p.reading_score)}/40` : "—"}</td>
                          <td>{p.writing_score === 0 ? "Pending" : p.writing_score != null ? Math.round(p.writing_score) : "—"}</td>
                          <td>{p.speaking_score != null ? Math.round(p.speaking_score) : "—"}</td>
                          <td>
                            <span className={`monitor-badge ${(p.tab_switch_count || 0) > 0 ? "monitor-warning" : ""}`}>
                              {p.tab_switch_count || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`monitor-badge ${(p.focus_lost_count || 0) > 0 ? "monitor-warning" : ""}`}>
                              {p.focus_lost_count || 0}
                            </span>
                          </td>
                          <td>{p.last_activity_at ? new Date(p.last_activity_at).toLocaleTimeString() : "—"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button className="btn btn-small btn-secondary" onClick={() => openScoresModal(p)}>Scores</button>
                              {p.test_status === "in_progress" && (
                                <>
                                  <button className="btn btn-small btn-warning" onClick={() => handlePauseParticipant(p.id)}>Pause</button>
                                  <button className="btn btn-small btn-danger" onClick={() => handleEndParticipant(p.id)}>End</button>
                                </>
                              )}
                              {p.test_status === "paused" && (
                                <button className="btn btn-small btn-info" onClick={() => handleRestartParticipant(p.id)}>Restart</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== WRITING SUBMISSIONS TAB ==================== */}
          {activeTab === "writing-submissions" && selectedSession && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>Writing Submissions</h2>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                    {writingSubmissions.length} submissions
                  </p>
                </div>
                {writingSubmissions.length === 0 ? (
                  <p style={{ padding: "16px", color: "var(--muted)" }}>No writing submissions yet.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Task 1 Words</th>
                          <th>Task 2 Words</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {writingSubmissions.map((sub) => (
                          <tr key={sub.id}>
                            <td><strong>{sub.participant_id_code}</strong></td>
                            <td>{sub.full_name}</td>
                            <td>{sub.task_1_word_count} {sub.task_1_word_count >= 150 ? "✓" : ""}</td>
                            <td>{sub.task_2_word_count} {sub.task_2_word_count >= 250 ? "✓" : ""}</td>
                            <td>{sub.writing_score || "—"}</td>
                            <td>{sub.is_reviewed ? "Reviewed" : "Pending"}</td>
                            <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TESTS & MATERIALS TAB ==================== */}
          {activeTab === "tests" && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>Available Tests</h2>
                </div>
                {tests.length === 0 ? (
                  <p style={{ color: "var(--muted)", padding: "16px" }}>No tests available.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((test) => (
                          <tr key={test.id}>
                            <td>{test.id}</td>
                            <td>{test.name}</td>
                            <td>{test.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: "16px" }}>
                <div className="card-header">
                  <h2>Test Materials</h2>
                </div>
                {testMaterials.length === 0 ? (
                  <p style={{ color: "var(--muted)", padding: "16px" }}>No materials available.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Test</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testMaterials.map((m) => (
                          <tr key={m.mock_id}>
                            <td>{m.mock_id}</td>
                            <td>{m.name}</td>
                            <td>{m.test_name || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== MY STUDENTS TAB ==================== */}
          {activeTab === "students" && (
            <div>
              {/* Add Student Search */}
              <div className="card">
                <div className="card-header">
                  <h2>Add Students</h2>
                </div>
                <div style={{ padding: "16px" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by name or phone number..."
                    value={studentSearchQuery}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                  />
                  {studentSearchLoading && <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Searching...</p>}
                  {studentSearchResults.length > 0 && (
                    <div className="search-results">
                      {studentSearchResults.map((user) => (
                        <div key={user.id} className="search-result-item">
                          <div className="search-result-info">
                            <span className="search-result-name">{user.full_name}</span>
                            <span className="search-result-phone">{user.phone_number}</span>
                          </div>
                          <button className="btn btn-small btn-primary" onClick={() => handleAddStudent(user.id)}>
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Students List with Progress */}
              <div className="card" style={{ marginTop: "16px" }}>
                <div className="card-header">
                  <h2>My Students ({students.length})</h2>
                </div>
                {students.length === 0 ? (
                  <p style={{ color: "var(--muted)", padding: "16px" }}>No students added yet. Search above to add students.</p>
                ) : (
                  <div className="students-grid">
                    {students.map((student) => (
                      <div key={student.center_student_id} className="student-card">
                        <div className="student-card-header">
                          <div>
                            <h4 className="student-name">{student.full_name}</h4>
                            <p className="student-phone">{student.phone_number}</p>
                          </div>
                          <div className="student-card-actions">
                            <button
                              className="btn btn-small btn-info"
                              onClick={() => handleViewStudentStats(student.user_id)}
                            >
                              Stats
                            </button>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleRemoveStudent(student.center_student_id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <StudentProgressBar student={student} />
                        <div className="student-meta">
                          <span>Added: {new Date(student.added_at).toLocaleDateString()}</span>
                          {student.last_test_date && (
                            <span>Last test: {new Date(student.last_test_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== RESULTS TAB ==================== */}
          {activeTab === "results" && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>Student Results ({results.length})</h2>
                </div>
                {results.length === 0 ? (
                  <p style={{ color: "var(--muted)", padding: "16px" }}>No results yet.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Test</th>
                          <th>Listening</th>
                          <th>Reading</th>
                          <th>Writing</th>
                          <th>Speaking</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.id}>
                            <td>{r.full_name}</td>
                            <td>{r.test_name}</td>
                            <td>{r.listening_score != null ? parseFloat(r.listening_score).toFixed(1) : "—"}</td>
                            <td>{r.reading_score != null ? parseFloat(r.reading_score).toFixed(1) : "—"}</td>
                            <td>{r.writing_score != null ? parseFloat(r.writing_score).toFixed(1) : "—"}</td>
                            <td>{r.speaking_score != null ? parseFloat(r.speaking_score).toFixed(1) : "—"}</td>
                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div className="modal-overlay" onClick={() => setShowCreateSessionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Create Test Session</div>
            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label className="form-label">Test *</label>
                <select
                  className="form-select"
                  value={sessionForm.test_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, test_id: e.target.value })}
                  required
                >
                  <option value="">Select a test</option>
                  {tests.map((test) => (
                    <option key={test.id} value={test.id}>{test.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Test Materials *</label>
                <select
                  className="form-select"
                  value={sessionForm.test_materials_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, test_materials_id: parseInt(e.target.value) || "" })}
                  required
                >
                  <option value="">Select materials</option>
                  {testMaterials
                    .filter((m) => {
                      if (!sessionForm.test_id) return true;
                      if (!m.test_id) return true;
                      return parseInt(m.test_id, 10) === parseInt(sessionForm.test_id, 10);
                    })
                    .map((m) => (
                      <option key={m.mock_id} value={m.mock_id}>
                        {m.test_name ? `${m.name} (${m.test_name})` : m.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={sessionForm.session_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input
                  type="text"
                  className="form-input"
                  value={sessionForm.location}
                  onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                  placeholder="e.g., Room 101"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Max Capacity 
                  {centerProfile?.center?.max_session_users && (
                    <span style={{ fontWeight: "normal", color: "var(--muted)" }}>
                      {" "}(limit: {centerProfile.center.max_session_users})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={sessionForm.max_capacity}
                  onChange={(e) => setSessionForm({ ...sessionForm, max_capacity: e.target.value })}
                  placeholder={`Max ${centerProfile?.center?.max_session_users || 50}`}
                  max={centerProfile?.center?.max_session_users || 50}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={sessionForm.admin_notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, admin_notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows="2"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSessionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>Create Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Participant Modal (with search) */}
      {showRegisterModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Add Participant to Session</div>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>
              Search your students to add them to this session.
            </p>
            {error && (
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--error)", borderRadius: "6px", padding: "12px", marginBottom: "16px", color: "var(--error)", fontSize: "13px" }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Search Student</label>
              <input
                type="text"
                className="form-input"
                placeholder="Type name or phone..."
                value={participantSearchQuery}
                onChange={(e) => handleParticipantSearch(e.target.value)}
                autoFocus
              />
            </div>

            {participantSearchLoading && (
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>Searching...</p>
            )}

            {participantSearchResults.length > 0 && (
              <div className="search-results" style={{ maxHeight: "300px", overflowY: "auto" }}>
                {participantSearchResults.map((student) => (
                  <div key={student.id} className="search-result-item participant-search-item">
                    <div className="search-result-info">
                      <span className="search-result-name">{student.full_name}</span>
                      <span className="search-result-phone">{student.phone_number}</span>
                    </div>
                    <button
                      className="btn btn-small btn-success"
                      onClick={() => handleAddParticipant(student)}
                      disabled={loading}
                    >
                      Add to Session
                    </button>
                  </div>
                ))}
              </div>
            )}

            {participantSearchQuery.length > 0 && !participantSearchLoading && participantSearchResults.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>
                No students found. Make sure they're added to your center first.
              </p>
            )}

            <div className="modal-footer" style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowRegisterModal(false);
                  setParticipantSearchQuery("");
                  setParticipantSearchResults([]);
                  setError("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scores Modal */}
      {showScoresModal && selectedParticipant && (
        <div className="modal-overlay" onClick={() => setShowScoresModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Participant - {selectedParticipant.full_name}
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>
              ID: <strong>{selectedParticipant.participant_id_code}</strong>
              {(selectedParticipant.tab_switch_count > 0 || selectedParticipant.focus_lost_count > 0) && (
                <span style={{ color: "var(--error)", marginLeft: "12px" }}>
                  ⚠ {selectedParticipant.tab_switch_count || 0} tab switches, {selectedParticipant.focus_lost_count || 0} focus losses
                </span>
              )}
            </p>

            <div className="modal-tabs">
              <button className={`modal-tab ${scoresModalTab === "scores" ? "active" : ""}`} onClick={() => setScoresModalTab("scores")}>Scores</button>
              <button className={`modal-tab ${scoresModalTab === "answers" ? "active" : ""}`} onClick={() => setScoresModalTab("answers")}>Answers</button>
            </div>

            {scoresModalTab === "scores" && (
              <form onSubmit={handleUpdateScores}>
                <div className="form-group">
                  <label className="form-label">Listening Score</label>
                  <input type="text" className="form-input" value={selectedParticipant.listening_score || 0} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Reading Score</label>
                  <input type="text" className="form-input" value={selectedParticipant.reading_score || 0} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Writing Score (0-9) *</label>
                  <input type="number" className="form-input" min="0" max="9" step="0.5" value={scoresForm.writing_score} onChange={(e) => setScoresForm({ ...scoresForm, writing_score: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Speaking Score (0-9) *</label>
                  <input type="number" className="form-input" min="0" max="9" step="0.5" value={scoresForm.speaking_score} onChange={(e) => setScoresForm({ ...scoresForm, speaking_score: e.target.value })} required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowScoresModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Save Scores</button>
                </div>
              </form>
            )}

            {scoresModalTab === "answers" && (
              <div className="modal-answers-content">
                <AnswerChecker participant={selectedParticipant} fetchAnswersFn={centerService.getParticipantAnswers} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incomplete Scores Modal */}
      {showIncompleteScoresModal && (
        <div className="modal-overlay" onClick={() => setShowIncompleteScoresModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: "var(--error)" }}>Cannot Save - Incomplete Scores</div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ color: "var(--error)", marginBottom: "12px", fontWeight: "500" }}>
                {incompleteScoresData.length === 0
                  ? "No completed tests found."
                  : "The following participants are missing scores:"}
              </p>
              {incompleteScoresData.length > 0 && (
                <div style={{ backgroundColor: "rgba(231, 76, 60, 0.1)", border: "1px solid var(--error)", borderRadius: "4px", padding: "12px", maxHeight: "300px", overflowY: "auto" }}>
                  {incompleteScoresData.map((item, index) => (
                    <div key={index} style={{ padding: "8px", borderBottom: index < incompleteScoresData.length - 1 ? "1px solid rgba(231, 76, 60, 0.2)" : "none" }}>
                      <strong>{item.name}</strong><br />
                      <span style={{ fontSize: "13px", color: "var(--error)" }}>Missing: {item.missing}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowIncompleteScoresModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Modal */}
      {showDeleteSessionModal && sessionToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteSessionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: "var(--error)" }}>Delete Session</div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ color: "var(--error)", marginBottom: "16px", fontWeight: "500" }}>
                Permanently delete this session:
              </p>
              <div style={{ backgroundColor: "rgba(231, 76, 60, 0.1)", border: "1px solid var(--error)", borderRadius: "4px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ fontWeight: "600" }}>{sessionToDelete.test_name}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {new Date(sessionToDelete.session_date).toLocaleString()} - {sessionToDelete.location}
                </div>
              </div>
              <div>
                <label className="form-label">Type <strong>"Yes delete this session"</strong> to confirm:</label>
                <input
                  type="text"
                  className="form-input"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder='Type "Yes delete this session"'
                  style={{ marginTop: "8px" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteSessionModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteSession}
                disabled={loading || deleteConfirmationText.trim() !== "Yes delete this session"}
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Stats Modal */}
      {showStudentStatsModal && selectedStudentStats && (
        <div className="modal-overlay" onClick={() => setShowStudentStatsModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Student Statistics - {selectedStudentStats.student.full_name}
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              {selectedStudentStats.student.phone_number}
            </p>

            {/* Stats Summary */}
            <div className="stats-grid" style={{ marginBottom: "16px" }}>
              <div className="stat-card">
                <div className="stat-label">Total Tests</div>
                <div className="stat-value">{selectedStudentStats.stats.total_tests}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Listening</div>
                <div className="stat-value">{selectedStudentStats.stats.avg_listening || "—"}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Reading</div>
                <div className="stat-value">{selectedStudentStats.stats.avg_reading || "—"}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Writing</div>
                <div className="stat-value">{selectedStudentStats.stats.avg_writing || "—"}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Speaking</div>
                <div className="stat-value">{selectedStudentStats.stats.avg_speaking || "—"}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Overall Avg</div>
                <div className="stat-value" style={{ color: "var(--primary)" }}>
                  {selectedStudentStats.stats.avg_overall || "—"}
                </div>
              </div>
            </div>

            {/* Test History */}
            {selectedStudentStats.results.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Listening</th>
                      <th>Reading</th>
                      <th>Writing</th>
                      <th>Speaking</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentStats.results.map((r) => (
                      <tr key={r.id}>
                        <td>{r.test_name}</td>
                        <td>{r.listening_score != null ? parseFloat(r.listening_score).toFixed(1) : "—"}</td>
                        <td>{r.reading_score != null ? parseFloat(r.reading_score).toFixed(1) : "—"}</td>
                        <td>{r.writing_score != null ? parseFloat(r.writing_score).toFixed(1) : "—"}</td>
                        <td>{r.speaking_score != null ? parseFloat(r.speaking_score).toFixed(1) : "—"}</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: "16px" }}>
              <button className="btn btn-primary" onClick={() => setShowStudentStatsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterDashboard;
