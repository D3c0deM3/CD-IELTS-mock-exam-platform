import API_CONFIG from "../config/api";
import axios from "axios";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // Handle 401 errors (token expired/invalid)
    if (error.response?.status === 401) {
      // Clear storage and redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    // Backend returns { token, user: { role } }
    if (response.token) {
      localStorage.setItem("accessToken", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  register: async (userData) => {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.AUTH.REGISTER,
      userData
    );
    return response;
  },

  logout: async () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  },

  getCurrentUser: async () => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.ME);
    return response;
  },
};

// Export the configured client for custom requests
export { apiClient };
