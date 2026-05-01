/**
 * Audio Service - Handles audio loading, caching, and playback for listening tests
 * Supports multiple test audio files with dynamic loading based on test_id
 */

import API_CONFIG from "../config/api";
import { apiClient } from "./api";
import { withParticipantAccess } from "../utils/participantAccess";

// Import all available audio files
import listeningAudio from "../pages/listening_test.mp3";
import listeningAudio3 from "../pages/listening_test3.mp3";

let audioCache = null;
let audioDuration = null;
let isPreloading = false;
let preloadPromise = null;
let currentTestId = null;
let currentAudioUrl = null;

/**
 * Get the audio file URL for a specific test
 * @param {number} testId - The test ID (2, 3, etc.)
 * @returns {string} - The audio file URL
 */
const getBundledAudioForTest = (testMaterialsId) => {
  switch (testMaterialsId) {
    case 2:
      return listeningAudio;
    case 3:
      return listeningAudio3;
    default:
      return null;
  }
};

const resolveAudioUrl = (audioUrl) => {
  if (!audioUrl) return audioUrl;
  if (audioUrl.startsWith("http")) return audioUrl;
  if (audioUrl.startsWith("/uploads")) {
    return `${API_CONFIG.BASE_URL}${audioUrl}`;
  }
  return audioUrl;
};

const getRemoteAudioUrl = async (testMaterialsId) => {
  try {
    const response = await apiClient.get(
      withParticipantAccess(`/api/materials/sets/${testMaterialsId}/audio`)
    );
    if (response?.audio_file_url) {
      return resolveAudioUrl(response.audio_file_url);
    }
  } catch (err) {
    return null;
  }
  return null;
};

const getAudioCandidatesForTest = async (testMaterialsId) => {
  const candidates = [];
  const remoteAudioUrl = await getRemoteAudioUrl(testMaterialsId);
  const bundledAudioUrl = getBundledAudioForTest(testMaterialsId);

  if (remoteAudioUrl) candidates.push(remoteAudioUrl);
  if (bundledAudioUrl) candidates.push(bundledAudioUrl);

  return candidates;
};

const disposeCachedAudio = () => {
  if (audioCache) {
    audioCache.pause();
    audioCache.src = "";
  }

  audioCache = null;
  audioDuration = null;
  currentAudioUrl = null;
};

const loadAudioElement = ({ audioUrl, test }) =>
  new Promise((resolve, reject) => {
    try {
      const audio = new Audio();

      audio.controlsList = "nodownload";
      if (audioUrl.startsWith("http")) {
        audio.crossOrigin = "anonymous";
      }

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("error", handleError);
      };

      const handleLoadedMetadata = () => {
        cleanup();
        resolve({
          duration: audio.duration,
          audio,
          audioUrl,
        });
      };

      const handleError = (e) => {
        cleanup();
        console.error(
          `✗ Audio loading error for test ${test}:`,
          e.type,
          "Source:",
          audioUrl
        );
        reject(new Error(`Failed to load audio from ${audioUrl}: ${e.type}`));
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
      audio.addEventListener("error", handleError, { once: true });
      audio.src = audioUrl;
      audio.load();
    } catch (err) {
      reject(err);
    }
  });

/**
 * Preload audio file with dev tools protection
 * Returns cached audio if already preloaded
 * @param {number} testId - The test ID (2, 3, etc.). If not provided, uses test from localStorage
 * @returns {Promise<{duration: number, audio: HTMLAudioElement}>}
 */
export const preloadAudio = async (testMaterialsId) => {
  let test = Number(testMaterialsId) || null;
  if (!test) {
    try {
      const participant = JSON.parse(
        localStorage.getItem("currentParticipant") || "{}"
      );
      test = Number(participant.test_materials_id) || null;
    } catch {
      test = null;
    }
  }

  if (!test) {
    throw new Error("No test materials are attached to this session.");
  }

  // If already preloading the same test, wait for that to complete
  if (isPreloading && currentTestId === test) {
    console.log("Audio preload already in progress, waiting...");
    return preloadPromise;
  }

  // If already preloaded the same test, return cached version
  if (audioCache && audioDuration && currentTestId === test) {
    console.log(
      `✓ Audio for test materials ${test} already cached. Duration: ${audioDuration.toFixed(
        2
      )}s`
    );
    return {
      duration: audioDuration,
      audio: audioCache,
    };
  }

  if (audioCache && currentTestId !== test) {
    disposeCachedAudio();
  }

  isPreloading = true;
  currentTestId = test;

  const audioCandidates = await getAudioCandidatesForTest(test);

  if (audioCandidates.length === 0) {
    isPreloading = false;
    currentTestId = null;
    throw new Error(`No audio file configured for test materials ${test}`);
  }

  preloadPromise = new Promise(async (resolve, reject) => {
    try {
      const errors = [];
      let loadedResult = null;

      for (const audioUrl of audioCandidates) {
        try {
          loadedResult = await loadAudioElement({ audioUrl, test });
          break;
        } catch (err) {
          errors.push(err.message);
        }
      }

      if (!loadedResult) {
        isPreloading = false;
        currentTestId = null;
        reject(
          new Error(
            `Failed to load audio for test materials ${test}. ${errors.join(
              " | "
            )}`
          )
        );
        return;
      }

      const { audio, audioUrl } = loadedResult;
      audioDuration = loadedResult.duration;
      audioCache = audio;
      currentAudioUrl = audioUrl;
      isPreloading = false;

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
        `✓ Audio for test ${test} preloaded successfully from ${audioUrl}. Duration: ${audioDuration.toFixed(
          2
        )}s`
      );

      resolve({
        duration: audioDuration,
        audio,
      });
    } catch (err) {
      isPreloading = false;
      currentTestId = null;
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
export const playAudio = async ({ restart = false } = {}) => {
  if (!audioCache) {
    throw new Error("Audio not preloaded. Call preloadAudio first.");
  }

  try {
    // Set initial volume to 1.0 (100%)
    audioCache.volume = 1.0;

    if (restart) {
      audioCache.currentTime = 0;
    }

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

export const getCurrentTestId = () => {
  return currentTestId;
};

export const getCurrentAudioUrl = () => {
  return currentAudioUrl;
};

/**
 * Clear audio cache
 */
export const clearAudioCache = () => {
  disposeCachedAudio();
  currentTestId = null;
  isPreloading = false;
  preloadPromise = null;
};

export default {
  preloadAudio,
  playAudio,
  getAudioDuration,
  stopAudio,
  pauseAudio,
  getAudioElement,
  getCurrentTestId,
  getCurrentAudioUrl,
  setVolume,
  getVolume,
  clearAudioCache,
};
