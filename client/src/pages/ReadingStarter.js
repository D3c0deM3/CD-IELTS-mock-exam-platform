import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import readingVideo from "../starter_videos/reading_starter.mp4";
import "./ListeningStarter.css";

function ReadingStarter() {
  const [volume, setVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/test/reading/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVideoClick = () => {
    handlePlayPause();
  };

  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.volume = volume / 100;
    }
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    setIsPlaying(false);
  };

  const handleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const handleStartTest = () => {
    navigate("/test/reading/dashboard");
  };

  return (
    <div className="listening-starter">
      <div className="top-navigation">
        <div className="nav-left">
          <span className="timer-label">Time Remaining:</span>
          <div className="timer-display">
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
        <div className="listening-header">
          <h1>Reading Test Instructions</h1>
          <p>
            You will have 60 minutes to complete the reading section. Please
            watch the instructions carefully.
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
                <source src={readingVideo} type="video/mp4" />
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
              Watch the complete video. The start button will enable after you
              finish.
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

export default ReadingStarter;
