import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";
import MaterialUpload from "../components/MaterialUpload";
import adminService from "../services/adminService";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [tests, setTests] = useState([]);
  const [testMaterials, setTestMaterials] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showRegisterParticipantsModal, setShowRegisterParticipantsModal] =
    useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [showIncompleteScoresModal, setShowIncompleteScoresModal] =
    useState(false);
  const [incompleteScoresData, setIncompleteScoresData] = useState([]);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [writingSubmissions, setWritingSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showWritingReviewModal, setShowWritingReviewModal] = useState(false);
  const [writingReviewForm, setWritingReviewForm] = useState({
    writing_score: "",
    admin_notes: "",
  });

  // Form states
  const [testForm, setTestForm] = useState({ name: "", description: "" });
  const [sessionForm, setSessionForm] = useState({
    test_id: "",
    test_materials_id: 2,
    session_date: "",
    location: "",
    max_capacity: "",
    admin_notes: "",
  });
  const [participantsForm, setParticipantsForm] = useState({
    full_name: "",
    phone_number: "",
  });
  const [scoresForm, setScoresForm] = useState({
    writing_score: "",
    speaking_score: "",
  });

  // Fetch all data on component mount
  useEffect(() => {
    fetchSessions();
    fetchTests();
    fetchTestMaterials();
  }, []);

  // Fetch participants when session is selected
  useEffect(() => {
    if (selectedSession) {
      fetchSessionParticipants(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
    }
  }, [selectedSession]);

  // Polling for real-time updates
  useEffect(() => {
    if (selectedSession && activeTab === "session-monitor") {
      const interval = setInterval(() => {
        fetchSessionDashboard(selectedSession.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedSession, activeTab]);

  // Smooth timer countdown
  useEffect(() => {
    if (!dashboardStats?.session.test_started_at || !timerActive) {
      setTimeRemaining(null);
      return;
    }

    // Check if test has ended
    if (dashboardStats.session.test_end_at) {
      const endTime = new Date(dashboardStats.session.test_end_at).getTime();
      const now = Date.now();

      if (now >= endTime) {
        setTimeRemaining(0);
        setTimerActive(false);
        return;
      }
    }

    // Update timer every 100ms for smooth animation
    const timer = setInterval(() => {
      const endTime = new Date(dashboardStats.session.test_end_at).getTime();
      const now = Date.now();
      const msRemaining = endTime - now;

      if (msRemaining <= 0) {
        setTimeRemaining(0);
        setTimerActive(false);
      } else {
        setTimeRemaining(Math.ceil(msRemaining / 1000));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [
    dashboardStats?.session.test_started_at,
    dashboardStats?.session.test_end_at,
    timerActive,
  ]);

  // Start timer when test begins
  useEffect(() => {
    if (dashboardStats?.session.test_started_at && !timerActive) {
      setTimerActive(true);
    }
  }, [dashboardStats?.session.test_started_at, timerActive]);

  // Stop timer when test ends (end all tests)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (
      dashboardStats?.stats.test_completed === dashboardStats?.stats.total &&
      dashboardStats?.stats.total > 0
    ) {
      setTimerActive(false);
      setTimeRemaining(null);
    }
  }, [dashboardStats?.stats]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSessions();
      setSessions(response);
    } catch (err) {
      setError("Failed to fetch sessions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await adminService.getTests();
      setTests(response);
    } catch (err) {
      console.error("Failed to fetch tests:", err);
    }
  };

  const fetchTestMaterials = async () => {
    try {
      const response = await adminService.getTestMaterials();
      setTestMaterials(response.materials || response);
    } catch (err) {
      console.error("Failed to fetch test materials:", err);
      setError("Failed to fetch test materials");
    }
  };

  const fetchWritingSubmissions = async (sessionId) => {
    try {
      setLoading(true);
      const response = await adminService.getWritingSubmissions(sessionId);
      setWritingSubmissions(response.submissions);
    } catch (err) {
      console.error("Failed to fetch writing submissions:", err);
      setError("Failed to fetch writing submissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionParticipants = async (sessionId) => {
    try {
      const response = await adminService.getSessionParticipants(sessionId);
      setParticipants(response);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    }
  };

  const fetchSessionDashboard = async (sessionId) => {
    try {
      const response = await adminService.getSessionDashboard(sessionId);
      setDashboardStats(response);
      setParticipants(response.participants);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  // Create Test
  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!testForm.name.trim()) {
      setError("Test name is required");
      return;
    }

    try {
      setLoading(true);
      await adminService.createTest(testForm.name, testForm.description);
      setTestForm({ name: "", description: "" });
      setShowCreateTestModal(false);
      fetchTests();
      setError("");
    } catch (err) {
      setError("Failed to create test");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (
      !sessionForm.test_id ||
      !sessionForm.test_materials_id ||
      !sessionForm.session_date ||
      !sessionForm.location
    ) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await adminService.createSession(
        sessionForm.test_id,
        sessionForm.session_date,
        sessionForm.location,
        sessionForm.max_capacity,
        sessionForm.admin_notes,
        sessionForm.test_materials_id
      );
      setSessionForm({
        test_id: "",
        session_date: "",
        location: "",
        max_capacity: "",
        admin_notes: "",
        test_materials_id: 2,
      });
      setShowCreateSessionModal(false);
      fetchSessions();
      setError("");
    } catch (err) {
      setError("Failed to create session");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete Session
  const handleDeleteSession = async () => {
    if (deleteConfirmationText.trim() !== "Yes delete this session") {
      alert(
        "Please type exactly 'Yes delete this session' to confirm deletion"
      );
      return;
    }

    try {
      setLoading(true);
      await adminService.deleteSession(sessionToDelete.id);
      setShowDeleteSessionModal(false);
      setDeleteConfirmationText("");
      setSessionToDelete(null);
      setSelectedSession(null);
      fetchSessions();
      alert("Session deleted successfully");
      setError("");
    } catch (err) {
      setError("Failed to delete session");
      console.error(err);
      alert("Failed to delete session");
    } finally {
      setLoading(false);
    }
  };

  // Register Single Participant
  const handleRegisterParticipant = async (e) => {
    e.preventDefault();
    if (
      !participantsForm.full_name.trim() ||
      !participantsForm.phone_number.trim()
    ) {
      setError("Please enter both name and phone number");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await adminService.registerParticipant(
        selectedSession.id,
        participantsForm.full_name,
        participantsForm.phone_number
      );
      setParticipantsForm({ full_name: "", phone_number: "" });
      setShowRegisterParticipantsModal(false);
      alert(
        `Participant registered! ID Code: ${response.participant.participant_id_code}`
      );
      fetchSessionParticipants(selectedSession.id);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to register participant";

      // Check for specific error scenarios
      if (errorMessage.includes("already registered")) {
        setError(
          "❌ This participant is already registered for this session. Please try another participant."
        );
      } else if (errorMessage.includes("not registered in system")) {
        setError(
          "❌ Phone number not found in system. Please ensure the phone number is registered first."
        );
      } else if (
        errorMessage.includes("Phone number required") ||
        errorMessage.includes("name required")
      ) {
        setError("❌ Both name and phone number are required.");
      } else {
        setError(`❌ ${errorMessage}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update Participant Scores
  const handleUpdateScores = async (e) => {
    e.preventDefault();
    if (scoresForm.writing_score === "" || scoresForm.speaking_score === "") {
      setError("Both scores are required");
      return;
    }

    try {
      setLoading(true);
      await adminService.updateParticipantScores(
        selectedParticipant.id,
        parseFloat(scoresForm.writing_score),
        parseFloat(scoresForm.speaking_score)
      );
      setScoresForm({ writing_score: "", speaking_score: "" });
      setShowScoresModal(false);
      setSelectedParticipant(null);
      fetchSessionParticipants(selectedSession.id);
      setError("");
      alert("Scores updated successfully!");
    } catch (err) {
      setError("Failed to update scores");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Start All Tests
  const handleStartAllTests = async () => {
    if (
      !window.confirm(
        "Are you sure you want to start the test for all entered participants? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminService.startAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(
        `Test started for ${
          response.updated_count
        } participants!\nTest will expire at: ${new Date(
          response.test_end_at
        ).toLocaleTimeString()}`
      );
      setError("");
    } catch (err) {
      setError("Failed to start tests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Pause test for individual participant
  const handlePauseParticipant = async (participant_id) => {
    if (!window.confirm("Pause test for this participant?")) {
      return;
    }

    try {
      setLoading(true);
      await adminService.pauseParticipantTest(
        selectedSession.id,
        participant_id
      );
      fetchSessionDashboard(selectedSession.id);
      setError("");
    } catch (err) {
      setError("Failed to pause test");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Restart test for individual participant
  const handleRestartParticipant = async (participant_id) => {
    if (!window.confirm("Restart test for this participant?")) {
      return;
    }

    try {
      setLoading(true);
      await adminService.restartParticipantTest(
        selectedSession.id,
        participant_id
      );
      fetchSessionDashboard(selectedSession.id);
      setError("");
    } catch (err) {
      setError("Failed to restart test");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // End test for individual participant
  const handleEndParticipant = async (participant_id) => {
    if (
      !window.confirm(
        "End test for this participant? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await adminService.endParticipantTest(selectedSession.id, participant_id);
      fetchSessionDashboard(selectedSession.id);
      setError("");
    } catch (err) {
      setError("Failed to end test");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Pause all tests
  const handlePauseAll = async () => {
    if (!window.confirm("Pause all active tests in this session?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminService.pauseAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`${response.paused_count} tests paused successfully!`);
      setError("");
    } catch (err) {
      setError("Failed to pause tests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Restart all tests
  const handleRestartAll = async () => {
    if (!window.confirm("Restart all paused tests in this session?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminService.restartAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`${response.restarted_count} tests restarted successfully!`);
      setError("");
    } catch (err) {
      setError("Failed to restart tests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // End all tests
  const handleEndAll = async () => {
    if (
      !window.confirm(
        "End all active/paused tests in this session? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setTimerActive(false);
      setTimeRemaining(null);
      const response = await adminService.endAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`${response.ended_count} tests ended successfully!`);
      setError("");
    } catch (err) {
      setError("Failed to end tests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Save and End Session
  const handleSaveAndEndSession = async () => {
    // Check if all completed participants have all four scores
    const completedParticipants = participants.filter(
      (p) => p.test_status === "completed"
    );

    console.log("🔍 Save & End Session - Validation Check");
    console.log("Completed Participants:", completedParticipants);
    console.log("Number of completed:", completedParticipants.length);
    if (completedParticipants.length === 0) {
      setIncompleteScoresData([]);
      setShowIncompleteScoresModal(true);
      return;
    }

    const incompleteScores = completedParticipants.filter(
      (p) =>
        p.listening_score === null ||
        p.reading_score === null ||
        p.writing_score === null ||
        p.writing_score === 0 ||
        p.speaking_score === null ||
        p.speaking_score === 0
    );

    if (incompleteScores.length > 0) {
      const incompleteList = incompleteScores.map((p) => {
        const missing = [];
        if (p.listening_score === null) missing.push("Listening");
        if (p.reading_score === null) missing.push("Reading");
        if (p.writing_score === null || p.writing_score === 0)
          missing.push("Writing");
        if (p.speaking_score === null || p.speaking_score === 0)
          missing.push("Speaking");
        return { name: p.full_name, missing: missing.join(", ") };
      });

      setIncompleteScoresData(incompleteList);
      setShowIncompleteScoresModal(true);
      return;
    }

    if (
      !window.confirm(
        "Save all results and end this session? This will finalize all scores and add them to user dashboards."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminService.saveAndEndSession(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(
        `Session completed! ${response.saved_count} results saved to user dashboards.`
      );
      setError("");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to save and end session";
      setError(errorMsg);
      alert(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openScoresModal = (participant) => {
    setSelectedParticipant(participant);
    setScoresForm({
      writing_score:
        participant.writing_score && participant.writing_score !== 0
          ? participant.writing_score
          : "",
      speaking_score:
        participant.speaking_score && participant.speaking_score !== 0
          ? participant.speaking_score
          : "",
    });
    setShowScoresModal(true);
  };

  const handleReviewWriting = async (e) => {
    e.preventDefault();
    if (writingReviewForm.writing_score === "") {
      setError("Writing score is required");
      return;
    }

    try {
      setLoading(true);
      await adminService.reviewWritingSubmission(
        selectedSession.id,
        selectedSubmission.id,
        parseFloat(writingReviewForm.writing_score),
        writingReviewForm.admin_notes
      );
      setShowWritingReviewModal(false);
      setSelectedSubmission(null);
      setWritingReviewForm({ writing_score: "", admin_notes: "" });
      fetchWritingSubmissions(selectedSession.id);
      setError("");
      alert("Writing submission reviewed and scored successfully!");
    } catch (err) {
      setError("Failed to review writing submission");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openWritingReviewModal = (submission) => {
    setSelectedSubmission(submission);
    setWritingReviewForm({
      writing_score: submission.writing_score || "",
      admin_notes: submission.admin_notes || "",
    });
    setShowWritingReviewModal(true);
  };

  return (
    <div className="admin-dashboard-wrapper">
      <Navbar />
      <ThemeToggle />
      <div className="admin-dashboard">
        <div className="admin-container">
          {/* Header */}
          <div className="admin-header">
            <h1>Admin Dashboard</h1>
            <p>Manage tests, sessions, and participants</p>
          </div>

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${
                activeTab === "sessions" ? "active" : ""
              }`}
              onClick={() => setActiveTab("sessions")}
            >
              Sessions
            </button>
            <button
              className={`tab-button ${
                activeTab === "session-monitor" ? "active" : ""
              }`}
              onClick={() => setActiveTab("session-monitor")}
              disabled={!selectedSession}
            >
              Monitor Session
            </button>
            <button
              className={`tab-button ${
                activeTab === "writing-submissions" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("writing-submissions");
                if (selectedSession) {
                  fetchWritingSubmissions(selectedSession.id);
                }
              }}
              disabled={!selectedSession}
            >
              ✍️ Writing Submissions
            </button>
            <button
              className={`tab-button ${activeTab === "tests" ? "active" : ""}`}
              onClick={() => setActiveTab("tests")}
            >
              Tests
            </button>
            <button
              className={`tab-button ${
                activeTab === "materials" ? "active" : ""
              }`}
              onClick={() => setActiveTab("materials")}
            >
              📦 Upload Materials
            </button>
          </div>

          {/* Sessions Tab */}
          {activeTab === "sessions" && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>Test Sessions</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateSessionModal(true)}
                  >
                    + Create Session
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>
                    No sessions created yet.
                  </p>
                ) : (
                  <div className="sessions-list">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`session-item ${
                          selectedSession?.id === session.id ? "active" : ""
                        }`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          onClick={() => setSelectedSession(session)}
                          style={{ flex: 1, cursor: "pointer" }}
                        >
                          <div className="session-title">
                            {session.test_name}
                          </div>
                          <div className="session-meta">
                            <span>
                              📅{" "}
                              {new Date(session.session_date).toLocaleString()}
                            </span>
                            <span>📍 {session.location}</span>
                            <span>
                              👥 {session.registered_count} participants
                            </span>
                            <span className="badge badge-info">
                              {session.status}
                            </span>
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
                          title="Delete this session"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Monitor Tab */}
          {activeTab === "session-monitor" &&
            selectedSession &&
            dashboardStats && (
              <div>
                {/* Stats */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Participants</div>
                    <div className="stat-value">
                      {dashboardStats.stats.total}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Entered Start Screen</div>
                    <div className="stat-value">
                      {dashboardStats.stats.entered_startscreen}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Test Started</div>
                    <div className="stat-value">
                      {dashboardStats.stats.test_started}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Currently Active</div>
                    <div className="stat-value">
                      {dashboardStats.stats.currently_active}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Paused Tests</div>
                    <div className="stat-value">
                      {dashboardStats.stats.paused}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Offline/Disconnected</div>
                    <div className="stat-value">
                      {dashboardStats.stats.offline_or_disconnected}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value">
                      {dashboardStats.stats.test_completed}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Pending Scores</div>
                    <div className="stat-value">
                      {dashboardStats.stats.scores_pending}
                    </div>
                  </div>
                </div>

                {/* Test Timer Info */}
                {dashboardStats.session.test_started_at &&
                  timerActive &&
                  timeRemaining !== null && (
                    <div
                      className="card"
                      style={{
                        borderLeft:
                          timeRemaining <= 300
                            ? "4px solid var(--error)"
                            : "4px solid var(--success)",
                        boxShadow:
                          timeRemaining <= 300
                            ? "0 0 10px rgba(239, 68, 68, 0.3)"
                            : "none",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div className="card-header">
                        <h3>⏱️ Test Timer</h3>
                      </div>
                      <div style={{ padding: "12px 16px", fontSize: "14px" }}>
                        <p>
                          <strong>Started at:</strong>{" "}
                          {new Date(
                            dashboardStats.session.test_started_at
                          ).toLocaleTimeString()}
                        </p>
                        <p>
                          <strong>Expires at:</strong>{" "}
                          {new Date(
                            dashboardStats.session.test_end_at
                          ).toLocaleTimeString()}
                        </p>
                        <div
                          style={{
                            backgroundColor:
                              timeRemaining <= 300
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(34, 197, 94, 0.1)",
                            padding: "12px",
                            borderRadius: "6px",
                            textAlign: "center",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <p
                            style={{
                              color:
                                timeRemaining <= 300
                                  ? "var(--error)"
                                  : "var(--success)",
                              margin: "0 0 8px 0",
                              fontSize: "12px",
                            }}
                          >
                            <strong>Time Remaining</strong>
                          </p>
                          <p
                            style={{
                              fontSize: "28px",
                              fontWeight: "bold",
                              color:
                                timeRemaining <= 300
                                  ? "var(--error)"
                                  : "var(--success)",
                              margin: "0",
                              fontFamily: "monospace",
                              letterSpacing: "2px",
                            }}
                          >
                            {String(Math.floor(timeRemaining / 3600)).padStart(
                              2,
                              "0"
                            )}
                            :
                            {String(
                              Math.floor((timeRemaining % 3600) / 60)
                            ).padStart(2, "0")}
                            :{String(timeRemaining % 60).padStart(2, "0")}
                          </p>
                          <p
                            style={{
                              color:
                                timeRemaining <= 300
                                  ? "var(--error)"
                                  : "var(--info)",
                              margin: "8px 0 0 0",
                              fontSize: "12px",
                            }}
                          >
                            {timeRemaining <= 300 &&
                              "⚠️ Less than 5 minutes remaining"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                {dashboardStats.session.test_started_at &&
                  !timerActive &&
                  timeRemaining === null && (
                    <div
                      className="card"
                      style={{
                        borderLeft: "4px solid var(--success)",
                        backgroundColor: "rgba(34, 197, 94, 0.05)",
                      }}
                    >
                      <div className="card-header">
                        <h3>✓ Test Completed</h3>
                      </div>
                      <div
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            color: "var(--success)",
                            fontWeight: "bold",
                          }}
                        >
                          All tests have been ended or expired
                        </p>
                      </div>
                    </div>
                  )}

                {/* Control Buttons */}
                <div className="card">
                  <div className="card-header">
                    <h3>Session Controls</h3>
                  </div>
                  <div
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn btn-success"
                      onClick={handleStartAllTests}
                      disabled={dashboardStats.session.test_started_at}
                    >
                      ▶️ Start All Tests
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={handlePauseAll}
                      disabled={!dashboardStats.session.test_started_at}
                    >
                      ⏸️ Pause All
                    </button>
                    <button
                      className="btn btn-info"
                      onClick={handleRestartAll}
                      disabled={!dashboardStats.session.test_started_at}
                    >
                      ▶️ Restart All
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleEndAll}
                      disabled={!dashboardStats.session.test_started_at}
                    >
                      ⏹️ End All Tests
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={handleSaveAndEndSession}
                      disabled={
                        !dashboardStats.session.test_started_at ||
                        dashboardStats.session.status === "completed"
                      }
                      style={{ marginLeft: "auto" }}
                    >
                      💾 Save & End Session
                    </button>
                  </div>
                </div>

                {/* Participants Table */}
                <div className="card">
                  <div className="card-header">
                    <h3>Participants</h3>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowRegisterParticipantsModal(true)}
                    >
                      + Register Participant
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID Code</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Listening</th>
                          <th>Reading</th>
                          <th>Writing</th>
                          <th>Speaking</th>
                          <th>Current Screen</th>
                          <th>Test Status</th>
                          <th>Last Activity</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((participant) => (
                          <tr key={participant.id}>
                            <td>
                              <strong>{participant.participant_id_code}</strong>
                            </td>
                            <td>{participant.full_name}</td>
                            <td>{participant.phone_number || "—"}</td>
                            <td>
                              {participant.listening_score !== null &&
                              participant.listening_score !== undefined
                                ? `${Math.round(
                                    participant.listening_score
                                  )}/40`
                                : "—"}
                            </td>
                            <td>
                              {participant.reading_score !== null &&
                              participant.reading_score !== undefined
                                ? `${Math.round(participant.reading_score)}/40`
                                : "—"}
                            </td>
                            <td>
                              {participant.writing_score === 0
                                ? "Pending"
                                : participant.writing_score !== null &&
                                  participant.writing_score !== undefined
                                ? Math.round(participant.writing_score)
                                : "—"}
                            </td>
                            <td>
                              {participant.speaking_score !== null &&
                              participant.speaking_score !== undefined
                                ? Math.round(participant.speaking_score)
                                : "—"}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: "12px",
                                  padding: "4px 8px",
                                  background: "var(--bg-secondary)",
                                  borderRadius: "4px",
                                }}
                              >
                                {participant.current_screen || "not_started"}
                              </span>
                            </td>
                            <td>
                              <span className="status-indicator">
                                <span
                                  className={`status-dot ${
                                    participant.test_status === "completed"
                                      ? "completed"
                                      : participant.test_status ===
                                        "in_progress"
                                      ? "active"
                                      : participant.test_status === "paused"
                                      ? "paused"
                                      : "inactive"
                                  }`}
                                ></span>
                                {participant.test_status || "not_started"}
                              </span>
                            </td>
                            <td>
                              {participant.last_activity_at
                                ? new Date(
                                    participant.last_activity_at
                                  ).toLocaleTimeString()
                                : "—"}
                            </td>
                            <td style={{ minWidth: "200px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "4px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  className="btn btn-small btn-secondary"
                                  onClick={() => openScoresModal(participant)}
                                >
                                  Scores
                                </button>
                                {participant.test_status === "in_progress" && (
                                  <>
                                    <button
                                      className="btn btn-small btn-warning"
                                      onClick={() =>
                                        handlePauseParticipant(participant.id)
                                      }
                                    >
                                      Pause
                                    </button>
                                    <button
                                      className="btn btn-small btn-danger"
                                      onClick={() =>
                                        handleEndParticipant(participant.id)
                                      }
                                    >
                                      End
                                    </button>
                                  </>
                                )}
                                {participant.test_status === "paused" && (
                                  <button
                                    className="btn btn-small btn-info"
                                    onClick={() =>
                                      handleRestartParticipant(participant.id)
                                    }
                                  >
                                    Restart
                                  </button>
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

          {/* Writing Submissions Tab */}
          {activeTab === "writing-submissions" && selectedSession && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>✍️ Writing Essay Submissions</h2>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      margin: 0,
                    }}
                  >
                    Session: {selectedSession.test_name} •{" "}
                    {writingSubmissions.length} submissions
                  </p>
                </div>

                {writingSubmissions.length === 0 ? (
                  <p style={{ padding: "16px", color: "var(--muted)" }}>
                    No writing submissions for this session yet.
                  </p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID Code</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Task 1 (Words)</th>
                          <th>Task 2 (Words)</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {writingSubmissions.map((submission) => (
                          <tr key={submission.id}>
                            <td>
                              <strong>{submission.participant_id_code}</strong>
                            </td>
                            <td>{submission.full_name}</td>
                            <td>{submission.phone_number || "—"}</td>
                            <td>
                              {submission.task_1_word_count}
                              <span
                                style={{
                                  fontSize: "11px",
                                  color:
                                    submission.task_1_word_count >= 150
                                      ? "var(--success)"
                                      : "var(--error)",
                                  marginLeft: "4px",
                                }}
                              >
                                {submission.task_1_word_count >= 150
                                  ? "✓"
                                  : "⚠️"}
                              </span>
                            </td>
                            <td>
                              {submission.task_2_word_count}
                              <span
                                style={{
                                  fontSize: "11px",
                                  color:
                                    submission.task_2_word_count >= 250
                                      ? "var(--success)"
                                      : "var(--error)",
                                  marginLeft: "4px",
                                }}
                              >
                                {submission.task_2_word_count >= 250
                                  ? "✓"
                                  : "⚠️"}
                              </span>
                            </td>
                            <td>
                              {submission.writing_score ? (
                                <strong>{submission.writing_score}</strong>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>—</span>
                              )}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: "12px",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: submission.is_reviewed
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : "rgba(59, 130, 246, 0.1)",
                                  color: submission.is_reviewed
                                    ? "var(--success)"
                                    : "var(--info)",
                                }}
                              >
                                {submission.is_reviewed
                                  ? "Reviewed"
                                  : "Pending"}
                              </span>
                            </td>
                            <td style={{ fontSize: "13px" }}>
                              {new Date(
                                submission.submitted_at
                              ).toLocaleDateString()}{" "}
                              {new Date(
                                submission.submitted_at
                              ).toLocaleTimeString()}
                            </td>
                            <td style={{ minWidth: "120px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "4px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  className="btn btn-small btn-info"
                                  onClick={() =>
                                    openWritingReviewModal(submission)
                                  }
                                >
                                  {submission.is_reviewed ? "Edit" : "Review"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === "tests" && (
            <div>
              <div className="card">
                <div className="card-header">
                  <h2>Tests</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateTestModal(true)}
                  >
                    + Create Test
                  </button>
                </div>

                {tests.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>No tests created yet.</p>
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
            </div>
          )}

          {/* Materials Upload Tab */}
          {activeTab === "materials" && (
            <div>
              <MaterialUpload />
            </div>
          )}
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateTestModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateTestModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Create New Test</div>
            <form onSubmit={handleCreateTest}>
              <div className="form-group">
                <label className="form-label">Test Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={testForm.name}
                  onChange={(e) =>
                    setTestForm({ ...testForm, name: e.target.value })
                  }
                  placeholder="e.g., IELTS Mock Test 2025"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={testForm.description}
                  onChange={(e) =>
                    setTestForm({ ...testForm, description: e.target.value })
                  }
                  placeholder="Test description..."
                  rows="3"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateTestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Create Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateSessionModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Create Test Session</div>
            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label className="form-label">Test *</label>
                <select
                  className="form-select"
                  value={sessionForm.test_id}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, test_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select a test</option>
                  {tests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Test Materials *</label>
                <select
                  className="form-select"
                  value={sessionForm.test_materials_id}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      test_materials_id: parseInt(e.target.value) || "",
                    })
                  }
                  required
                >
                  <option value="">Select test materials</option>
                  {testMaterials.map((material) => (
                    <option key={material.mock_id} value={material.mock_id}>
                      {material.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Session Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={sessionForm.session_date}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      session_date: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input
                  type="text"
                  className="form-input"
                  value={sessionForm.location}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, location: e.target.value })
                  }
                  placeholder="e.g., Building A, Room 101"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Capacity</label>
                <input
                  type="number"
                  className="form-input"
                  value={sessionForm.max_capacity}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      max_capacity: e.target.value,
                    })
                  }
                  placeholder="e.g., 50"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Notes</label>
                <textarea
                  className="form-textarea"
                  value={sessionForm.admin_notes}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      admin_notes: e.target.value,
                    })
                  }
                  placeholder="Any special notes..."
                  rows="3"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateSessionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Participants Modal */}
      {showRegisterParticipantsModal && selectedSession && (
        <div
          className="modal-overlay"
          onClick={() => setShowRegisterParticipantsModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Register Participant</div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "12px",
              }}
            >
              Register one participant at a time. They will be assigned a unique
              ID code.
            </p>
            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid var(--error)",
                  borderRadius: "6px",
                  padding: "12px",
                  marginBottom: "16px",
                  color: "var(--error)",
                  fontSize: "13px",
                  lineHeight: "1.4",
                }}
              >
                {error}
              </div>
            )}
            <form onSubmit={handleRegisterParticipant}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={participantsForm.full_name}
                  onChange={(e) =>
                    setParticipantsForm({
                      ...participantsForm,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="e.g., Ahmed Khan"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={participantsForm.phone_number}
                  onChange={(e) =>
                    setParticipantsForm({
                      ...participantsForm,
                      phone_number: e.target.value,
                    })
                  }
                  placeholder="e.g., +1 234 567 8900"
                  required
                />
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginBottom: "12px",
                }}
              >
                Phone number must be registered in the system.
              </p>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRegisterParticipantsModal(false);
                    setParticipantsForm({ full_name: "", phone_number: "" });
                    setError("");
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Register Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Scores Modal */}
      {showScoresModal && selectedParticipant && (
        <div
          className="modal-overlay"
          onClick={() => setShowScoresModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Set Scores for {selectedParticipant.full_name}
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "12px",
              }}
            >
              ID Code:{" "}
              <strong>{selectedParticipant.participant_id_code}</strong>
            </p>
            <form onSubmit={handleUpdateScores}>
              <div className="form-group">
                <label className="form-label">Writing Score (0-9) *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="9"
                  step="0.5"
                  value={scoresForm.writing_score}
                  onChange={(e) =>
                    setScoresForm({
                      ...scoresForm,
                      writing_score: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Speaking Score (0-9) *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="9"
                  step="0.5"
                  value={scoresForm.speaking_score}
                  onChange={(e) =>
                    setScoresForm({
                      ...scoresForm,
                      speaking_score: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScoresModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Save Scores
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showIncompleteScoresModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowIncompleteScoresModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-header"
              style={{ borderColor: "var(--error)" }}
            >
              ⚠️ Cannot Save Session - Incomplete Scores
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  color: "var(--error)",
                  marginBottom: "12px",
                  fontWeight: "500",
                }}
              >
                {incompleteScoresData.length === 0
                  ? "No completed tests found. Please ensure all participants complete their tests first."
                  : `The following participants are missing required scores and cannot be saved:`}
              </p>
              {incompleteScoresData.length > 0 && (
                <div
                  style={{
                    backgroundColor: "rgba(231, 76, 60, 0.1)",
                    border: "1px solid var(--error)",
                    borderRadius: "4px",
                    padding: "12px",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  {incompleteScoresData.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "8px",
                        borderBottom:
                          index < incompleteScoresData.length - 1
                            ? "1px solid rgba(231, 76, 60, 0.2)"
                            : "none",
                      }}
                    >
                      <strong>{item.name}</strong>
                      <br />
                      <span style={{ fontSize: "13px", color: "var(--error)" }}>
                        Missing: {item.missing}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "var(--muted)",
                }}
              >
                <p>Please ensure:</p>
                <ul style={{ marginLeft: "16px", marginTop: "8px" }}>
                  <li>All participants complete their tests</li>
                  <li>
                    Listening and Reading scores are calculated by the system
                  </li>
                  <li>Writing and Speaking scores are entered by admin</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowIncompleteScoresModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSessionModal && sessionToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteSessionModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-header"
              style={{ borderColor: "var(--error)" }}
            >
              ⚠️ Delete Session - Permanent Action
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  color: "var(--error)",
                  marginBottom: "16px",
                  fontWeight: "500",
                }}
              >
                You are about to permanently delete this session:
              </p>
              <div
                style={{
                  backgroundColor: "rgba(231, 76, 60, 0.1)",
                  border: "1px solid var(--error)",
                  borderRadius: "4px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontWeight: "600" }}>
                  {sessionToDelete.test_name}
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  📅 {new Date(sessionToDelete.session_date).toLocaleString()}
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  📍 {sessionToDelete.location}
                </div>
              </div>

              <p style={{ marginBottom: "12px", fontSize: "13px" }}>
                This action will <strong>remove everything</strong> related to
                this session, including:
              </p>
              <ul
                style={{
                  marginLeft: "16px",
                  fontSize: "13px",
                  color: "var(--muted)",
                }}
              >
                <li>All registered participants</li>
                <li>All test data and scores</li>
                <li>All session records</li>
              </ul>

              <div style={{ marginTop: "16px" }}>
                <label className="form-label">
                  Type <strong>"Yes delete this session"</strong> to confirm:
                </label>
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
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteSessionModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteSession}
                disabled={
                  loading ||
                  deleteConfirmationText.trim() !== "Yes delete this session"
                }
              >
                🗑️ Delete Session Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Writing Review Modal */}
      {showWritingReviewModal && selectedSubmission && (
        <div
          className="modal-overlay"
          onClick={() => setShowWritingReviewModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: "900px" }}
          >
            <div className="modal-header">
              Review Writing Submission - {selectedSubmission.full_name}
            </div>

            <div style={{ padding: "16px" }}>
              <div
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Participant ID:</strong>{" "}
                  {selectedSubmission.participant_id_code}
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Phone:</strong>{" "}
                  {selectedSubmission.phone_number || "N/A"}
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Submitted:</strong>{" "}
                  {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </p>
                <p style={{ margin: "0" }}>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      backgroundColor: selectedSubmission.is_reviewed
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(59, 130, 246, 0.2)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    {selectedSubmission.is_reviewed ? "Reviewed" : "Pending"}
                  </span>
                </p>
              </div>

              {/* Task 1 */}
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ marginBottom: "8px" }}>
                  Task 1 - Letter Writing (
                  {selectedSubmission.task_1_word_count} words)
                </h4>
                <div
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    padding: "12px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    maxHeight: "300px",
                    overflowY: "auto",
                    borderLeft:
                      selectedSubmission.task_1_word_count >= 150
                        ? "4px solid var(--success)"
                        : "4px solid var(--error)",
                  }}
                >
                  {selectedSubmission.task_1_content || "(No content)"}
                </div>
              </div>

              {/* Task 2 */}
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ marginBottom: "8px" }}>
                  Task 2 - Essay Writing ({selectedSubmission.task_2_word_count}{" "}
                  words)
                </h4>
                <div
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    padding: "12px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    maxHeight: "400px",
                    overflowY: "auto",
                    borderLeft:
                      selectedSubmission.task_2_word_count >= 250
                        ? "4px solid var(--success)"
                        : "4px solid var(--error)",
                  }}
                >
                  {selectedSubmission.task_2_content || "(No content)"}
                </div>
              </div>

              {/* Review Form */}
              <form onSubmit={handleReviewWriting}>
                <div className="form-group">
                  <label className="form-label">Writing Score (0-9) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="9"
                    step="0.5"
                    value={writingReviewForm.writing_score}
                    onChange={(e) =>
                      setWritingReviewForm({
                        ...writingReviewForm,
                        writing_score: e.target.value,
                      })
                    }
                    placeholder="e.g., 6.5"
                    required
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--muted)",
                      marginTop: "4px",
                    }}
                  >
                    Assign a band score from 0-9
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Notes</label>
                  <textarea
                    className="form-textarea"
                    value={writingReviewForm.admin_notes}
                    onChange={(e) =>
                      setWritingReviewForm({
                        ...writingReviewForm,
                        admin_notes: e.target.value,
                      })
                    }
                    placeholder="Add feedback or notes about this submission..."
                    rows="4"
                  ></textarea>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowWritingReviewModal(false);
                      setSelectedSubmission(null);
                      setWritingReviewForm({
                        writing_score: "",
                        admin_notes: "",
                      });
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading}
                  >
                    ✓ Save Score & Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
