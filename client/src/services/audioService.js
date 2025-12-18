/**
 * Audio Service - Handles audio loading, caching, and playback for listening tests
 * Imports audio file directly from pages folder
 */

import listeningAudio from "../pages/listening_test.mp3";

let audioCache = null;
let audioDuration = null;
let isPreloading = false;
let preloadPromise = null;

/**
 * Preload audio file with dev tools protection
 * Returns cached audio if already preloaded
 * @returns {Promise<{duration: number, audio: HTMLAudioElement}>}
 */
export const preloadAudio = async () => {
  // If already preloading, wait for that to complete
  if (isPreloading) {
    console.log("Audio preload already in progress, waiting...");
    return preloadPromise;
  }

  // If already preloaded, return cached version
  if (audioCache && audioDuration) {
    console.log(
      `✓ Audio already cached. Duration: ${audioDuration.toFixed(2)}s`
    );
    return {
      duration: audioDuration,
      audio: audioCache,
    };
  }

  isPreloading = true;

  preloadPromise = new Promise((resolve, reject) => {
    try {
      const audio = new Audio();

      // Prevent user manipulation via dev tools
      audio.controlsList = "nodownload";
      audio.crossOrigin = "anonymous";

      // Load metadata to get duration
      const handleLoadedMetadata = () => {
        audioDuration = audio.duration;
        audioCache = audio;
        isPreloading = false;

        // Remove event listeners to prevent memory leaks
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("error", handleError);

        // Make audio read-only in dev tools
        Object.defineProperty(audio, "controls", {
          set: function () {},
          get: function () {
            return false;
          },
        });
        Object.defineProperty(audio, "muted", {
          set: function () {},
          get: function () {
            return this._muted || false;
          },
        });

        console.log(
          `✓ Audio preloaded successfully. Duration: ${audioDuration.toFixed(
            2
          )}s`
        );

        resolve({
          duration: audioDuration,
          audio: audio,
        });
      };

      const handleError = (e) => {
        isPreloading = false;
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("error", handleError);

        console.error(
          "✗ Audio loading error:",
          e.type,
          "Source:",
          listeningAudio
        );
        reject(new Error(`Failed to load audio: ${e.type}`));
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
      audio.addEventListener("error", handleError, { once: true });

      // Start loading using imported audio URL
      audio.src = listeningAudio;
      audio.load();
    } catch (err) {
      isPreloading = false;
      console.error("✗ Audio preload exception:", err);
      reject(err);
    }
  });

  return preloadPromise;
};

/**
 * Play cached audio
 * @returns {Promise<void>}
 */
export const playAudio = async () => {
  if (!audioCache) {
    throw new Error("Audio not preloaded. Call preloadAudio first.");
  }

  try {
    // Set initial volume to 1.0 (100%)
    audioCache.volume = 1.0;

    // Reset playback position
    audioCache.currentTime = 0;

    // Play audio
    console.log("▶ Starting audio playback...");
    const playPromise = audioCache.play();
    if (playPromise !== undefined) {
      await playPromise;
      console.log("✓ Audio playback started successfully");
    }
  } catch (err) {
    console.error("✗ Audio playback error:", err);
    throw err;
  }
};

/**
 * Set audio volume (0 to 1)
 * @param {number} volumeLevel - Volume level from 0 to 1
 */
export const setVolume = (volumeLevel) => {
  if (!audioCache) {
    console.warn("Audio not loaded yet");
    return;
  }

  // Clamp volume between 0 and 1
  const clampedVolume = Math.max(0, Math.min(1, volumeLevel));
  audioCache.volume = clampedVolume;
  console.log(`🔊 Volume set to ${Math.round(clampedVolume * 100)}%`);
};

/**
 * Get current audio volume
 * @returns {number} Current volume (0 to 1)
 */
export const getVolume = () => {
  if (!audioCache) return 1.0;
  return audioCache.volume;
};

/**
 * Get audio duration
 * @returns {number} Duration in seconds
 */
export const getAudioDuration = () => {
  return audioDuration;
};

/**
 * Stop and pause audio
 */
export const stopAudio = () => {
  if (audioCache) {
    audioCache.pause();
    audioCache.currentTime = 0;
  }
};

/**
 * Pause audio
 */
export const pauseAudio = () => {
  if (audioCache) {
    audioCache.pause();
  }
};

/**
 * Get cached audio element
 * @returns {HTMLAudioElement}
 */
export const getAudioElement = () => {
  return audioCache;
};

/**
 * Clear audio cache
 */
export const clearAudioCache = () => {
  if (audioCache) {
    audioCache.pause();
    audioCache.src = "";
  }
  audioCache = null;
  audioDuration = null;
};

export default {
  preloadAudio,
  playAudio,
  getAudioDuration,
  stopAudio,
  pauseAudio,
  getAudioElement,
  setVolume,
  getVolume,
  clearAudioCache,
};
