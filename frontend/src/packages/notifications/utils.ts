/**
 * Notification Utilities
 *
 * This module provides utility functions for the notification system including
 * time formatting, grouping logic, and other notification-specific helpers.
 */

import { Notification } from "./types";

/**
 * Formats a date into a relative time string
 * @param timestamp - The date to format
 * @returns A human-readable relative time string
 */
export const formatRelativeTime = (timestamp: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

  if (diffInSeconds < 10) {
    return "just now";
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`;
};

/**
 * Checks if two notifications are identical for grouping purposes
 * @param notification1 - First notification
 * @param notification2 - Second notification
 * @returns True if notifications should be grouped together
 */
export const areNotificationsIdentical = (
  notification1: Omit<Notification, "id" | "timestamp" | "shown" | "count" | "groupedIds">,
  notification2: Omit<Notification, "id" | "timestamp" | "shown" | "count" | "groupedIds">
): boolean => {
  return (
    notification1.title === notification2.title &&
    notification1.message === notification2.message &&
    notification1.type === notification2.type
  );
};

/**
 * Generates a unique ID for notifications
 * @returns A unique string ID
 */
export const generateNotificationId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Creates a new notification with default values
 * @param notification - Base notification data
 * @param id - Optional ID to use (if not provided, generates a new one)
 * @returns Complete notification object with all required fields
 */
export const createNotification = (
  notification: Omit<Notification, "id" | "timestamp" | "shown" | "count" | "groupedIds" | "groupedTimestamps" | "cvId">,
  id?: string
): Omit<Notification, "cvId"> => {
  const notificationId = id || generateNotificationId();
  const timestamp = new Date();
  return {
    ...notification,
    id: notificationId,
    timestamp,
    shown: false,
    count: 1,
    groupedIds: [notificationId],
    groupedTimestamps: [timestamp],
  };
};

/**
 * Check if a notification has expired (older than 1 day)
 * @param notification - Notification to check
 * @returns True if notification is expired
 */
export const isNotificationExpired = (notification: Notification): boolean => {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const notificationTime = notification.timestamp.getTime();
  return now - notificationTime > oneDayInMs;
};

/**
 * Remove expired notifications from the list
 * @param notifications - Array of notifications to filter
 * @returns Filtered array with only non-expired notifications
 */
export const removeExpiredNotifications = (notifications: Notification[]): Notification[] => {
  return notifications.filter(n => !isNotificationExpired(n));
};

/**
 * Enforce 50 notification limit per CV
 * Keeps the most recent 50 notifications for each CV
 * @param notifications - Array of notifications to limit
 * @param limit - Maximum notifications per CV (default: 50)
 * @returns Limited array of notifications
 */
export const enforceCVNotificationLimit = (
  notifications: Notification[],
  limit: number = 50
): Notification[] => {
  // Group notifications by cvId (null/undefined for global)
  const groupedByCv = notifications.reduce((acc, notification) => {
    const key = notification.cvId || '__global__';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  // For each CV, keep only the most recent 50 notifications
  const limitedNotifications: Notification[] = [];
  Object.values(groupedByCv).forEach(cvNotifications => {
    // Sort by timestamp descending (most recent first)
    const sorted = cvNotifications.sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    // Take only the first 50
    limitedNotifications.push(...sorted.slice(0, limit));
  });

  // Sort all notifications by timestamp descending
  return limitedNotifications.sort((a, b) =>
    b.timestamp.getTime() - a.timestamp.getTime()
  );
};
