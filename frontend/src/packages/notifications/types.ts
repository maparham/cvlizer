/**
 * Notification Types
 *
 * This module defines all TypeScript interfaces and types for the notification system.
 * It provides type safety and clear contracts for notification-related functionality.
 */

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean; // For validation errors that shouldn't auto-dismiss
  timestamp: Date; // When the notification was created
  shown: boolean; // Whether the toast preview was displayed
  count: number; // Number of identical notifications grouped together
  groupedIds: string[]; // IDs of all notifications in this group
  groupedTimestamps: Date[]; // Individual timestamps for each grouped notification
  cvId?: string; // Optional: Associate notification with specific CV
}

export interface NotificationStore {
  // State
  notifications: Notification[];
  _hasInitialized?: boolean;
  _initialize?: () => void;

  // Actions
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "shown" | "count" | "groupedIds" | "groupedTimestamps" | "cvId">,
    cvId?: string
  ) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markNotificationAsShown: (id: string) => void;

  // Convenience methods
  showSuccess: (title: string, message?: string, cvId?: string) => string;
  showError: (title: string, message?: string, cvId?: string) => string;
  showWarning: (title: string, message?: string, cvId?: string) => string;
  showInfo: (title: string, message?: string, cvId?: string) => string;
  showValidationError: (title: string, message?: string, cvId?: string) => string;
}

export interface NotificationDrawerRef {
  openDrawer: () => void;
}

export interface NotificationToastProps {
  onOpenDrawer: () => void;
  cvId?: string; // Optional: filter to specific CV
}

export type NotificationType = Notification["type"];
