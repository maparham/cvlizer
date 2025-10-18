/**
 * Notifications Package
 *
 * This package provides a complete notification system for React applications.
 * It includes components, state management, utilities, and hooks for handling
 * user notifications with grouping, persistence, CV-specific filtering, and toast previews.
 *
 * Features:
 * - CV-specific notifications with automatic context injection
 * - Notification grouping for identical consecutive messages
 * - Toast previews for new notifications
 * - Expandable notification drawer with navigation
 * - Client-side persistence with localStorage
 * - Auto-expiration after 1 day
 * - 50 notification limit per CV
 * - Persistent notification history
 * - TypeScript support with full type safety
 * - Material-UI integration
 * - Zustand state management
 *
 * Architecture:
 * - CVProvider: Wraps CV-specific pages to provide CV context
 * - useNotifications: Auto-injects cvId from context for CV-specific notifications
 * - useCVNotifications: Filters notifications by CV ID for display
 * - NotificationDrawer: Shows notifications with optional CV filtering
 * - NotificationToast: Shows latest notification with optional CV filtering
 *
 * @packageDocumentation
 */

// Export types
export type {
  Notification,
  NotificationStore,
  NotificationDrawerRef,
  NotificationToastProps,
  NotificationType,
} from "./types";

// Export store and hooks
export { useNotificationStore } from "./store";
export { useNotifications, useCVNotifications } from "./hooks";

// Export utilities
export {
  formatRelativeTime,
  areNotificationsIdentical,
  generateNotificationId,
  createNotification,
  isNotificationExpired,
  removeExpiredNotifications,
  enforceCVNotificationLimit,
} from "./utils";

// Export components
export {
  NotificationDrawer,
  NotificationToast,
} from "./components";

// Re-export everything for convenience
export * from "./types";
export * from "./store";
export * from "./hooks";
export * from "./utils";
export * from "./components";
