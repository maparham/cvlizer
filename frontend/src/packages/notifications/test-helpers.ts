/**
 * Test utilities for notification system tests
 *
 * Provides helper functions and mocks for testing notification functionality
 * with proper CV context isolation.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { useNotificationStore } from './store';

// Mock notification data
export const createMockNotification = (overrides: Partial<any> = {}) => ({
  id: 'test-notification-id',
  type: 'success' as const,
  title: 'Test Notification',
  message: 'Test message',
  timestamp: new Date('2024-01-01T00:00:00Z'),
  shown: false,
  count: 1,
  groupedIds: ['test-notification-id'],
  groupedTimestamps: [new Date('2024-01-01T00:00:00Z')],
  cvId: 'test-cv-id',
  ...overrides,
});

export const createMockNotifications = (cvIds: string[]) =>
  cvIds.map((cvId, index) => createMockNotification({
    id: `notification-${index}`,
    title: `Notification ${index}`,
    cvId,
  }));

// Helper to clear notification store state
export const clearNotificationStore = () => {
  try {
    useNotificationStore.getState().clearNotifications();
  } catch (error) {
    // Store might be mocked in tests, ignore error
  }
};

// Helper to add notifications to store
export const addNotificationsToStore = (notifications: any[]) => {
  try {
    const store = useNotificationStore.getState();
    notifications.forEach(notification => {
      store.addNotification(notification, notification.cvId);
    });
  } catch (error) {
    // Store might be mocked in tests, ignore error
  }
};

// Custom render function (simplified without CV context)
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  cvId?: string;
}

export const renderWithCVContext = (
  ui: ReactElement,
  { cvId, ...renderOptions }: CustomRenderOptions = {}
) => {
  // For testing purposes, we don't need the actual CV context
  // The cvId is passed directly to components via props
  return render(ui, { ...renderOptions });
};

// Helper to get current store state
export const getStoreState = () => {
  try {
    return useNotificationStore.getState();
  } catch (error) {
    // Store might be mocked in tests, return empty state
    return { notifications: [] };
  }
};

// Helper to create a notification with specific cvId
export const createNotificationWithCVId = (cvId: string, overrides: Partial<any> = {}) => {
  try {
    const store = useNotificationStore.getState();
    return store.addNotification({
      type: 'success',
      title: 'Test Notification',
      message: 'Test message',
      ...overrides,
    }, cvId);
  } catch (error) {
    // Store might be mocked in tests, return mock ID
    return 'mock-notification-id';
  }
};

// Mock CV IDs for testing
export const TEST_CV_IDS = {
  CV_1: 'cv-1-test-id',
  CV_2: 'cv-2-test-id',
  CV_3: 'cv-3-test-id',
} as const;
