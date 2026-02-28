import { apiClient } from "./api";

// Service to report participant activity for monitoring
const activityService = {
  // Send heartbeat with current screen info
  reportActivity: (participant_id_code, current_screen) => {
    return apiClient
      .post("/api/test-sessions/participant-activity", {
        participant_id_code,
        current_screen,
      })
      .catch(() => {}); // Silently fail - don't disrupt test
  },

  // Report tab switch event
  reportTabSwitch: (participant_id_code) => {
    return apiClient
      .post("/api/test-sessions/participant-activity", {
        participant_id_code,
        event_type: "tab_switch",
        event_data: JSON.stringify({ timestamp: new Date().toISOString() }),
      })
      .catch(() => {});
  },

  // Report focus lost
  reportFocusLost: (participant_id_code) => {
    return apiClient
      .post("/api/test-sessions/participant-activity", {
        participant_id_code,
        event_type: "focus_lost",
        event_data: JSON.stringify({ timestamp: new Date().toISOString() }),
      })
      .catch(() => {});
  },

  // Report focus gained
  reportFocusGained: (participant_id_code) => {
    return apiClient
      .post("/api/test-sessions/participant-activity", {
        participant_id_code,
        event_type: "focus_gained",
        event_data: JSON.stringify({ timestamp: new Date().toISOString() }),
      })
      .catch(() => {});
  },

  // Report screen change
  reportScreenChange: (participant_id_code, screen) => {
    return apiClient
      .post("/api/test-sessions/participant-activity", {
        participant_id_code,
        current_screen: screen,
        event_type: "screen_change",
        event_data: JSON.stringify({ screen, timestamp: new Date().toISOString() }),
      })
      .catch(() => {});
  },
};

export default activityService;
