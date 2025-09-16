import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing loading states with advanced features
 * @param {boolean} initialLoading - Initial loading state
 * @param {Object} options - Configuration options
 * @returns {Object} - Loading state and control functions
 */
const useLoading = (initialLoading = false, options = {}) => {
  const {
    minLoadingTime = 300, // Minimum time to show loading
    debounceTime = 100, // Debounce rapid loading state changes
    onLoadingStart,
    onLoadingEnd
  } = options;

  const [isLoading, setIsLoading] = useState(initialLoading);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingStartTime = useRef(null);
  const debounceTimer = useRef(null);
  const loadingPromises = useRef(new Set());

  // Start loading with optional message
  const startLoading = useCallback((message = '') => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (!isLoading) {
        loadingStartTime.current = Date.now();
        onLoadingStart?.();
      }
      setIsLoading(true);
      setLoadingMessage(message);
    }, debounceTime);
  }, [isLoading, debounceTime, onLoadingStart]);

  // Stop loading with minimum time enforcement
  const stopLoading = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const elapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
    const remainingTime = Math.max(0, minLoadingTime - elapsed);

    setTimeout(() => {
      setIsLoading(false);
      setLoadingMessage('');
      onLoadingEnd?.();
    }, remainingTime);
  }, [minLoadingTime, onLoadingEnd]);

  // Wrap async operations with loading state
  const withLoading = useCallback(async (asyncOperation, message = '') => {
    const promiseId = Symbol('loading-promise');
    loadingPromises.current.add(promiseId);
    
    try {
      startLoading(message);
      const result = await asyncOperation();
      return result;
    } catch (error) {
      throw error;
    } finally {
      loadingPromises.current.delete(promiseId);
      if (loadingPromises.current.size === 0) {
        stopLoading();
      }
    }
  }, [startLoading, stopLoading]);

  // Toggle loading state
  const toggleLoading = useCallback((message = '') => {
    if (isLoading) {
      stopLoading();
    } else {
      startLoading(message);
    }
  }, [isLoading, startLoading, stopLoading]);

  // Reset loading state
  const resetLoading = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    loadingPromises.current.clear();
    setIsLoading(false);
    setLoadingMessage('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading,
    toggleLoading,
    resetLoading,
    withLoading
  };
};

export default useLoading;