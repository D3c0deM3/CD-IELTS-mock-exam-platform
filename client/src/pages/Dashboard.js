import React, { useState, useEffect } from "react";
import dashboardService from "../services/dashboardService";
import TestRegistrationModal from "../components/TestRegistrationModal";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";
import { Link, useNavigate } from "react-router-dom";
import { FiCalendar, FiChevronRight, FiUser, FiDownload, FiLogOut } from "react-icons/fi";
import API_CONFIG from "../config/api";
import "./Dashboard.css";

/* -------------------------
   Cambridge conversion tables
   (Academic Listening & Reading)
   ------------------------- */
const listeningAcademicTable = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7.0 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6.0 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5.0 },
  { min: 13, max: 15, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 7, max: 9, band: 3.5 },
  { min: 5, max: 6, band: 3.0 },
  { min: 3, max: 4, band: 2.5 },
  { min: 1, max: 2, band: 2.0 },
  { min: 0, max: 0, band: 0.0 },
];

const readingAcademicTable = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7.0 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6.0 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5.0 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 3, max: 3, band: 2.0 },
  { min: 1, max: 2, band: 1.0 },
  { min: 0, max: 0, band: 0.0 },
];

/* -------------------------
   Helpers
   ------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const toNearestHalf = (n) => Math.round(n * 2) / 2;

function rawToBandFromTable(raw, table) {
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const r = clamp(Math.floor(Number(raw)), 0, 40);
  for (const row of table) if (r >= row.min && r <= row.max) return row.band;
  return null;
}

function normalizeWritingOrSpeaking(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  if (v <= 9) return toNearestHalf(clamp(v, 0, 9));
  const band = (clamp(v, 0, 40) / 40) * 9;
  return toNearestHalf(band);
}

function computeOverallBand(listening, reading, writing, speaking) {
  const comps = [listening, reading, writing, speaking].map((c) =>
    c == null || Number.isNaN(Number(c)) ? null : Number(c)
  );
  const valid = comps.filter((c) => c != null);
  if (valid.length === 0) return null;
  const avg = valid.reduce((s, x) => s + x, 0) / valid.length;
  return toNearestHalf(avg);
}

/* -------------------------
   Crisper SVG donut component
   ------------------------- */
const Donut = ({ band }) => {
  const display = band != null ? Number(band) : 0;
  const pct = clamp((display / 9) * 100, 0, 100);
  const radius = 40;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div
      className="donut-wrap"
      aria-hidden="false"
      aria-label={`Overall band ${band ?? "–"}`}
    >
      <svg
        className="donut"
        viewBox="0 0 100 100"
        width="120"
        height="120"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        <g transform="translate(50,50)">
          <circle
            r={radius}
            fill="none"
            stroke="#eef6ff"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <circle
            r={radius}
            fill="none"
            stroke="url(#donutGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference.toFixed(
              2
            )} ${circumference.toFixed(2)}`}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 850ms cubic-bezier(.2,.9,.2,1)",
            }}
          />
        </g>
      </svg>

      <div className="donut-center">
        <div className="donut-score">{band != null ? band : "–"}</div>
        <div className="donut-sub">Overall</div>
      </div>
    </div>
  );
};

/* -------------------------
   Main Dashboard component
   ------------------------- */
const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]); // raw backend objects
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedTestForModal, setSelectedTestForModal] = useState(null);

  // Admin contact info
  const ADMIN_EMAIL = "https://t.me/cdimock_test";
  const ADMIN_PHONE = "+99891581-77-11";

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Call logout endpoint to invalidate session
      if (token) {
        await fetch(`${API_CONFIG.BASE_URL}/api/users/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
      }

      // Clear all user data from localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentParticipant");
      localStorage.removeItem("ielts_mock_theme");

      // Redirect to signup page
      navigate("/");
      
      // Force page refresh to ensure clean state
      window.location.href = "/";
    } catch (err) {
      console.error("Error during logout:", err);
      // Still clear local data even if backend call fails
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentParticipant");
      navigate("/");
      window.location.href = "/";
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Use the batch fetch from dashboard service for better performance
        const dashboardData = await dashboardService.getDashboardData();

        if (!mounted) return;

        setProfile(dashboardData.profile);
        setResults(dashboardData.results || []);
        setTests(dashboardData.tests || []);
        setUpcoming(dashboardData.stats?.recentResults || []);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
        if (mounted) setError("Failed to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // map backend raw -> normalized bands
  const normalized = (results || []).map((r) => {
    const listening =
      r.listening_score != null
        ? toNearestHalf(Number(r.listening_score))
        : r.listening_band != null
        ? toNearestHalf(Number(r.listening_band))
        : r.listening_raw != null
        ? rawToBandFromTable(r.listening_raw, listeningAcademicTable)
        : null;

    const reading =
      r.reading_score != null
        ? toNearestHalf(Number(r.reading_score))
        : r.reading_band != null
        ? toNearestHalf(Number(r.reading_band))
        : r.reading_raw != null
        ? rawToBandFromTable(r.reading_raw, readingAcademicTable)
        : null;

    const writing =
      r.writing_score != null
        ? toNearestHalf(Number(r.writing_score))
        : r.writing_band != null
        ? toNearestHalf(Number(r.writing_band))
        : r.writing_raw != null
        ? normalizeWritingOrSpeaking(r.writing_raw)
        : normalizeWritingOrSpeaking(r.writing);

    const speaking =
      r.speaking_score != null
        ? toNearestHalf(Number(r.speaking_score))
        : r.speaking_band != null
        ? toNearestHalf(Number(r.speaking_band))
        : r.speaking_raw != null
        ? normalizeWritingOrSpeaking(r.speaking_raw)
        : normalizeWritingOrSpeaking(r.speaking);

    const overall = computeOverallBand(listening, reading, writing, speaking);

    return {
      ...r,
      _norm: { listening, reading, writing, speaking, overall },
    };
  });

  const latest = normalized.length ? normalized[0] : null;

  // Filter out expired tests
  const availableTests = (tests || []).filter((t) => {
    if (!t.expiration_date) return true; // Show tests with no expiration
    const expirationDate = new Date(t.expiration_date);
    return expirationDate > new Date(); // Only show if expiration is in the future
  });

  const formatDT = (iso) => {
    if (!iso) return "—";
    try {
      const dt = new Date(iso);
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(dt);
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="bc-db">
        <div className="bc-container">
          <div className="bc-header-skel" />
          <div className="bc-grid-skel" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bc-db">
        <div className="bc-container">
          <div className="alert">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      <ThemeToggle />
      <div className="bc-db">
        <div className="bc-container">
          {/* breadcrumb header */}
          <div className="page-head">
            <div className="page-title">
              <h2>Dashboard</h2>
              <div className="breadcrumb">
                <span className="crumb">Home</span>
                <FiChevronRight className="crumb-sep" />
                <span className="crumb current">Dashboard</span>
              </div>
            </div>

            <div className="page-actions">
              <Link to="/account" className="action-ghost">
                <FiUser />
                <span>{profile?.full_name || "Account"}</span>
              </Link>
              <button 
                onClick={handleLogout} 
                className="action-ghost logout-button"
                title="Logout"
                aria-label="Logout"
              >
                <FiLogOut />
              </button>
            </div>
          </div>

          {/* Main layout: large top-left performance + right column */}
          <div className="bc-grid">
            <main className="left-col">
              {/* Latest Performance card */}
              <section
                className="card report-card"
                aria-labelledby="latestPerformance"
              >
                <div className="card-head">
                  <div>
                    <h3 id="latestPerformance">Latest Performance</h3>
                    <p className="muted">
                      Official-style report card — component bands & overall
                    </p>
                  </div>
                  <div className="report-actions">
                    <button
                      className="btn-export"
                      title="Download PDF (client)"
                    >
                      <FiDownload /> Export
                    </button>
                  </div>
                </div>

                <div className="report-body">
                  <div className="report-left">
                    <div className="report-meta">
                      <div className="report-meta-row">
                        <div className="meta-label">Test</div>
                        <div className="meta-value">
                          {latest?.test_name ?? "—"}
                        </div>
                      </div>
                      <div className="report-meta-row">
                        <div className="meta-label">Date</div>
                        <div className="meta-value">
                          {latest
                            ? formatDT(latest.created_at || latest.taken_at)
                            : "—"}
                        </div>
                      </div>
                      <div className="report-meta-row">
                        <div className="meta-label">Centre</div>
                        <div className="meta-value">
                          {latest?.center ?? "Online"}
                        </div>
                      </div>
                    </div>

                    <div className="score-tiles">
                      {/* official rectangular score tiles */}
                      {["listening", "reading", "writing", "speaking"].map(
                        (k) => {
                          const val = latest?._norm?.[k] ?? "—";
                          return (
                            <div className="tile" key={k}>
                              <div className="tile-title">
                                {k.charAt(0).toUpperCase() + k.slice(1)}
                              </div>
                              <div className="tile-score">{val}</div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="report-legend">
                      <div className="legend-note">
                        Overall is the average of the four component bands,
                        rounded to the nearest 0.5.
                      </div>
                    </div>
                  </div>

                  <div className="report-right">
                    <Donut band={latest?._norm?.overall} />
                  </div>
                </div>
              </section>

              {/* Available Tests */}
              <section className="card small-card">
                <div className="card-head">
                  <h4>Available Mock Tests</h4>
                  <p className="muted">Register for scheduled sessions</p>
                </div>

                <ul className="compact-list">
                  {availableTests && availableTests.length > 0 ? (
                    availableTests.map((t) => (
                      <li key={t.id}>
                        <div className="compact-left">
                          <div className="compact-name">{t.name}</div>
                          <div className="muted small">{t.description}</div>
                          {t.expiration_date && (
                            <div className="test-expiration">
                              <small>
                                Expires: {formatDT(t.expiration_date)}
                              </small>
                            </div>
                          )}
                        </div>
                        <div className="compact-right">
                          <button
                            className="btn small"
                            onClick={() => {
                              setSelectedTestForModal(t);
                              setShowRegistrationModal(true);
                            }}
                          >
                            Register
                          </button>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="empty">No available tests</li>
                  )}
                </ul>
              </section>

              {/* Test Registration Modal */}
              <TestRegistrationModal
                isOpen={showRegistrationModal}
                onClose={() => setShowRegistrationModal(false)}
                testName={selectedTestForModal?.name || ""}
                adminEmail={ADMIN_EMAIL}
                adminPhone={ADMIN_PHONE}
              />

              {/* Results History (expanded list) */}
              <section
                className="card history-panel"
                aria-labelledby="historyPanel"
              >
                <div className="card-head">
                  <h4 id="historyPanel">Results History</h4>
                  <p className="muted">
                    All past mocks with quick access to detailed reports
                  </p>
                </div>

                {normalized && normalized.length > 0 ? (
                  <ol className="history-ol">
                    {normalized.map((r) => (
                      <li key={r.id} className="history-row">
                        <div className="history-main">
                          <div>
                            <div className="history-name">
                              {r.test_name ?? "Mock Test"}
                            </div>
                            <div className="muted small">
                              {formatDT(r.created_at || r.taken_at)}
                            </div>
                          </div>

                          <div className="history-right">
                            <div className="history-overall">
                              {r._norm?.overall ?? "–"}
                            </div>
                            <button
                              className="link small"
                              onClick={() =>
                                setExpandedId((p) => (p === r.id ? null : r.id))
                              }
                              aria-expanded={expandedId === r.id}
                            >
                              {expandedId === r.id ? "Hide details" : "Details"}
                            </button>
                          </div>
                        </div>

                        {expandedId === r.id && (
                          <div className="history-details">
                            <div className="detail-grid">
                              {[
                                "listening",
                                "reading",
                                "writing",
                                "speaking",
                              ].map((k) => (
                                <div className="detail" key={k}>
                                  <div className="detail-head">
                                    {k.charAt(0).toUpperCase() + k.slice(1)}
                                  </div>
                                  <div className="detail-val">
                                    {r._norm?.[k] ?? "–"}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="detail-actions">
                              <Link
                                to={`/results/${r.id}`}
                                className="btn small"
                              >
                                View full report
                              </Link>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="empty">You have no past results yet.</div>
                )}
              </section>
            </main>

            {/* Right column: upcoming tests & quick summary */}
            <aside className="right-col">
              <div className="card upcoming-card" aria-labelledby="upcoming">
                <div className="card-head">
                  <h4 id="upcoming">Upcoming Tests</h4>
                  <p className="muted">Your next scheduled mocks & bookings</p>
                </div>

                <ul className="upcoming-list">
                  {upcoming && upcoming.length > 0 ? (
                    upcoming.map((u) => (
                      <li key={u.id} className="upcoming-row">
                        <div className="up-left">
                          <div className="up-title">
                            {u.name ?? "Mock Test"}
                          </div>
                          <div className="muted small">
                            <FiCalendar /> {formatDT(u.start_at)}
                          </div>
                        </div>

                        <div className="up-right">
                          <div
                            className={`status ${u.booked ? "booked" : "open"}`}
                          >
                            {u.booked ? "Booked" : "Open"}
                          </div>
                          <Link to={`/tests/${u.id}`} className="link small">
                            Details
                          </Link>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="empty">No upcoming tests</li>
                  )}
                </ul>
              </div>

              {/* Quick progress snapshot */}
              <div className="card snapshot">
                <div className="snap-head">
                  <h4>My Progress</h4>
                  <p className="muted small">Quick glance at overall band</p>
                </div>

                <div className="snap-body">
                  <div className="snap-donut">
                    <Donut band={latest?._norm?.overall} />
                  </div>
                </div>

                <div className="card-footer">
                  <Link to="/progress" className="link small">
                    Full progress report
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          {/* Footer note */}
          <div className="legal-note">
            Results shown are mock conversions using Cambridge-like thresholds
            for Listening & Reading. Writing & Speaking are treated as bands
            where provided.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
