import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import audioService from "../services/audioService";
import listeningVideo from "../starter_videos/listening_starter.mp4";
import "./ListeningStarter.css";

function ListeningStarter() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [volume, setVolume] = useState(75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  // Format time MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Format time MM:SS for timer
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Enter fullscreen with cross-browser support
  const enterFullscreen = async () => {
    try {
      if (
        videoContainerRef.current &&
        videoContainerRef.current.requestFullscreen
      ) {
        await videoContainerRef.current.requestFullscreen();
      } else if (
        videoContainerRef.current &&
        videoContainerRef.current.webkitRequestFullscreen
      ) {
        await videoContainerRef.current.webkitRequestFullscreen();
      } else if (
        videoContainerRef.current &&
        videoContainerRef.current.mozRequestFullScreen
      ) {
        await videoContainerRef.current.mozRequestFullScreen();
      } else if (
        videoContainerRef.current &&
        videoContainerRef.current.msRequestFullscreen
      ) {
        await videoContainerRef.current.msRequestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  };

  // Sync volume on component mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.75;
    }
  }, []);

  // Preload listening test audio while user watches intro video
  useEffect(() => {
    const preloadTestAudio = async () => {
      try {
        await audioService.preloadAudio();
        console.log("Audio preloaded successfully during starter screen");
      } catch (err) {
        console.error("Failed to preload audio:", err);
      }
    };

    preloadTestAudio();

    // Cleanup on unmount
    return () => {
      audioService.clearAudioCache();
    };
  }, []);

  // Fullscreen lock and comprehensive keyboard restrictions
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Block ESC and F11 with maximum prevention
      if (e.key === "Escape" || e.key === "F11" || e.keyCode === 122) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      // Block F12 (Developer Tools)
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      // Block Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      // Block Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      // Block Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      // Block Alt+Tab
      if (e.altKey && (e.key === "Tab" || e.keyCode === 9)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // Use capture phase for keyboard events to catch them before they propagate
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          navigate("/test/listening/dashboard", {
            state: { startTime: new Date().toISOString() },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  // Handle video ended
  const handleVideoEnded = () => {
    setVideoEnded(true);
  };

  // Handle start test button
  const handleStartTest = () => {
    navigate("/test/listening/dashboard", {
      state: { startTime: new Date().toISOString() },
    });
  };

  // Handle video click to pause/play
  const handleVideoClick = (e) => {
    e.stopPropagation();
    handlePlayPause();
  };

  // Handle fullscreen toggle
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

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Handle seeking in video
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

  // Security: Prevent navigation away
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
    <div className="listening-starter">
      {/* Top Navigation Bar */}
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

      <div className="listening-container">
        {/* Professional Header */}
        <div className="listening-header">
          <h1>Listening Test Instructions</h1>
          <p>
            Please follow the instructions carefully. You will hear the audio
            only once. Make sure your headphones are working properly before
            starting.
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
            <strong>Tip:</strong> You can adjust the audio volume using the
            volume slider located in the top-right corner of your screen.
          </p>
        </div>

        {/* Content Section */}
        <div className="content-section">
          <div className="video-instructions">
            <div className="video-container" ref={videoContainerRef}>
              <video
                ref={videoRef}
                width="100%"
                height="auto"
                controlsList="nodownload nofullscreen"
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
                <source src={listeningVideo} type="video/mp4" />
                Your browser does not support the video element.
              </video>
              {/* Custom Play/Pause Overlay Button - Only visible when paused */}
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
              {/* Fullscreen Button */}
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
              {/* Video Timeline */}
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

export default ListeningStarter;
