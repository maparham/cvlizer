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
import {
  setPersistedCorrectionMode,
  clearPersistedCorrectionMode,
} from "../stores/cvQualityPersistence";
import { useNotificationStore } from "../packages/notifications/store";
import { useAuth } from "../contexts/AuthContext";
import { POLLING_CONFIG } from "../config/constants";
import { Logger } from "../utils/logger";
import { playAudioNotification } from "../utils/audioNotification";
import { setTitleNotification, isPageHidden } from "../utils/titleNotification";
import { getCompletionNotification } from "../utils/aiTaskCompletionNotifications";

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
  // Reentrancy guard: prevents a new tick from starting while the previous
  // pollTasks() is still awaiting (a slow poll could otherwise cause duplicate
  // completion callbacks/toasts).
  const isPollInFlightRef = useRef(false);
  // Per-task consecutive network-error counter, to cap retries when the backend
  // is unreachable instead of polling forever.
  const networkErrorCountsRef = useRef<Map<string, number>>(new Map());

  const { updateDraftStatus } = useAIStore();
  const { updateAIEnhancementStatus } = useAISuggestionsStore();
  const { updateQualityAnalysisStatus } = useCVQualityStore();
  const { showError, showInfo } = useNotificationStore();
  const { isAuthenticated } = useAuth();

  // Use refs for callbacks to avoid re-creating interval
  const onTaskCompleteRef = useRef(onTaskComplete);
  const onTaskErrorRef = useRef(onTaskError);
  const showErrorRef = useRef(showError);
  const showInfoRef = useRef(showInfo);

  useEffect(() => {
    onTaskCompleteRef.current = onTaskComplete;
    onTaskErrorRef.current = onTaskError;
    showErrorRef.current = showError;
    showInfoRef.current = showInfo;
  }, [onTaskComplete, onTaskError, showError, showInfo]);

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

        // Successful poll - reset consecutive network-error counter for this task
        networkErrorCountsRef.current.delete(task.id);

        if (!updatedTaskData.is_generating) {
          if (task.type === "cv_quality_analysis") {
            clearPersistedCorrectionMode(task.id);
          }
          // Check if it completed with an error
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

            const { toast, tabMessage } = getCompletionNotification(
              task,
              updatedTaskData
            );
            if (toast) {
              showInfoRef.current(toast.title, toast.message, toast.cvId);
            }

            // Show browser tab notification if page is hidden
            if (isPageHidden()) {
              setTitleNotification(tabMessage);
            }

            // Play audio notification
            playAudioNotification().catch((err) => {
              // Silently handle errors - audio notification is non-critical
              Logger.info("Audio notification failed", { error: err });
            });
          }
        } else {
          // Task still generating - preserve correctionMode (polling overwrites data with API response)
          const preservedCorrectionMode =
            task.type === "cv_quality_analysis" && task.data?.correctionMode;
          newActiveTasks.set(task.id, {
            ...task,
            data: {
              ...updatedTaskData,
              ...(preservedCorrectionMode && {
                correctionMode: preservedCorrectionMode,
              }),
            },
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
          // Track consecutive network errors so we don't poll forever if the
          // backend never comes back.
          const consecutiveErrors =
            (networkErrorCountsRef.current.get(task.id) ?? 0) + 1;

          if (consecutiveErrors > POLLING_CONFIG.MAX_RETRIES) {
            // Exceeded the retry ceiling - stop treating this task as generating
            // and surface a generation error instead of polling indefinitely.
            networkErrorCountsRef.current.delete(task.id);
            const errorMessage =
              "Unable to reach the server. Please check your connection and try again.";
            const failedTask = {
              ...task,
              isGenerating: false,
              generationError: errorMessage,
            };
            newActiveTasks.set(task.id, failedTask);
            onTaskErrorRef.current?.(failedTask, errorMessage);
            showErrorRef.current("AI Task Failed", errorMessage);
          } else {
            // Within the retry cap: keep task as generating so we can retry when
            // the backend comes back. The backend will have cancelled the task on
            // startup, so the next successful poll will show the cancellation error.
            networkErrorCountsRef.current.set(task.id, consecutiveErrors);
            newActiveTasks.set(task.id, {
              ...task,
              // Keep isGenerating as true so polling continues
              data: task.data,
            });
            anyTaskStillGenerating = true; // Keep polling active
            // Don't show error notification yet - wait for backend to come back
            // and show the actual cancellation error.
          }
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
  useEffect(() => {
    pollTasksRef.current = pollTasks;
  }, [pollTasks]);

  // Guarded invoker: runs the latest pollTasks but skips the call entirely while
  // a previous poll is still in flight, preventing overlapping polls (and the
  // duplicate completion callbacks/toasts they would cause).
  const runPollGuarded = useCallback(() => {
    if (isPollInFlightRef.current) {
      return;
    }
    const fn = pollTasksRef.current;
    if (!fn) {
      return;
    }
    isPollInFlightRef.current = true;
    void Promise.resolve(fn()).finally(() => {
      isPollInFlightRef.current = false;
    });
  }, []);

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
    // Use ref-based, reentrancy-guarded callback so it always calls the latest
    // version and never overlaps with an in-flight poll.
    pollingIntervalRef.current = setInterval(() => {
      runPollGuarded();
    }, pollingInterval);
    // Trigger immediate poll to include any tasks that were just added
    runPollGuarded();
  }, [pollingInterval, pollTasks, isAuthenticated, runPollGuarded]); // Include pollTasks to ensure ref is set

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

      // When resuming (e.g. after page reload), preserve existing task data (e.g. correctionMode)
      // so loading state survives reload
      const existing = newMap.get(task.id);
      const taskToAdd =
        existing?.data && !task.data
          ? { ...task, data: existing.data }
          : task;

      // Persist correctionMode so it survives page reload (auth may clear activeTasks)
      if (
        taskToAdd.type === "cv_quality_analysis" &&
        taskToAdd.data?.correctionMode
      ) {
        setPersistedCorrectionMode(task.id, taskToAdd.data.correctionMode);
      }

      newMap.set(task.id, taskToAdd);
      activeTasksRef.current = newMap;

      // Then update state (for React re-renders)
      setActiveTasks(newMap);

      // Always ensure polling is active
      if (!pollingIntervalRef.current) {
        startPolling();
      } else {
        // Trigger immediate poll to include new task
        runPollGuarded();
      }
    },
    [startPolling, runPollGuarded],
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

  // Effect 3: Cleanup on unmount only.
  // A direct consumer unmounting mid-generation would otherwise leak the
  // setInterval. Kept in a mount-only effect (empty deps) so it does NOT run on
  // every activeTasks change (which would tear down and recreate the interval
  // on each poll). Clears the ref directly to avoid a setState on an unmounting
  // component.
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  return { activeTasks, isPolling, addTask, removeTask, stopPolling };
};
