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

import { useState, useEffect, useRef, useCallback } from "react";
import { useAIStore } from "../stores/ai";
import { useAISuggestionsStore } from "../stores/aiSuggestionsStore";
import { useCVQualityStore } from "../stores/cvQualityStore";
import { useNotifications } from "../packages/notifications";
import { useAuth } from "../contexts/AuthContext";
import { POLLING_CONFIG } from "../config/constants";
import { Logger } from "../utils/logger";
import { playAudioNotification } from "../utils/audioNotification";
import { setTitleNotification, isPageHidden } from "../utils/titleNotification";

export interface AITask {
  id: string;
  type: "draft" | "ai_enhancement" | "cv_quality_analysis";
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
const ACTIVE_TASKS_STORAGE_KEY = "cv_optimizer_active_ai_tasks";

export const useAITaskPolling = (
  options: UseAITaskPollingOptions = {},
): UseAITaskPollingReturn => {
  const {
    onTaskComplete,
    onTaskError,
    pollingInterval = POLLING_CONFIG.AI_TASK_INTERVAL,
  } = options;

  const [activeTasks, setActiveTasks] = useState<Map<string, AITask>>(() => {
    if (typeof window !== "undefined") {
      const storedTasks = localStorage.getItem(ACTIVE_TASKS_STORAGE_KEY);
      if (storedTasks) {
        try {
          const parsedTasks = JSON.parse(storedTasks);
          const tasksMap = new Map(
            parsedTasks.map((task: AITask) => [task.id, task]),
          );
          return tasksMap;
        } catch (e) {
          Logger.error("Failed to parse stored AI tasks", { error: e });
          return new Map();
        }
      }
    }
    return new Map();
  });
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to always access latest activeTasks without stale closure
  const activeTasksRef = useRef<Map<string, AITask>>(activeTasks);

  const { updateDraftStatus } = useAIStore();
  const { updateAIEnhancementStatus } = useAISuggestionsStore();
  const { updateQualityAnalysisStatus } = useCVQualityStore();
  const { showError } = useNotifications();
  const { isAuthenticated } = useAuth();

  // Use refs for callbacks to avoid re-creating interval
  const onTaskCompleteRef = useRef(onTaskComplete);
  const onTaskErrorRef = useRef(onTaskError);
  const showErrorRef = useRef(showError);

  useEffect(() => {
    onTaskCompleteRef.current = onTaskComplete;
    onTaskErrorRef.current = onTaskError;
    showErrorRef.current = showError;
  }, [onTaskComplete, onTaskError, showError]);

  // Keep ref in sync with state
  useEffect(() => {
    activeTasksRef.current = activeTasks;
  }, [activeTasks]);

  // Persist active tasks to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tasksArray = Array.from(activeTasks.values());
      localStorage.setItem(
        ACTIVE_TASKS_STORAGE_KEY,
        JSON.stringify(tasksArray),
      );
    }
  }, [activeTasks]);

  // Store pollTasks in a ref so the interval always calls the latest version
  const pollTasksRef = useRef<() => Promise<void>>();

  const pollTasks = useCallback(async () => {
    // Don't poll if user is not authenticated
    if (!isAuthenticated) {
      // Clear all tasks when user is not authenticated
      setActiveTasks(new Map());
      activeTasksRef.current = new Map();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
      return;
    }

    // Use ref to get latest tasks, avoiding stale closure
    // CRITICAL: Always use ref.current to get the absolute latest tasks
    const currentTasks = activeTasksRef.current;
    const tasksArray = Array.from(currentTasks.values());
    const tasksToUpdate = tasksArray.filter(
      (task) => task.isGenerating,
    );

    if (tasksToUpdate.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
      return;
    }

    const newActiveTasks = new Map(currentTasks);
    let anyTaskStillGenerating = false;

    for (const task of tasksToUpdate) {
      try {
        let updatedTaskData: any;
        if (task.type === "draft") {
          updatedTaskData = await updateDraftStatus(task.id);
        } else if (task.type === "ai_enhancement") {
          updatedTaskData = await updateAIEnhancementStatus(task.id);
        } else if (task.type === "cv_quality_analysis") {
          updatedTaskData = await updateQualityAnalysisStatus(task.id);
        } else {
          continue; // Skip unknown task types
        }

        if (!updatedTaskData.is_generating) {
          // Task completed - check if it completed with an error
          const hasError = !!updatedTaskData.generation_error;
          const completedTask = {
            ...task,
            isGenerating: false,
            data: updatedTaskData,
            generationError: updatedTaskData.generation_error,
          };
          newActiveTasks.set(task.id, completedTask);

          if (hasError) {
            // Task failed - trigger error handling
            const errorMessage =
              updatedTaskData.generation_error || "AI task failed";
            onTaskErrorRef.current?.(completedTask, errorMessage);
            showErrorRef.current("AI Task Failed", errorMessage);
          } else {
            // Task completed successfully
            onTaskCompleteRef.current?.(completedTask);

            // Show browser tab notification if page is hidden
            if (isPageHidden()) {
              let notificationMessage = "Task completed";
              if (task.type === "cv_quality_analysis") {
                notificationMessage = "CV Quality Analysis Ready";
              } else if (task.type === "draft") {
                notificationMessage = "AI Draft Ready";
              } else if (task.type === "ai_enhancement") {
                notificationMessage = "AI Enhancement Ready";
              }
              setTitleNotification(notificationMessage);
            }

            // Play audio notification
            playAudioNotification().catch((err) => {
              // Silently handle errors - audio notification is non-critical
              Logger.info("Audio notification failed", { error: err });
            });
          }
        } else {
          // Task still generating
          newActiveTasks.set(task.id, {
            ...task,
            data: updatedTaskData,
            generationError: updatedTaskData.generation_error,
          });
          anyTaskStillGenerating = true;
        }
      } catch (error: any) {
        Logger.error("Failed to update AI task", {
          taskId: task.id,
          taskType: task.type,
          error: error.message,
        });

        // Detect network/connection errors
        const isNetworkError =
          error.message === "Network Error" ||
          error.code === "ERR_NETWORK" ||
          error.code === "ECONNREFUSED" ||
          error.message?.includes("ERR_CONNECTION_REFUSED") ||
          error.message?.includes("Failed to fetch");

        if (isNetworkError) {
          // For network errors, keep task as generating so we can retry when backend comes back
          // The backend will have cancelled the task on startup, so next successful poll will show the cancellation error
          newActiveTasks.set(task.id, {
            ...task,
            // Keep isGenerating as true so polling continues
            data: task.data,
          });
          anyTaskStillGenerating = true; // Keep polling active
          // Don't show error notification yet - wait for backend to come back and show the actual cancellation error
        } else {
          // For non-network errors, mark task as failed
          const errorMessage = error.error || error.message || "Unknown error";
          const failedTask = {
            ...task,
            isGenerating: false,
            generationError: errorMessage,
          };
          newActiveTasks.set(task.id, failedTask);
          onTaskErrorRef.current?.(failedTask, errorMessage);
          showErrorRef.current("AI Task Failed", errorMessage);
        }
      }
    }

    setActiveTasks(newActiveTasks);
    // Update ref immediately so next poll uses latest state
    activeTasksRef.current = newActiveTasks;

    if (!anyTaskStillGenerating && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
  }, [
    updateDraftStatus,
    updateAIEnhancementStatus,
    updateQualityAnalysisStatus,
    isAuthenticated,
  ]);

  // Update ref whenever pollTasks changes
  // Initialize immediately and keep it updated
  pollTasksRef.current = pollTasks;
  useEffect(() => {
    pollTasksRef.current = pollTasks;
  }, [pollTasks]);

  const startPolling = useCallback(() => {
    // Clear existing interval if it exists (handles pollingInterval changes)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsPolling(true);
    // Ensure pollTasksRef is initialized before starting interval
    if (!pollTasksRef.current) {
      pollTasksRef.current = pollTasks;
    }
    // Use ref-based callback so it always calls latest version
    pollingIntervalRef.current = setInterval(() => {
      if (pollTasksRef.current) {
        pollTasksRef.current();
      }
    }, pollingInterval);
    // Trigger immediate poll to include any tasks that were just added
    if (pollTasksRef.current) {
      pollTasksRef.current();
    }
  }, [pollingInterval, pollTasks, isAuthenticated]); // Include pollTasks to ensure ref is set

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const addTask = useCallback(
    (task: AITask) => {
      // CRITICAL: Update ref FIRST before state update to ensure immediate poll sees the task
      const newMap = new Map(activeTasksRef.current);

      // When adding a new cv_quality_analysis task, remove any existing one for the same cvId
      // so we only poll the new analysis ID (avoids 404 after "Improve my CV again" deletes old analyses)
      if (task.type === "cv_quality_analysis" && task.cvId) {
        for (const [id, t] of newMap.entries()) {
          if (
            t.type === "cv_quality_analysis" &&
            t.cvId === task.cvId &&
            id !== task.id
          ) {
            newMap.delete(id);
            break;
          }
        }
      }

      newMap.set(task.id, task);
      activeTasksRef.current = newMap;

      // Then update state (for React re-renders)
      setActiveTasks(newMap);

      // Always ensure polling is active
      if (!pollingIntervalRef.current) {
        startPolling();
      } else {
        // Trigger immediate poll to include new task
        if (pollTasksRef.current) {
          pollTasksRef.current();
        }
      }
    },
    [startPolling],
  );

  const removeTask = useCallback((taskId: string) => {
    setActiveTasks((prev) => {
      // Avoid unnecessary state updates that can cause render loops
      if (!prev.has(taskId)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.delete(taskId);
      // Update ref immediately
      activeTasksRef.current = newMap;
      return newMap;
    });
  }, []);

  // Effect 1: Handle authentication state changes
  // Clear tasks and stop polling when user is not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTasks(new Map());
      activeTasksRef.current = new Map();
      stopPolling();
    }
  }, [isAuthenticated, stopPolling]);

  // Effect 2: Start/stop polling based on active generating tasks
  // This effect watches activeTasks and ensures polling starts when tasks are added
  useEffect(() => {
    if (!isAuthenticated) {
      return; // Don't start polling if not authenticated
    }

    const hasGeneratingTasks = Array.from(activeTasks.values()).some(
      (task) => task.isGenerating,
    );

    if (hasGeneratingTasks && !pollingIntervalRef.current) {
      startPolling();
    } else if (!hasGeneratingTasks && pollingIntervalRef.current) {
      stopPolling();
    }
  }, [activeTasks, isAuthenticated, startPolling, stopPolling]);

  return { activeTasks, isPolling, addTask, removeTask, stopPolling };
};
