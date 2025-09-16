import React, { createContext, useContext, useReducer, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// Loading action types
const LOADING_ACTIONS = {
  START_LOADING: 'START_LOADING',
  STOP_LOADING: 'STOP_LOADING',
  SET_GLOBAL_LOADING: 'SET_GLOBAL_LOADING',
  CLEAR_ALL_LOADING: 'CLEAR_ALL_LOADING'
};

// Initial state
const initialState = {
  globalLoading: false,
  loadingStates: {}, // { key: { isLoading: boolean, message: string, startTime: number } }
  loadingQueue: [] // Array of loading operations
};

// Reducer function
const loadingReducer = (state, action) => {
  switch (action.type) {
    case LOADING_ACTIONS.START_LOADING:
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [action.key]: {
            isLoading: true,
            message: action.message || '',
            startTime: Date.now()
          }
        }
      };

    case LOADING_ACTIONS.STOP_LOADING:
      const { [action.key]: removed, ...remainingStates } = state.loadingStates;
      return {
        ...state,
        loadingStates: remainingStates
      };

    case LOADING_ACTIONS.SET_GLOBAL_LOADING:
      return {
        ...state,
        globalLoading: action.isLoading
      };

    case LOADING_ACTIONS.CLEAR_ALL_LOADING:
      return {
        ...state,
        globalLoading: false,
        loadingStates: {},
        loadingQueue: []
      };

    default:
      return state;
  }
};

// Create context
const LoadingContext = createContext();

// Provider component
export const LoadingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  // Start loading for a specific key
  const startLoading = useCallback((key, message = '') => {
    dispatch({
      type: LOADING_ACTIONS.START_LOADING,
      key,
      message
    });
  }, []);

  // Stop loading for a specific key
  const stopLoading = useCallback((key, minTime = 300) => {
    const loadingState = state.loadingStates[key];
    if (!loadingState) return;

    const elapsed = Date.now() - loadingState.startTime;
    const delay = Math.max(0, minTime - elapsed);

    setTimeout(() => {
      dispatch({
        type: LOADING_ACTIONS.STOP_LOADING,
        key
      });
    }, delay);
  }, [state.loadingStates]);

  // Set global loading state
  const setGlobalLoading = useCallback((isLoading) => {
    dispatch({
      type: LOADING_ACTIONS.SET_GLOBAL_LOADING,
      isLoading
    });
  }, []);

  // Clear all loading states
  const clearAllLoading = useCallback(() => {
    dispatch({ type: LOADING_ACTIONS.CLEAR_ALL_LOADING });
  }, []);

  // Check if any loading is active
  const isAnyLoading = Object.keys(state.loadingStates).length > 0 || state.globalLoading;

  // Check if specific key is loading
  const isLoading = useCallback((key) => {
    return Boolean(state.loadingStates[key]?.isLoading);
  }, [state.loadingStates]);

  // Get loading message for specific key
  const getLoadingMessage = useCallback((key) => {
    return state.loadingStates[key]?.message || '';
  }, [state.loadingStates]);

  // Wrap async operation with loading state
  const withLoading = useCallback(async (key, asyncOperation, message = '') => {
    try {
      startLoading(key, message);
      const result = await asyncOperation();
      return result;
    } catch (error) {
      throw error;
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  const value = {
    // State
    globalLoading: state.globalLoading,
    loadingStates: state.loadingStates,
    isAnyLoading,
    
    // Actions
    startLoading,
    stopLoading,
    setGlobalLoading,
    clearAllLoading,
    isLoading,
    getLoadingMessage,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {/* Global loading overlay */}
      {state.globalLoading && (
        <LoadingSpinner
          type="spinner"
          size="large"
          text="Loading..."
          fullScreen
        />
      )}
    </LoadingContext.Provider>
  );
};

// Custom hook to use loading context
export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;