/**
 * AI Task Completion Notifications
 *
 * Pure utility functions for generating notification content when AI tasks complete.
 * Centralizes task-type and correction-mode branching for completion notifications.
 */

import type { AITask } from "../hooks/useAITaskPolling";

/** Toast content for quality analysis completion; cvId used for notification filtering. */
export interface CompletionToast {
  title: string;
  message: string;
  cvId: string;
}

/**
 * Returns toast (title, message, cvId) and tab notification message for a completed task.
 * Centralizes task-type and correction-mode branching for completion notifications.
 */
export function getCompletionNotification(
  task: AITask,
  updatedTaskData: { quality_data?: { correction_mode?: string } }
): { toast?: CompletionToast; tabMessage: string } {
  if (task.type === "cv_quality_analysis") {
    const correctionMode =
      task.data?.correctionMode ?? updatedTaskData?.quality_data?.correction_mode;
    const isProofread = correctionMode === "proofread";
    const isCoaching = correctionMode === "coaching";
    const tabMessage = "CV Quality Analysis Ready";
    if (isProofread) {
      return {
        toast: {
          title: "Spelling & Grammar Check Complete",
          message: "Review corrections in the CV sections",
          cvId: task.cvId,
        },
        tabMessage,
      };
    }
    if (isCoaching) {
      return {
        toast: {
          title: "Writing Style Analysis Complete",
          message: "Review suggestions to improve your CV",
          cvId: task.cvId,
        },
        tabMessage,
      };
    }
    return { tabMessage };
  }
  if (task.type === "draft") return { tabMessage: "AI Draft Ready" };
  if (task.type === "ai_enhancement") return { tabMessage: "AI Enhancement Ready" };
  return { tabMessage: "Task completed" };
}
