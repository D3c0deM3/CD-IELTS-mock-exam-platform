import React from "react";
import Navbar from "./Navbar";
import ThemeToggle from "./ThemeToggle";
import "./AuthLayout.css";

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="auth-page">
      <Navbar />
      <ThemeToggle />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-title-section">
              <h2 className="auth-title">{title}</h2>
              <p className="auth-subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="auth-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
