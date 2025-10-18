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
  const showSuccess = (title: string, message?: string) =>
    originalShowSuccess(title, message, cvId);

  const showError = (title: string, message?: string) =>
    originalShowError(title, message, cvId);

  const showWarning = (title: string, message?: string) =>
    originalShowWarning(title, message, cvId);

  const showInfo = (title: string, message?: string) =>
    originalShowInfo(title, message, cvId);

  const showValidationError = (title: string, message?: string) =>
    originalShowValidationError(title, message, cvId);

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
  const { notifications, ...rest } = useNotifications();

  // Filter notifications: show global (no cvId) + current CV notifications
  const filteredNotifications = notifications.filter(
    notification => !notification.cvId || notification.cvId === cvId
  );

  return {
    notifications: filteredNotifications,
    ...rest,
  };
};
