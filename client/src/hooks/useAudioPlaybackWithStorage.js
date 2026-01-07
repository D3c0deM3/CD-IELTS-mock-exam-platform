import { useState, useEffect } from "react";

/**
 * Custom hook to manage audio playback state with localStorage persistence
 * Automatically saves audio current time and playing state
 * Restores playback position on page refresh
 *
 * @param {string} storageKey - The localStorage key to use (e.g., "listening_audio_state")
 * @returns {object} { audioCurrentTime, setAudioCurrentTime, isPlayingStored, setIsPlayingStored }
 */
const useAudioPlaybackWithStorage = (storageKey = "listening_audio_state") => {
  // Initialize audio state from localStorage
  const [audioCurrentTime, setAudioCurrentTime] = useState(() => {
    try {
      const storedState = localStorage.getItem(storageKey);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        return parsed.currentTime || 0;
      }
      return 0;
    } catch (error) {
      console.error(
        `Error parsing stored audio state from ${storageKey}:`,
        error
      );
      return 0;
    }
  });

  const [isPlayingStored, setIsPlayingStored] = useState(() => {
    try {
      const storedState = localStorage.getItem(storageKey);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        return parsed.isPlaying || false;
      }
      return false;
    } catch (error) {
      console.error(
        `Error parsing stored audio state from ${storageKey}:`,
        error
      );
      return false;
    }
  });

  // Save audio state to localStorage whenever it changes
  useEffect(() => {
    try {
      const audioState = {
        currentTime: audioCurrentTime,
        isPlaying: isPlayingStored,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(audioState));
    } catch (error) {
      console.error(`Error saving audio state to ${storageKey}:`, error);
    }
  }, [audioCurrentTime, isPlayingStored, storageKey]);

  // Return object with setters wrapped to also handle the state updates
  return {
    audioCurrentTime,
    setAudioCurrentTime,
    isPlayingStored,
    setIsPlayingStored,
  };
};

export default useAudioPlaybackWithStorage;
