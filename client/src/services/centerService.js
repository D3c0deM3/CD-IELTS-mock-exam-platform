import { apiClient } from "./api";

const API_URL = "/api/center";

// ==================== CENTER PROFILE ====================

const getProfile = () => {
  return apiClient.get(`${API_URL}/profile`);
};

// ==================== STUDENT MANAGEMENT ====================

const getStudents = () => {
  return apiClient.get(`${API_URL}/students`);
};

const searchStudents = (query) => {
  return apiClient.get(`${API_URL}/students/search?q=${encodeURIComponent(query)}`);
};

const addStudent = (student_id) => {
  return apiClient.post(`${API_URL}/students`, { student_id });
};

const removeStudent = (centerStudentId) => {
  return apiClient.delete(`${API_URL}/students/${centerStudentId}`);
};

const getStudentStats = (userId) => {
  return apiClient.get(`${API_URL}/students/${userId}/stats`);
};

// ==================== TEST MANAGEMENT ====================

const getTests = () => {
  return apiClient.get(`${API_URL}/tests`);
};

const getTestMaterials = () => {
  return apiClient.get(`${API_URL}/test-materials`);
};

// ==================== SESSION MANAGEMENT ====================

const createSession = (test_id, session_date, location, max_capacity, admin_notes, test_materials_id) => {
  return apiClient.post(`${API_URL}/sessions`, {
    test_id,
    session_date,
    location,
    max_capacity,
    admin_notes,
    test_materials_id,
  });
};

const getSessions = () => {
  return apiClient.get(`${API_URL}/sessions`);
};

const deleteSession = (session_id) => {
  return apiClient.delete(`${API_URL}/sessions/${session_id}`);
};

// ==================== PARTICIPANT MANAGEMENT ====================

const searchSessionStudents = (session_id, query) => {
  return apiClient.get(
    `${API_URL}/sessions/${session_id}/search-students?q=${encodeURIComponent(query)}`
  );
};

const registerParticipant = (session_id, full_name, phone_number) => {
  return apiClient.post(`${API_URL}/sessions/${session_id}/register-participant`, {
    full_name,
    phone_number,
  });
};

const getSessionParticipants = (session_id) => {
  return apiClient.get(`${API_URL}/sessions/${session_id}/participants`);
};

const getSessionDashboard = (session_id) => {
  return apiClient.get(`${API_URL}/sessions/${session_id}/dashboard`);
};

// ==================== SCORES ====================

const updateParticipantScores = (participant_id, writing_score, speaking_score) => {
  return apiClient.put(`${API_URL}/participants/${participant_id}/scores`, {
    writing_score,
    speaking_score,
  });
};

const getParticipantAnswers = (participant_id) => {
  return apiClient.get(`${API_URL}/participants/${participant_id}/answers`);
};

// ==================== TEST CONTROLS ====================

const startAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/start-all`, {});
};

const pauseAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/pause-all`, {});
};

const restartAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/restart-all`, {});
};

const endAllTests = (session_id) => {
  return apiClient.patch(`${API_URL}/sessions/${session_id}/end-all`, {});
};

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

const saveAndEndSession = (session_id) => {
  return apiClient.post(`${API_URL}/sessions/${session_id}/save-and-end`, {});
};

// ==================== RESULTS ====================

const getResults = () => {
  return apiClient.get(`${API_URL}/results`);
};

const getWritingSubmissions = (session_id) => {
  return apiClient.get(`${API_URL}/writing-submissions/${session_id}`);
};

const centerService = {
  getProfile,
  getStudents,
  searchStudents,
  addStudent,
  removeStudent,
  getStudentStats,
  getTests,
  getTestMaterials,
  createSession,
  getSessions,
  deleteSession,
  searchSessionStudents,
  registerParticipant,
  getSessionParticipants,
  getSessionDashboard,
  updateParticipantScores,
  getParticipantAnswers,
  startAllTests,
  pauseAllTests,
  restartAllTests,
  endAllTests,
  pauseParticipantTest,
  restartParticipantTest,
  endParticipantTest,
  saveAndEndSession,
  getResults,
  getWritingSubmissions,
};

export default centerService;
