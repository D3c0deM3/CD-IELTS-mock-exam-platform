// Detect environment and set API URL
const getApiUrl = () => {
  // In production (deployed), use the Railway backend or the provided URL
  if (process.env.NODE_ENV === "production" || process.env.REACT_APP_API_URL) {
    return (
      process.env.REACT_APP_API_URL ||
      "https://cd-ielts-mock-exam-platform-production.up.railway.app"
    );
  }
  // In development (localhost), use localhost
  return "http://localhost:4000";
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
