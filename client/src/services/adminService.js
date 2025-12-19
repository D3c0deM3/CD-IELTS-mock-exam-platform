import { apiClient } from "./api";

const API_URL = "/api/admin";

// ==================== USER MANAGEMENT ====================

const getUsers = () => {
  return apiClient.get(`${API_URL}/users`);
};

const deleteUser = (id) => {
  return apiClient.delete(`${API_URL}/users/${id}`);
};

const updateUserStatus = (id, status) => {
  return apiClient.patch(`${API_URL}/users/${id}/status`, { status });
};

// ==================== TEST MANAGEMENT ====================

const createTest = (name, description) => {
  return apiClient.post(`${API_URL}/tests`, { name, description });
};

const getTests = () => {
  return apiClient.get(`${API_URL}/tests`);
};

// Test Config Management
const setTestConfig = (
  test_id,
  listening_minutes,
  reading_minutes,
  writing_minutes,
  speaking_minutes
) => {
  return apiClient.post(`${API_URL}/tests/${test_id}/config`, {
    listening_minutes,
    reading_minutes,
    writing_minutes,
    speaking_minutes,
  });
};

const getTestConfig = (test_id) => {
  return apiClient.get(`${API_URL}/tests/${test_id}/config`);
};

// ==================== TEST SESSION MANAGEMENT ====================

const createSession = (
  test_id,
  session_date,
  location,
  max_capacity,
  admin_notes
) => {
  return apiClient.post(`${API_URL}/sessions`, {
    test_id,
    session_date,
    location,
    max_capacity,
    admin_notes,
  });
};

const getSessions = () => {
  return apiClient.get(`${API_URL}/sessions`);
};

const deleteSession = (session_id) => {
  return apiClient.delete(`${API_URL}/sessions/${session_id}`);
};

const updateSessionStatus = (id, status) => {
  return apiClient.patch(`${API_URL}/sessions/${id}/status`, { status });
};

// ==================== TEST PARTICIPANT MANAGEMENT ====================

// Register single participant
const registerParticipant = (session_id, full_name, phone_number) => {
  return apiClient.post(
    `${API_URL}/sessions/${session_id}/register-participant`,
    {
      full_name,
      phone_number,
    }
  );
};

// Register multiple participants (bulk)
const registerParticipants = (session_id, participants) => {
  return apiClient.post(
    `${API_URL}/sessions/${session_id}/register-participants`,
    {
      participants,
    }
  );
};

const getSessionParticipants = (session_id) => {
  return apiClient.get(`${API_URL}/sessions/${session_id}/participants`);
};

const updateParticipantScores = (
  participant_id,
  writing_score,
  speaking_score
) => {
  return apiClient.put(`${API_URL}/participants/${participant_id}/scores`, {
    writing_score,
    speaking_score,
  });
};

const startAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/start-all`, {});
};

// Individual participant control
const pauseParticipantTest = (session_id, participant_id) => {
  return apiClient.patch(
    `${API_URL}/sessions/${session_id}/participants/${participant_id}/pause`,
    {}
  );
};

const restartParticipantTest = (session_id, participant_id) => {
  return apiClient.patch(
    `${API_URL}/sessions/${session_id}/participants/${participant_id}/restart`,
    {}
  );
};

const endParticipantTest = (session_id, participant_id) => {
  return apiClient.patch(
    `${API_URL}/sessions/${session_id}/participants/${participant_id}/end`,
    {}
  );
};

// Bulk test control
const pauseAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/pause-all`, {});
};

const restartAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/restart-all`, {});
};

const endAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/end-all`, {});
};

const getSessionDashboard = (session_id) => {
  return apiClient.get(`${API_URL}/sessions/${session_id}/dashboard`);
};

const saveAndEndSession = (session_id) => {
  return apiClient.post(`${API_URL}/sessions/${session_id}/save-and-end`, {});
};

// ==================== WRITING SUBMISSIONS ====================

const getWritingSubmissions = (session_id) => {
  return apiClient.get(`/api/test-sessions/${session_id}/writing-submissions`);
};

const reviewWritingSubmission = (
  session_id,
  submission_id,
  writing_score,
  admin_notes
) => {
  return apiClient.post(
    `/api/test-sessions/${session_id}/writing-submissions/${submission_id}/review`,
    { writing_score, admin_notes }
  );
};

const adminService = {
  // User Management
  getUsers,
  deleteUser,
  updateUserStatus,
  // Test Management
  createTest,
  getTests,
  setTestConfig,
  getTestConfig,
  // Session Management
  createSession,
  getSessions,
  deleteSession,
  updateSessionStatus,
  // Participant Management
  registerParticipant,
  registerParticipants,
  getSessionParticipants,
  updateParticipantScores,
  // Test Control
  startAllTests,
  pauseParticipantTest,
  restartParticipantTest,
  endParticipantTest,
  pauseAllTests,
  restartAllTests,
  endAllTests,
  getSessionDashboard,
  saveAndEndSession,
  // Writing Submissions
  getWritingSubmissions,
  reviewWritingSubmission,
};

export default adminService;
