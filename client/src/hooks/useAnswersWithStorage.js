import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook to manage test answers with localStorage persistence
 * Automatically saves answers to localStorage and restores them on page refresh
 *
 * @param {string} storageKey - The localStorage key to use (e.g., "listening_answers", "reading_answers", "writing_answers")
 * @param {object} initialValue - The initial value if no localStorage data exists (default: {})
 * @returns {array} [answers, setAnswers] - Same as useState
 */
const useAnswersWithStorage = (storageKey, initialValue = {}) => {
  // Initialize with localStorage data if available, otherwise use initialValue
  const [answers, setAnswers] = useState(() => {
    try {
      const storedAnswers = localStorage.getItem(storageKey);
      return storedAnswers ? JSON.parse(storedAnswers) : initialValue;
    } catch (error) {
      console.error(`Error parsing stored answers from ${storageKey}:`, error);
      return initialValue;
    }
  });

  // Save answers to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
      console.log(`Saved answers to ${storageKey}`);
    } catch (error) {
      console.error(`Error saving answers to ${storageKey}:`, error);
    }
  }, [answers, storageKey]);

  return [answers, setAnswers];
};

export default useAnswersWithStorage;
