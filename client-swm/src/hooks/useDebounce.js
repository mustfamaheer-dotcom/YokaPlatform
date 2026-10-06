import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce values (e.g. search queries, text filters)
 * @param {any} value Value to debounce
 * @param {number} delay Delay in milliseconds (default 280ms)
 * @returns {any} Debounced value
 */
export default function useDebounce(value, delay = 280) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
