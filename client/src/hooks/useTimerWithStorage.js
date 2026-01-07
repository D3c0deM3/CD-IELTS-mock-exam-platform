import { useState, useEffect } from "react";

/**
 * Custom hook to manage timer state with localStorage persistence
 * Automatically saves remaining time and restores it on page refresh
 * Useful for tests where timer should resume from where it left off
 *
 * @param {number} initialTime - The initial time in seconds (e.g., 30*60 for 30 minutes)
 * @param {string} storageKey - The localStorage key to use (e.g., "listening_timer")
 * @returns {array} [timeRemaining, setTimeRemaining] - Same as useState
 */
const useTimerWithStorage = (initialTime, storageKey = "listening_timer") => {
  // Initialize timer with localStorage data if available
  const [timeRemaining, setTimeRemaining] = useState(() => {
    try {
      const storedTime = localStorage.getItem(storageKey);
      if (storedTime) {
        const parsedTime = parseInt(storedTime, 10);
        // Only restore if it's a valid positive number and not more than initial
        if (!isNaN(parsedTime) && parsedTime > 0 && parsedTime <= initialTime) {
          console.log(`⏱️ Timer restored from storage: ${parsedTime}s`);
          return parsedTime;
        }
      }
      return initialTime;
    } catch (error) {
      console.error(`Error parsing stored timer from ${storageKey}:`, error);
      return initialTime;
    }
  });

  // Save timer to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(timeRemaining));
    } catch (error) {
      console.error(`Error saving timer to ${storageKey}:`, error);
    }
  }, [timeRemaining, storageKey]);

  return [timeRemaining, setTimeRemaining];
};

export default useTimerWithStorage;
