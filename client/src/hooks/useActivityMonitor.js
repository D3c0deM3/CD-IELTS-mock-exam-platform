import { useEffect, useRef, useCallback } from "react";
import activityService from "../services/activityService";

/**
 * Custom hook for participant activity monitoring.
 * Reports heartbeats, tab switches, and focus changes to the server.
 *
 * @param {string} screenName - Current screen identifier (e.g. "listening_starter", "reading_dashboard")
 * @param {object} options - Optional config
 * @param {number} options.heartbeatInterval - Heartbeat interval in ms (default: 15000)
 * @param {boolean} options.enabled - Whether monitoring is active (default: true)
 */
const useActivityMonitor = (screenName, options = {}) => {
  const { heartbeatInterval = 15000, enabled = true } = options;
  const screenRef = useRef(screenName);

  const getParticipantCode = useCallback(() => {
    try {
      const participant = JSON.parse(
        localStorage.getItem("currentParticipant") || "{}"
      );
      return participant.participant_id_code || null;
    } catch {
      return null;
    }
  }, []);

  // Keep screen name current without re-running effects
  useEffect(() => {
    screenRef.current = screenName;
  }, [screenName]);

  // Report current screen on mount / screen change
  useEffect(() => {
    if (!enabled) return;
    const participantCode = getParticipantCode();
    if (!participantCode) return;
    activityService.reportScreenChange(participantCode, screenName);
  }, [screenName, enabled, getParticipantCode]);

  // Heartbeat
  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = () => {
      const participantCode = getParticipantCode();
      if (participantCode) {
        activityService.reportActivity(participantCode, screenRef.current);
      }
    };

    sendHeartbeat(); // immediate first heartbeat
    const timer = setInterval(sendHeartbeat, heartbeatInterval);
    return () => clearInterval(timer);
  }, [heartbeatInterval, enabled, getParticipantCode]);

  // Tab visibility changes
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    const participantCode = getParticipantCode();
    if (!participantCode) return;
    if (document.hidden) {
      activityService.reportTabSwitch(participantCode);
    } else {
      activityService.reportFocusGained(participantCode);
    }
  }, [enabled, getParticipantCode]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleVisibilityChange, enabled]);

  // Window focus/blur
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      const participantCode = getParticipantCode();
      if (participantCode) {
        activityService.reportFocusLost(participantCode);
      }
    };
    const handleFocus = () => {
      const participantCode = getParticipantCode();
      if (participantCode) {
        activityService.reportFocusGained(participantCode);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, getParticipantCode]);
};

export default useActivityMonitor;
