import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";
import adminService from "../services/adminService";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [tests, setTests] = useState([]);
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

  // Form states
  const [testForm, setTestForm] = useState({ name: "", description: "" });
  const [sessionForm, setSessionForm] = useState({
    test_id: "",
    session_date: "",
    location: "",
    max_capacity: "",
    admin_notes: "",
  });
  const [participantsForm, setParticipantsForm] = useState("");
  const [scoresForm, setScoresForm] = useState({
    listening_score: "",
    speaking_score: "",
  });

  // Fetch all data on component mount
  useEffect(() => {
    fetchSessions();
    fetchTests();
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
        sessionForm.admin_notes
      );
      setSessionForm({
        test_id: "",
        session_date: "",
        location: "",
        max_capacity: "",
        admin_notes: "",
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

  // Register Participants
  const handleRegisterParticipants = async (e) => {
    e.preventDefault();
    if (!participantsForm.trim()) {
      setError("Please enter participant names (one per line)");
      return;
    }

    const names = participantsForm
      .split("\n")
      .filter((name) => name.trim())
      .map((name) => ({ full_name: name.trim() }));

    try {
      setLoading(true);
      const response = await adminService.registerParticipants(
        selectedSession.id,
        names
      );
      setParticipantsForm("");
      setShowRegisterParticipantsModal(false);
      fetchSessionParticipants(selectedSession.id);
      setError("");
      alert(
        `Successfully registered ${response.registered_count} participants!`
      );
    } catch (err) {
      setError("Failed to register participants");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update Participant Scores
  const handleUpdateScores = async (e) => {
    e.preventDefault();
    if (scoresForm.listening_score === "" || scoresForm.speaking_score === "") {
      setError("Both scores are required");
      return;
    }

    try {
      setLoading(true);
      await adminService.updateParticipantScores(
        selectedParticipant.id,
        parseFloat(scoresForm.listening_score),
        parseFloat(scoresForm.speaking_score)
      );
      setScoresForm({ listening_score: "", speaking_score: "" });
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
        "Are you sure you want to start the test for all entered participants?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminService.startAllTests(selectedSession.id);
      fetchSessionDashboard(selectedSession.id);
      alert(`Test started for ${response.updated_count} participants!`);
      setError("");
    } catch (err) {
      setError("Failed to start tests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openScoresModal = (participant) => {
    setSelectedParticipant(participant);
    setScoresForm({
      listening_score: participant.listening_score || "",
      speaking_score: participant.speaking_score || "",
    });
    setShowScoresModal(true);
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
              className={`tab-button ${activeTab === "tests" ? "active" : ""}`}
              onClick={() => setActiveTab("tests")}
            >
              Tests
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
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="session-title">{session.test_name}</div>
                        <div className="session-meta">
                          <span>
                            📅 {new Date(session.session_date).toLocaleString()}
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
                    <div className="stat-label">Pending Scores</div>
                    <div className="stat-value">
                      {dashboardStats.stats.scores_pending}
                    </div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="card">
                  <div className="card-header">
                    <h3>Session Controls</h3>
                    <button
                      className="btn btn-success"
                      onClick={handleStartAllTests}
                    >
                      ▶️ Start All Tests
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
                      + Register Participants
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID Code</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Listening Score</th>
                          <th>Speaking Score</th>
                          <th>Status</th>
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
                            <td>{participant.listening_score || "—"}</td>
                            <td>{participant.speaking_score || "—"}</td>
                            <td>
                              {participant.test_started ? (
                                <span className="status-indicator">
                                  <span className="status-dot active"></span>
                                  Started
                                </span>
                              ) : participant.has_entered_startscreen ? (
                                <span className="status-indicator">
                                  <span className="status-dot pending"></span>
                                  Entered
                                </span>
                              ) : (
                                <span className="status-indicator">
                                  <span className="status-dot inactive"></span>
                                  Pending
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-small btn-secondary"
                                onClick={() => openScoresModal(participant)}
                              >
                                Set Scores
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
            <div className="modal-header">Register Participants</div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "12px",
              }}
            >
              Enter participant names (one per line). Each will be assigned a
              unique ID code.
            </p>
            <form onSubmit={handleRegisterParticipants}>
              <div className="form-group">
                <label className="form-label">Participant Names *</label>
                <textarea
                  className="form-textarea"
                  value={participantsForm}
                  onChange={(e) => setParticipantsForm(e.target.value)}
                  placeholder="John Doe&#10;Jane Smith&#10;Ahmed Khan"
                  rows="8"
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRegisterParticipantsModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Register
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
                <label className="form-label">Listening Score (0-9) *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="9"
                  step="0.5"
                  value={scoresForm.listening_score}
                  onChange={(e) =>
                    setScoresForm({
                      ...scoresForm,
                      listening_score: e.target.value,
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
    </div>
  );
};

export default AdminDashboard;
