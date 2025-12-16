import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import StartScreen from "./pages/StartScreen";
import PendingScreen from "./pages/PendingScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TestPage from "./pages/TestPage";
import ListeningStarter from "./pages/ListeningStarter";
import ListeningTestDashboard from "./pages/ListeningTestDashboard";
import ReadingStarter from "./pages/ReadingStarter";
import WritingStarter from "./pages/WritingStarter";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  // Initialize theme from localStorage on app load
  useEffect(() => {
    const storedTheme = localStorage.getItem("ielts_mock_theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const theme = storedTheme || (prefersDark ? "dark" : "light");

    // Apply theme to document root
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/pending" element={<PendingScreen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests/:id"
            element={
              <ProtectedRoute>
                <TestPage />
              </ProtectedRoute>
            }
          />
          <Route path="/test/listening" element={<ListeningStarter />} />
          <Route
            path="/test/listening/dashboard"
            element={<ListeningTestDashboard />}
          />
          <Route path="/test/reading" element={<ReadingStarter />} />
          <Route path="/test/writing" element={<WritingStarter />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
