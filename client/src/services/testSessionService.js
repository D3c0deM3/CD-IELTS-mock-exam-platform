import { apiClient } from "./api";
import API_CONFIG from "../config/api";

const testSessionService = {
  /**
   * Get all available test sessions that user can request registration for
   */
  getAvailableSessions: async () => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/test-sessions/available`
    );
  },

  /**
   * Get all test sessions the authenticated user is registered for
   */
  getMyRegistrations: async () => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/test-sessions/my-registrations`
    );
  },

  /**
   * Get detailed information about a specific test session
   */
  getSessionDetails: async (sessionId) => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/test-sessions/${sessionId}`
    );
  },

  /**
   * Check if user is registered for a session and if it's currently ongoing
   * Returns: { can_take, reason, session_status, session_date }
   */
  canTakeTest: async (sessionId) => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/test-sessions/${sessionId}/can-take-test`
    );
  },

  /**
   * ADMIN: Create a new test session
   */
  createSession: async (sessionData) => {
    // sessionData: { test_id, session_date, location, max_capacity, admin_notes }
    return await apiClient.post(
      `${API_CONFIG.BASE_URL}/api/test-sessions/create`,
      sessionData
    );
  },

  /**
   * ADMIN: Register multiple students for a test session
   */
  registerStudents: async (sessionId, studentIds) => {
    return await apiClient.post(
      `${API_CONFIG.BASE_URL}/api/test-sessions/register-students`,
      { session_id: sessionId, student_ids: studentIds }
    );
  },

  /**
   * ADMIN: Update test session status
   */
  updateSessionStatus: async (sessionId, status) => {
    return await apiClient.patch(
      `${API_CONFIG.BASE_URL}/api/test-sessions/${sessionId}/status`,
      { status }
    );
  },

  /**
   * Participant: Check in with ID code at start screen
   */
  checkInParticipant: async (participant_id_code, full_name) => {
    return await apiClient.post(
      `${API_CONFIG.BASE_URL}/api/test-sessions/check-in-participant`,
      { participant_id_code, full_name }
    );
  },

  /**
   * Participant: Check if they can start the test
   */
  canStartTest: async (participant_id_code, full_name) => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/test-sessions/participant/${participant_id_code}/can-start`,
      { params: { full_name } }
    );
  },

  /**
   * Participant: Validate that current device IP matches locked IP
   * Used when entering pending screen to prevent multi-device access
   */
  validateParticipantIP: async (participant_id_code, full_name) => {
    return await apiClient.post(
      `${API_CONFIG.BASE_URL}/api/test-sessions/validate-participant-ip`,
      { participant_id_code, full_name }
    );
  },
};
