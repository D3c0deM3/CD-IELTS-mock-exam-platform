/**
 * Device ID Generator
 * Creates a unique, persistent identifier for each device/browser
 * Combines multiple factors to create a fingerprint
 */

const DEVICE_ID_KEY = "ielts_mock_device_id";

/**
 * Generate a unique device ID based on browser/device characteristics
 * Uses a combination of factors to create a fingerprint
 */
const generateDeviceId = () => {
  const factors = [
    navigator.userAgent, // Browser and OS info
    navigator.language, // Language preference
    navigator.hardwareConcurrency || "unknown", // Number of CPU cores
    navigator.deviceMemory || "unknown", // Device RAM (if available)
    new Date().getTimezoneOffset(), // Timezone
    screen.width + "x" + screen.height, // Screen resolution
    screen.colorDepth, // Color depth
  ];

  // Create a hash of the combined factors
  const combined = factors.join("|");
  let hash = 0;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert hash to a readable string
  const baseId = Math.abs(hash).toString(36);
  
  // Add random component for additional uniqueness
  const randomComponent = Math.random().toString(36).substring(2, 15);
  
  return `device_${baseId}_${randomComponent}`.substring(0, 50);
};

/**
 * Get or create a persistent device ID
 * Stores the ID in localStorage so it persists across page refreshes
 */
export const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate and store new device ID
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
};

/**
 * Get the current device ID (returns null if not created yet)
 */
export const getDeviceId = () => {
  return localStorage.getItem(DEVICE_ID_KEY);
};

/**
 * Clear the device ID (logout/reset)
 */
export const clearDeviceId = () => {
  localStorage.removeItem(DEVICE_ID_KEY);
};

export default {
  getOrCreateDeviceId,
  getDeviceId,
  clearDeviceId,
};
