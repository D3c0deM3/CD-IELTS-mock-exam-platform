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

  // Keep screen name current without re-running effects
  useEffect(() => {
    screenRef.current = screenName;
  }, [screenName]);

  // Report current screen on mount / screen change
  useEffect(() => {
    if (!enabled) return;
    activityService.reportScreenChange(screenName);
  }, [screenName, enabled]);

  // Heartbeat
  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = () => {
      activityService.reportActivity(screenRef.current);
    };

    sendHeartbeat(); // immediate first heartbeat
    const timer = setInterval(sendHeartbeat, heartbeatInterval);
    return () => clearInterval(timer);
  }, [heartbeatInterval, enabled]);

  // Tab visibility changes
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    if (document.hidden) {
      activityService.reportTabSwitch(screenRef.current);
    } else {
      activityService.reportFocusGained(screenRef.current);
    }
  }, [enabled]);

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
      activityService.reportFocusLost(screenRef.current);
    };
    const handleFocus = () => {
      activityService.reportFocusGained(screenRef.current);
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled]);
};

export default useActivityMonitor;
