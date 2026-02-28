import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { authService } from "../services/api";
import "./AuthPages.css";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone_number: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone_number.trim() || !formData.password) {
      setError({
        title: "Missing Credentials",
        message: "Please enter both phone number and password.",
        type: "validation",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authService.login({
        phone_number: formData.phone_number.trim(),
        password: formData.password,
      });

      const userRole = response.user?.role || "student";
      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else if (userRole === "center") {
        navigate("/center/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      // Handle different error types
      let errorData = {
        title: "Login Failed",
        message: "An error occurred. Please try again.",
        type: "error",
      };

      console.error("Login error:", err); // Debug log

      if (err.response?.status === 401) {
        // Unauthorized - invalid credentials
        errorData = {
          title: "Invalid Credentials",
          message: "Phone number or password is incorrect. Please try again.",
          type: "auth",
        };
      } else if (err.response?.data?.error) {
        errorData.message = err.response.data.error;
      } else if (err.message && err.message !== "Network Error") {
        errorData.message = err.message;
      } else {
        errorData = {
          title: "Connection Error",
          message:
            "Unable to connect to the server. Please check your internet connection.",
          type: "network",
        };
      }

      setError(errorData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your IELTS Mock Test account"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <div className="input-wrapper">
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper password-input">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <div className="error-message-text">
              <span className="error-message-title">{error.title}</span>
              <span className="error-message-detail">{error.message}</span>
              {error.type === "auth" && (
                <div style={{ marginTop: "8px", fontSize: "12px" }}>
                  <Link
                    to="/register"
                    className="auth-link"
                    style={{ marginLeft: 0 }}
                  >
                    Create an account instead →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="form-options">
          <Link to="/forgot-password" className="forgot-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="divider">
          <span>Don't have an account?</span>
        </div>

        <div className="auth-footer">
          Create one now
          <Link to="/register" className="auth-link">
            Create Account →
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
