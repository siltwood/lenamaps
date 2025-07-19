import { useState, useCallback, useEffect } from 'react';

const MAX_HISTORY_SIZE = 50;

export const useUndoRedo = (initialState) => {
  const [currentState, setCurrentState] = useState(initialState);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Add a new state to history
  const addToHistory = useCallback((newState, action) => {
    setHistory(prev => {
      // If we're not at the end of history, remove everything after current index
      const newHistory = prev.slice(0, historyIndex + 1);
      
      // Add the current state with action info
      newHistory.push({
        state: structuredClone(currentState), // Deep clone the state
        action: action,
        timestamp: Date.now()
      });
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    setCurrentState(newState);
  }, [currentState, historyIndex]);

  // Undo to previous state
  const undo = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const previousEntry = history[historyIndex];
      setCurrentState(previousEntry.state);
      setHistoryIndex(prev => prev - 1);
      return previousEntry;
    }
    return null;
  }, [history, historyIndex]);

  // Redo to next state
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextEntry = history[nextIndex];
      
      // Apply the state after this entry
      if (nextIndex < history.length - 1) {
        setCurrentState(history[nextIndex + 1].state);
      } else {
        // This was the last action, we need to replay it
        // This requires the action to be reversible/replayable
        return null; // For now, we'll handle this in the component
      }
      
      setHistoryIndex(nextIndex);
      return nextEntry;
    }
    return null;
  }, [history, historyIndex]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Get undo/redo availability
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Get action descriptions for UI
  const getUndoDescription = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      return history[historyIndex].action;
    }
    return null;
  }, [history, historyIndex]);

  const getRedoDescription = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      return history[historyIndex + 1].action;
    }
    return null;
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }
      
      // Cmd/Ctrl + Shift + Z for redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  return {
    currentState,
    setCurrentState,
    addToHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    getUndoDescription,
    getRedoDescription,
    historySize: history.length,
    historyIndex
  };
};

// Action type constants
export const UNDO_ACTIONS = {
  ADD_LOCATION: 'ADD_LOCATION',
  REMOVE_LOCATION: 'REMOVE_LOCATION',
  CLEAR_LOCATION: 'CLEAR_LOCATION',
  CHANGE_MODE: 'CHANGE_MODE',
  DRAG_ROUTE: 'DRAG_ROUTE',
  ADD_STOP: 'ADD_STOP',
  REORDER_LOCATIONS: 'REORDER_LOCATIONS',
  CLEAR_ALL: 'CLEAR_ALL'
};

// Helper to create action descriptions
export const createActionDescription = (type, details) => {
  switch (type) {
    case UNDO_ACTIONS.ADD_LOCATION:
      return { type, description: `Add location ${details.label}`, ...details };
    case UNDO_ACTIONS.REMOVE_LOCATION:
      return { type, description: `Remove location ${details.label}`, ...details };
    case UNDO_ACTIONS.CLEAR_LOCATION:
      return { type, description: `Clear location ${details.label}`, ...details };
    case UNDO_ACTIONS.CHANGE_MODE:
      return { type, description: `Change ${details.from} → ${details.to} to ${details.mode}`, ...details };
    case UNDO_ACTIONS.DRAG_ROUTE:
      return { type, description: `Drag route ${details.segment}`, ...details };
    case UNDO_ACTIONS.ADD_STOP:
      return { type, description: `Add stop after ${details.after}`, ...details };
    case UNDO_ACTIONS.CLEAR_ALL:
      return { type, description: 'Clear all locations', ...details };
    default:
      return { type, description: 'Unknown action', ...details };
  }
};