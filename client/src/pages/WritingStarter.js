import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import writingVideo from "../starter_videos/writing_starter.mp4";
import "./WritingStarter.css";

function WritingStarter() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [volume, setVolume] = useState(75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.75;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "F11") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          navigate("/test/writing/dashboard", {
            state: { startTime: new Date().toISOString() },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleVideoEnded = () => {
    setVideoEnded(true);
  };

  const handleStartTest = () => {
    navigate("/test/writing/dashboard", {
      state: { startTime: new Date().toISOString() },
    });
  };

  // ==================== FULLSCREEN HELPER ====================
  const enterFullscreen = async () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  };

  // ==================== FULLSCREEN PROTECTION ====================
  useEffect(() => {
    const blockRestrictedKeys = (e) => {
      const isInputElement =
        e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

      // Skip blocking on keypress events - they handle text input
      if (e.type === "keypress") {
        return;
      }

      let shouldBlock = false;

      // Block ESC and F11 with maximum prevention
      if (e.keyCode === 122 || e.keyCode === 27) {
        shouldBlock = true;
      }
      // Block F12 (Developer Tools)
      else if (e.keyCode === 123) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+I (Developer Tools) - only outside input fields
      else if (!isInputElement && e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+J (Console) - only outside input fields
      else if (!isInputElement && e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        shouldBlock = true;
      }
      // Block Ctrl+Shift+C (Inspect Element) - only outside input fields
      else if (!isInputElement && e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        shouldBlock = true;
      }
      // Block Alt+Tab
      else if (e.altKey && e.keyCode === 9) {
        shouldBlock = true;
      }

      if (shouldBlock) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const handleKeyDown = (e) => blockRestrictedKeys(e);
    const handleKeyPress = (e) => blockRestrictedKeys(e);
    const handleKeyUp = (e) => blockRestrictedKeys(e);

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Continuous fullscreen monitor using requestAnimationFrame
    let fullscreenMonitorId = null;

    const monitorFullscreen = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      // If not in fullscreen, immediately try to re-enter
      if (!isCurrentlyFullscreen) {
        enterFullscreen().catch(() => {});
      }

      // Schedule next check at screen refresh rate
      fullscreenMonitorId = requestAnimationFrame(monitorFullscreen);
    };

    // Start the fullscreen monitor
    fullscreenMonitorId = requestAnimationFrame(monitorFullscreen);

    // Add keyboard listeners with both capture and bubble phases
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, false);
    document.addEventListener("keypress", handleKeyPress, true);
    document.addEventListener("keypress", handleKeyPress, false);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("keyup", handleKeyUp, false);

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keydown", handleKeyDown, false);
    window.addEventListener("keypress", handleKeyPress, true);
    window.addEventListener("keypress", handleKeyPress, false);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("keyup", handleKeyUp, false);

    if (document.body) {
      document.body.addEventListener("keydown", handleKeyDown, true);
      document.body.addEventListener("keydown", handleKeyDown, false);
      document.body.addEventListener("keypress", handleKeyPress, true);
      document.body.addEventListener("keypress", handleKeyPress, false);
      document.body.addEventListener("keyup", handleKeyUp, true);
      document.body.addEventListener("keyup", handleKeyUp, false);
    }

    const htmlElement = document.documentElement;
    if (htmlElement) {
      htmlElement.addEventListener("keydown", handleKeyDown, true);
      htmlElement.addEventListener("keydown", handleKeyDown, false);
      htmlElement.addEventListener("keypress", handleKeyPress, true);
      htmlElement.addEventListener("keypress", handleKeyPress, false);
      htmlElement.addEventListener("keyup", handleKeyUp, true);
      htmlElement.addEventListener("keyup", handleKeyUp, false);
    }

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      // Cancel the animation frame monitor
      if (fullscreenMonitorId !== null) {
        cancelAnimationFrame(fullscreenMonitorId);
      }

      // Remove all keyboard listeners
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keydown", handleKeyDown, false);
      document.removeEventListener("keypress", handleKeyPress, true);
      document.removeEventListener("keypress", handleKeyPress, false);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("keyup", handleKeyUp, false);

      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keydown", handleKeyDown, false);
      window.removeEventListener("keypress", handleKeyPress, true);
      window.removeEventListener("keypress", handleKeyPress, false);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("keyup", handleKeyUp, false);

      if (document.body) {
        document.body.removeEventListener("keydown", handleKeyDown, true);
        document.body.removeEventListener("keydown", handleKeyDown, false);
        document.body.removeEventListener("keypress", handleKeyPress, true);
        document.body.removeEventListener("keypress", handleKeyPress, false);
        document.body.removeEventListener("keyup", handleKeyUp, true);
        document.body.removeEventListener("keyup", handleKeyUp, false);
      }

      const htmlElement = document.documentElement;
      if (htmlElement) {
        htmlElement.removeEventListener("keydown", handleKeyDown, true);
        htmlElement.removeEventListener("keydown", handleKeyDown, false);
        htmlElement.removeEventListener("keypress", handleKeyPress, true);
        htmlElement.removeEventListener("keypress", handleKeyPress, false);
        htmlElement.removeEventListener("keyup", handleKeyUp, true);
        htmlElement.removeEventListener("keyup", handleKeyUp, false);
      }

      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const handleVideoClick = (e) => {
    e.stopPropagation();
    handlePlayPause();
  };

  const handleFullscreen = () => {
    if (videoContainerRef.current) {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          videoContainerRef.current.requestFullscreen();
        } else if (videoContainerRef.current.webkitRequestFullscreen) {
          videoContainerRef.current.webkitRequestFullscreen();
        } else if (videoContainerRef.current.msRequestFullscreen) {
          videoContainerRef.current.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (document.webkitFullscreenElement) {
          document.webkitExitFullscreen();
        } else if (document.msFullscreenElement) {
          document.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement || !!document.webkitFullscreenElement
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="writing-starter">
      <div className="top-navigation">
        <div className="nav-left">
          <div className="timer-section">
            <span className="timer-icon">⏱</span>
            <span className="timer-time">{formatTimer(timeRemaining)}</span>
          </div>
        </div>

        <div className="nav-right">
          <div className="volume-control-nav">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              className="volume-slider-nav"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
            />
            <span className="volume-percent">{volume}%</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="writing-container">
        <div className="writing-header">
          <h1>Writing Test Instructions</h1>
          <p>
            Please follow the instructions carefully. You will have 60 minutes
            to complete two writing tasks. Make sure you understand the
            requirements before starting.
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
            <strong>Tip:</strong> You can adjust the video volume using the
            volume slider located in the top-right corner of your screen.
          </p>
        </div>

        <div className="content-section">
          <div className="video-instructions">
            <div className="video-container" ref={videoContainerRef}>
              <video
                ref={videoRef}
                width="100%"
                height="auto"
                controlsList="nodownload"
                style={{
                  borderRadius: "8px",
                  display: "block",
                  cursor: "pointer",
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handleVideoClick}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
              >
                <source src={writingVideo} type="video/mp4" />
                Your browser does not support the video element.
              </video>
              {!isPlaying && (
                <div className="video-overlay">
                  <button
                    className="play-pause-btn"
                    onClick={handlePlayPause}
                    aria-label="Play"
                  >
                    <svg viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
              <button
                className="fullscreen-btn"
                onClick={handleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" fill="white">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="white">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
              <div className="video-timeline">
                <input
                  type="range"
                  className="progress-bar"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                />
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <p className="video-desc">
              <strong>Important:</strong> Watch the complete video. The start
              button will enable after you finish.
            </p>

            <div className="action-buttons-center">
              <button
                className="primary-button-center"
                onClick={handleStartTest}
                disabled={!videoEnded}
                title={
                  videoEnded
                    ? "Start Test"
                    : "Please watch the video completely first"
                }
              >
                <span>Start Test Now</span>
                <span>▶</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WritingStarter;
