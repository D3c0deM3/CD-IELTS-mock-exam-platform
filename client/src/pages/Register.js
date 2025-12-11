import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { authService } from "../services/api";
import "./AuthPages.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const validateForm = () => {
    const errors = [];

    // Validate full name
    if (formData.full_name.trim().length < 2) {
      errors.push("Please enter your full name");
    }

    //validate phone number
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(formData.phone_number)) {
      errors.push("Please enter a valid phone number");
    }

    // Validate password
    if (formData.password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }

    // Check password match
    if (formData.password !== formData.confirmPassword) {
      errors.push("Passwords do not match");
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setError({
        title: "Validation Error",
        message: errors[0],
        type: "validation",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Prepare registration data
      const registrationData = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
      };

      // Use service layer
      const response = await authService.register(registrationData);
      console.log("Registration response:", response);
      console.log("Response keys:", Object.keys(response));
      console.log("Token in response:", response.token);
      console.log(
        "Token after registration:",
        localStorage.getItem("accessToken")
      );
      console.log("User after registration:", localStorage.getItem("user"));

      // Verify token was actually saved
      const savedToken = localStorage.getItem("accessToken");
      if (!savedToken) {
        console.error("CRITICAL: Token was not saved to localStorage!");
        setError({
          title: "Login Error",
          message: "Failed to save authentication token. Please try again.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      // Show success animation
      setShowSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        console.log("Navigating to dashboard...");
        console.log(
          "Token before navigation:",
          localStorage.getItem("accessToken")
        );
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      // Handle different error types
      console.error("Registration error:", err);
      let errorData = {
        title: "Registration Failed",
        message: "An error occurred. Please try again.",
        type: "error",
      };

      if (err.response?.status === 409) {
        // Conflict - phone number already exists
        errorData = {
          title: "Account Already Exists",
          message:
            "An account with this phone number already exists. Please log in instead.",
          type: "conflict",
          action: "login",
        };
      } else if (err.response?.data?.error) {
        errorData.message = err.response.data.error;
      } else if (err.message) {
        errorData.message = err.message;
      }

      setError(errorData);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <AuthLayout
        title="Account Created Successfully!"
        subtitle="Welcome to IELTS Mock Test platform"
      >
        <div className="success-container">
          <div className="success-animation">
            <div className="success-checkmark">✓</div>
          </div>
          <h2 className="success-title">Account Created!</h2>
          <p className="success-message">
            Your account has been successfully created. Redirecting you to
            dashboard...
          </p>
          <div className="success-spinner"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register for IELTS Mock Test platform"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="full_name">Full Name *</label>
          <div className="input-wrapper">
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="As per your ID document"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="phone_number">Phone Number *</label>
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
          <label htmlFor="password">Password *</label>
          <div className="input-wrapper password-input">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
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

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <div className="input-wrapper password-input">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex="-1"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <div className="error-message-text">
              <span className="error-message-title">{error.title}</span>
              <span className="error-message-detail">{error.message}</span>
              {error.action === "login" && (
                <div style={{ marginTop: "8px" }}>
                  <Link
                    to="/login"
                    className="auth-link"
                    style={{ marginLeft: 0 }}
                  >
                    Go to Login →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </button>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign In Instead
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
