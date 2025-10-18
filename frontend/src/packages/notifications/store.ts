/**
 * Notification Store
 *
 * This module provides the Zustand store for notification state management.
 * It handles all notification operations including:
 * - Grouping identical consecutive notifications
 * - Client-side persistence with localStorage
 * - Auto-expiration after 1 day
 * - 50 notification limit per CV
 * - CV-specific notification association
 * - CRUD operations on notifications
 *
 * The store uses Zustand persist middleware for localStorage persistence
 * and automatically cleans up expired notifications on initialization.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Notification, NotificationStore } from "./types";
import {
  areNotificationsIdentical,
  createNotification,
  removeExpiredNotifications,
  enforceCVNotificationLimit,
} from "./utils";

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        notifications: [],
        _hasInitialized: false,

        // Initialize with cleanup
        _initialize: () => {
          if (!get()._hasInitialized) {
            set((state) => {
              let cleaned = removeExpiredNotifications(state.notifications);
              cleaned = enforceCVNotificationLimit(cleaned, 50);
              return {
                notifications: cleaned,
                _hasInitialized: true
              };
            });
          }
        },

        // Notification actions
        addNotification: (notification, cvId) => {
        const id = generateId();

        set((state) => {
          let notifications = [...state.notifications];
          const firstNotification = notifications[0];

          // Check if identical AND same CV context
          const isIdentical = firstNotification &&
            firstNotification.cvId === cvId &&
            areNotificationsIdentical(firstNotification, notification);

          if (isIdentical) {
            // Group with the first notification
            const newTimestamp = new Date();
            const updatedFirstNotification = {
              ...firstNotification,
              count: firstNotification.count + 1,
              groupedIds: [...firstNotification.groupedIds, id],
              timestamp: newTimestamp, // Update to latest timestamp
              groupedTimestamps: [...firstNotification.groupedTimestamps, newTimestamp],
            };

            notifications[0] = updatedFirstNotification;
          } else {
            // Create new notification with cvId
            const newNotification = {
              ...createNotification(notification),
              cvId, // Add CV context
            };
            notifications.unshift(newNotification);
          }

          // Clean up expired notifications
          notifications = removeExpiredNotifications(notifications);

          // Enforce 50 notification limit per CV
          notifications = enforceCVNotificationLimit(notifications, 50);

          return { notifications };
        });

        return id; // Return the notification ID
      },

      removeNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) => {
            if (n.groupedIds.includes(id)) {
              if (n.count === 1) {
                // If this is the only notification in the group, remove it
                return null;
              } else {
                // Remove the ID from the group and decrement count
                return {
                  ...n,
                  count: n.count - 1,
                  groupedIds: n.groupedIds.filter(groupedId => groupedId !== id),
                };
              }
            }
            return n;
          }).filter(Boolean) as Notification[];

          return { notifications };
        });
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      markNotificationAsShown: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, shown: true } : n
          ),
        }));
      },

      // Convenience methods
      showSuccess: (title: string, message?: string, cvId?: string) =>
        get().addNotification({ type: "success", title, message }, cvId),
      showError: (title: string, message?: string, cvId?: string) =>
        get().addNotification({ type: "error", title, message }, cvId),
      showValidationError: (title: string, message?: string, cvId?: string) =>
        get().addNotification({ type: "error", title, message, persistent: true }, cvId),
      showWarning: (title: string, message?: string, cvId?: string) =>
        get().addNotification({ type: "warning", title, message }, cvId),
      showInfo: (title: string, message?: string, cvId?: string) =>
        get().addNotification({ type: "info", title, message }, cvId),
      }),
      {
        name: "cv-optimizer-notifications", // localStorage key
        version: 1,
        // Custom serialization to handle Date objects
        serialize: (state) => JSON.stringify(state),
        deserialize: (str) => {
          const parsed = JSON.parse(str);
          // Convert timestamp strings back to Date objects
          if (parsed.state?.notifications) {
            parsed.state.notifications = parsed.state.notifications.map((n: any) => ({
              ...n,
              timestamp: new Date(n.timestamp),
              groupedTimestamps: n.groupedTimestamps?.map((t: string) => new Date(t)) || [],
            }));
          }
          return parsed;
        },
        // Run cleanup after rehydration
        onRehydrateStorage: () => (state) => {
          if (state) {
            state._initialize?.();
          }
        },
      },
    ),
    {
      name: "notification-store",
    },
  ),
);
