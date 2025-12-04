import React, { useEffect, useState } from "react";
import "./ThemeToggle.css";

function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ielts_mock_theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initial = stored || preferred;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    const nextTheme = theme === "dark" ? "light" : "dark";

    // Smooth transition
    requestAnimationFrame(() => {
      setTheme(nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);

      try {
        localStorage.setItem("ielts_mock_theme", nextTheme);
      } catch (e) {
        console.error("LocalStorage not available");
      }

      // Reset animation state
      setTimeout(() => setIsAnimating(false), 300);
    });
  };

  const isDark = theme === "dark";

  return (
    <button
      className={`theme-toggle ${isDark ? "dark" : "light"} ${
        isAnimating ? "animating" : ""
      }`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      disabled={isAnimating}
    >
      <div className="toggle-inner">
        <div className="toggle-track">
          <div className="toggle-icons">
            <div className="icon sun">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                <g
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                >
                  <path d="M12 5V3" />
                  <path d="M12 21V19" />
                  <path d="M5 12H3" />
                  <path d="M21 12H19" />
                  <path d="M16.95 7.05L18.36 5.64" />
                  <path d="M5.64 18.36L7.05 16.95" />
                  <path d="M7.05 7.05L5.64 5.64" />
                  <path d="M18.36 18.36L16.95 16.95" />
                </g>
              </svg>
            </div>

            <div className="icon moon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          <div className="toggle-thumb">
            <div className="thumb-inner">
              {isDark && (
                <>
                  <div className="crater crater-1"></div>
                  <div className="crater crater-2"></div>
                </>
              )}
              {!isDark && (
                <>
                  <div className="sparkle sparkle-1"></div>
                  <div className="sparkle sparkle-2"></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default ThemeToggle;
