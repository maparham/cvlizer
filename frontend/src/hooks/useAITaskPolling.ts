/**
 * Custom hook for AI task polling
 * 
 * This hook centralizes the polling logic for AI task status updates,
 * providing a consistent interface for both job fit analysis and content enhancement.
 * 
 * Key responsibilities:
 * - Poll for AI task completion (drafts and content enhancements)
 * - Handle task errors and success states
 * - Provide loading states and error handling
 * - Clean up polling intervals on unmount
 * - Persist polling state across page refreshes
 * 
 * Usage:
 * - Import in components that need to track AI task progress
 * - Pass task IDs and optional callbacks
 * - Hook returns task state and utility functions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAIStore } from '../stores/aiStore';
import { useAISuggestionsStore } from '../stores/aiSuggestionsStore';
import { useNotifications } from '../stores/uiStore';
import { POLLING_CONFIG, STORAGE_KEYS } from '../config/constants';

export interface AITask {
  id: string;
  type: 'draft' | 'content_enhancement' | 'ai_enhancement';
  cvId: string;
  isGenerating: boolean;
  generationError?: string;
  data?: any;
}

interface UseAITaskPollingOptions {
  onTaskComplete?: (task: AITask) => void;
  onTaskError?: (task: AITask, error: string) => void;
  pollingInterval?: number;
}

interface UseAITaskPollingReturn {
  activeTasks: Map<string, AITask>;
  isPolling: boolean;
  addTask: (task: AITask) => void;
  removeTask: (taskId: string) => void;
  stopPolling: () => void;
}

// Local storage key for persisting active tasks
const ACTIVE_TASKS_STORAGE_KEY = 'cv_optimizer_active_ai_tasks';

export const useAITaskPolling = (
  options: UseAITaskPollingOptions = {}
): UseAITaskPollingReturn => {
  const {
    onTaskComplete,
    onTaskError,
    pollingInterval = POLLING_CONFIG.AI_TASK_INTERVAL,
  } = options;

  const [activeTasks, setActiveTasks] = useState<Map<string, AITask>>(() => {
    if (typeof window !== 'undefined') {
      const storedTasks = localStorage.getItem(ACTIVE_TASKS_STORAGE_KEY);
      if (storedTasks) {
        try {
          const parsedTasks = JSON.parse(storedTasks);
          const tasksMap = new Map(parsedTasks.map((task: AITask) => [task.id, task]));
          return tasksMap;
        } catch (e) {
          console.error("Failed to parse stored AI tasks:", e);
          return new Map();
        }
      }
    }
    return new Map();
  });
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { updateDraftStatus, updateContentEnhancementStatus } = useAIStore();
  const { updateAIEnhancementStatus } = useAISuggestionsStore();
  const { showError } = useNotifications();
  
  // Use refs for callbacks to avoid re-creating interval
  const onTaskCompleteRef = useRef(onTaskComplete);
  const onTaskErrorRef = useRef(onTaskError);
  const showErrorRef = useRef(showError);

  useEffect(() => {
    onTaskCompleteRef.current = onTaskComplete;
    onTaskErrorRef.current = onTaskError;
    showErrorRef.current = showError;
  }, [onTaskComplete, onTaskError, showError]);

  // Persist active tasks to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tasksArray = Array.from(activeTasks.values());
      localStorage.setItem(ACTIVE_TASKS_STORAGE_KEY, JSON.stringify(tasksArray));
    }
  }, [activeTasks]);

  const pollTasks = useCallback(async () => {
    const tasksToUpdate = Array.from(activeTasks.values()).filter(task => task.isGenerating);
    const newActiveTasks = new Map(activeTasks);
    let anyTaskStillGenerating = false;

    for (const task of tasksToUpdate) {
      try {
        let updatedTaskData: any;
        if (task.type === 'draft') {
          updatedTaskData = await updateDraftStatus(task.id);
        } else if (task.type === 'content_enhancement') {
          updatedTaskData = await updateContentEnhancementStatus(task.id);
        } else if (task.type === 'ai_enhancement') {
          updatedTaskData = await updateAIEnhancementStatus(task.id);
        } else {
          continue; // Skip unknown task types
        }

        if (!updatedTaskData.is_generating) {
          // Task completed
          const completedTask = { ...task, isGenerating: false, data: updatedTaskData, generationError: updatedTaskData.generation_error };
          newActiveTasks.set(task.id, completedTask);
          onTaskCompleteRef.current?.(completedTask);
        } else {
          // Task still generating
          newActiveTasks.set(task.id, { ...task, data: updatedTaskData, generationError: updatedTaskData.generation_error });
          anyTaskStillGenerating = true;
        }
      } catch (error: any) {
        console.error(`Failed to update task ${task.id}:`, error);
        const errorMessage = error.error || error.message || 'Unknown error';
        const failedTask = { ...task, isGenerating: false, generationError: errorMessage };
        newActiveTasks.set(task.id, failedTask);
        onTaskErrorRef.current?.(failedTask, errorMessage);
        showErrorRef.current('AI Task Failed', `Task ${task.id} failed: ${errorMessage}`);
      }
    }

    setActiveTasks(newActiveTasks);

    if (!anyTaskStillGenerating && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
  }, [activeTasks, updateDraftStatus, updateContentEnhancementStatus, updateAIEnhancementStatus]);

  const startPolling = useCallback(() => {
    if (!pollingIntervalRef.current) {
      setIsPolling(true);
      pollingIntervalRef.current = setInterval(pollTasks, pollingInterval);
    }
  }, [pollTasks, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const addTask = useCallback((task: AITask) => {
    setActiveTasks(prev => {
      const newMap = new Map(prev);
      newMap.set(task.id, task);
      return newMap;
    });
    startPolling();
  }, [startPolling]);

  const removeTask = useCallback((taskId: string) => {
    setActiveTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
  }, []);

  // Resume polling on component mount if there are active tasks
  useEffect(() => {
    const hasGeneratingTasks = Array.from(activeTasks.values()).some(task => task.isGenerating);
    if (hasGeneratingTasks) {
      startPolling();
    }
    return () => stopPolling();
  }, [startPolling, stopPolling, activeTasks]);

  return { activeTasks, isPolling, addTask, removeTask, stopPolling };
};