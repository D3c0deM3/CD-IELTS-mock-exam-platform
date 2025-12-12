import API_CONFIG from "../config/api";
import { apiClient } from "./api";

const dashboardService = {
  /**
   * Fetch user profile information
   */
  getUserProfile: async () => {
    return await apiClient.get(`${API_CONFIG.BASE_URL}/api/dashboard/profile`);
  },

  /**
   * Fetch all test results for the user
   * Ordered by created_at DESC (latest first)
   */
  getUserResults: async () => {
    return await apiClient.get(`${API_CONFIG.BASE_URL}/api/dashboard/results`);
  },

  /**
   * Fetch the latest (most recent) test result
   */
  getLatestResult: async () => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/dashboard/latest-result`
    );
  },

  /**
   * Fetch all available tests
   */
  getAvailableTests: async () => {
    return await apiClient.get(
      `${API_CONFIG.BASE_URL}/api/dashboard/available-tests`
    );
  },

  /**
   * Fetch dashboard statistics
   * Includes: total tests, completed tests, average score, recent results
   */
  getDashboardStats: async () => {
    return await apiClient.get(`${API_CONFIG.BASE_URL}/api/dashboard/stats`);
  },

  /**
   * Batch fetch dashboard data in one call
   * Fetches all data needed for dashboard initialization
   */
  getDashboardData: async () => {
    try {
      const [profile, results, stats, tests] = await Promise.allSettled([
        dashboardService.getUserProfile(),
        dashboardService.getUserResults(),
        dashboardService.getDashboardStats(),
        dashboardService.getAvailableTests(),
      ]);

      return {
        profile:
          profile.status === "fulfilled"
            ? profile.value.user
            : { error: "Failed to load profile" },
        results: results.status === "fulfilled" ? results.value.results : [],
        stats:
          stats.status === "fulfilled"
            ? stats.value
            : {
                totalTests: 0,
                completedTests: 0,
                averageScore: null,
                recentResults: [],
              },
        tests: tests.status === "fulfilled" ? tests.value.tests : [],
      };
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      throw err;
    }
  },
};

export default dashboardService;
