/**
 * Page Title Notification Utility
 *
 * This module provides a utility to dynamically update the browser tab title
 * to notify users of pending actions or completed tasks when the browser tab
 * is inactive.
 *
 * Key features:
 * - Display notification prefix in title
 * - Clear prefix when tab becomes active
 * - Works alongside page visibility API
 * - No permissions required
 *
 * Usage:
 * - Call setTitleNotification() when task completes and page is hidden
 * - Call clearTitleNotification() when user returns to tab
 */

/**
 * Original page title cache
 */
let originalTitle: string | null = null;

/**
 * Initialize and cache the original page title
 */
function initializeTitle(): void {
  if (typeof document === "undefined") return;

  if (!originalTitle) {
    originalTitle = document.title;
  }
}

/**
 * Update the page title with a notification prefix
 */
export function setTitleNotification(message: string): void {
  if (typeof document === "undefined") return;

  initializeTitle();

  if (!originalTitle) {
    console.warn("Could not cache original title");
    return;
  }

  // Add notification prefix to title
  document.title = `🔔 ${message} - ${originalTitle}`;
}

/**
 * Clear the notification and restore original title
 */
export function clearTitleNotification(): void {
  if (typeof document === "undefined" || !originalTitle) return;

  document.title = originalTitle;
}

/**
 * Check if the page is currently hidden/background
 */
export function isPageHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}
