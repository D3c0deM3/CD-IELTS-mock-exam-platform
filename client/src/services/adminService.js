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

const updateSessionStatus = (id, status) => {
  return apiClient.patch(`${API_URL}/sessions/${id}/status`, { status });
};

// ==================== TEST PARTICIPANT MANAGEMENT ====================

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
  listening_score,
  speaking_score
) => {
  return apiClient.put(`${API_URL}/participants/${participant_id}/scores`, {
    listening_score,
    speaking_score,
  });
};

const startAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/start-all`, {});
};

const getSessionDashboard = (session_id) => {
  return apiClient.get(`${API_URL}/sessions/${session_id}/dashboard`);
};

const adminService = {
  // User Management
  getUsers,
  deleteUser,
  updateUserStatus,
  // Test Management
  createTest,
  getTests,
  // Session Management
  createSession,
  getSessions,
  updateSessionStatus,
  // Participant Management
  registerParticipants,
  getSessionParticipants,
  updateParticipantScores,
  startAllTests,
  getSessionDashboard,
};

export default adminService;
