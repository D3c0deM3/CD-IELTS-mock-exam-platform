// Detect environment and set API URL
// Use window.location to detect runtime environment, not build-time NODE_ENV
const getApiUrl = () => {
  // Check if running on localhost
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:4000";
  }

  // Use environment variable if provided
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Default to production backend
  return "https://cd-ielts-mock-exam-platform-production.up.railway.app";
};

// Centralized API configuration
const API_CONFIG = {
  BASE_URL: getApiUrl(),
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/api/users/login",
      REGISTER: "/api/users/register",
      LOGOUT: "/api/users/logout",
      REFRESH: "/api/users/refresh",
      ME: "/api/users/me",
    },
    TESTS: {
      LIST: "/api/tests",
      DETAIL: "/api/tests/:id",
      BATCHES: "/api/tests/:id/batches",
    },
  },

  // Helper function to build full URLs
  buildUrl(endpoint, params = {}) {
    let url = endpoint;

    // Replace URL parameters (e.g., :id -> actualId)
    Object.keys(params).forEach((key) => {
      url = url.replace(`:${key}`, params[key]);
    });

    return `${this.BASE_URL}${url}`;
  },
};

export default API_CONFIG;
