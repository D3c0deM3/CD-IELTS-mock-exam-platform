// Centralized API configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:4000",
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
