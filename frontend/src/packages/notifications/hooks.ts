/**
 * Notification Hooks
 *
 * This module provides custom hooks for the notification system.
 * It wraps the notification store and provides convenient access patterns.
 *
 * Key Features:
 * - Automatic CV context injection via CVContext
 * - CV-specific notification filtering
 * - Persistent notifications with localStorage
 * - Auto-expiration after 1 day
 * - 50 notification limit per CV
 */

import { useCallback } from "react";
import { useNotificationStore } from "./store";
import { useCVContext } from "../../contexts/CVContext";

/**
 * Hook for accessing notification state and actions.
 *
 * Automatically injects cvId from CVContext (if available) for CV-specific notifications.
 * When used inside CVProvider, all notifications are automatically associated with that CV.
 * When used outside CVProvider (e.g., Dashboard), notifications are global.
 *
 * @returns Notification store state and actions with auto-injected cvId
 */
export const useNotifications = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markNotificationAsShown,
    showSuccess: originalShowSuccess,
    showError: originalShowError,
    showWarning: originalShowWarning,
    showInfo: originalShowInfo,
    showValidationError: originalShowValidationError,
  } = useNotificationStore();

  // Get current CV ID from context (if available)
  const { cvId } = useCVContext();

  // Wrap convenience methods to automatically inject cvId from context
  const showSuccess = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalShowSuccess(title, message, cvId, toastOnly),
    [originalShowSuccess, cvId],
  );

  const showError = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalShowError(title, message, cvId, toastOnly),
    [originalShowError, cvId],
  );

  const showWarning = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalShowWarning(title, message, cvId, toastOnly),
    [originalShowWarning, cvId],
  );

  const showInfo = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalShowInfo(title, message, cvId, toastOnly),
    [originalShowInfo, cvId],
  );

  const showValidationError = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalShowValidationError(title, message, cvId, toastOnly),
    [originalShowValidationError, cvId],
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markNotificationAsShown,
    // Convenience methods with auto-injected cvId
    showSuccess,
    showError,
    showValidationError,
    showWarning,
    showInfo,
  };
};

/**
 * Hook for accessing CV-specific notifications with explicit filtering.
 *
 * This hook is typically used in CVEditor where you want to explicitly
 * filter notifications by a specific CV ID (usually from route params).
 *
 * Note: The underlying useNotifications() already injects cvId from context,
 * so this hook is mainly used for filtering the notification list display.
 *
 * @param cvId - CV ID to filter notifications (shows global + this CV only)
 * @returns Filtered notifications and actions
 */
export const useCVNotifications = (cvId?: string) => {
  // Get store methods directly, not through useNotifications() to avoid CVContext issues
  const {
    notifications,
    addNotification: originalAddNotification,
    removeNotification,
    clearNotifications,
    markNotificationAsShown,
  } = useNotificationStore();

  // Create convenience methods that use explicit cvId directly
  const showSuccess = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalAddNotification({ type: "success", title, message, toastOnly }, cvId),
    [originalAddNotification, cvId],
  );

  const showError = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalAddNotification({ type: "error", title, message, toastOnly }, cvId),
    [originalAddNotification, cvId],
  );

  const showWarning = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalAddNotification({ type: "warning", title, message, toastOnly }, cvId),
    [originalAddNotification, cvId],
  );

  const showInfo = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalAddNotification({ type: "info", title, message, toastOnly }, cvId),
    [originalAddNotification, cvId],
  );

  const showValidationError = useCallback(
    (title: string, message?: string, toastOnly?: boolean) =>
      originalAddNotification({ type: "error", title, message, persistent: true, toastOnly }, cvId),
    [originalAddNotification, cvId],
  );

  // Wrapper for addNotification that uses explicit cvId
  const addNotification = (notification: any, cvIdParam?: string) =>
    originalAddNotification(notification, cvIdParam || cvId);

  // Filter notifications: show notifications for the current CV
  // If no cvId provided, show all notifications (for Dashboard)
  const filteredNotifications = cvId
    ? notifications.filter(notification => notification.cvId === cvId)
    : notifications;

  return {
    notifications: filteredNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markNotificationAsShown,
    showSuccess,
    showError,
    showValidationError,
    showWarning,
    showInfo,
  };
};
