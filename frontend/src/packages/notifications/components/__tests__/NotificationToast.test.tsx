/**
 * Unit tests for NotificationToast component
 *
 * Tests the NotificationToast component to ensure it properly filters
 * notifications by cvId and displays toast notifications correctly.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationToast from '../NotificationToast';
import { useNotificationStore } from '../../store';
import {
  clearNotificationStore,
  TEST_CV_IDS
} from '../../test-helpers';

describe('NotificationToast Component', () => {
  beforeEach(() => {
    clearNotificationStore();
    jest.clearAllMocks();
  });

  describe('CV ID Filtering', () => {
    it('should display toast for notification with matching cvId', async () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const store = useNotificationStore.getState();

      render(<NotificationToast onOpenDrawer={jest.fn()} cvId={testCvId} />);

      // Add notification after component is rendered
      store.addNotification({
        type: 'success',
        title: 'Test Notification',
        message: 'This should appear',
      }, testCvId);

      await waitFor(() => {
        expect(screen.getByText('This should appear')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not display toast for notification with different cvId', async () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const store = useNotificationStore.getState();

      render(<NotificationToast onOpenDrawer={jest.fn()} cvId={testCvId} />);

      // Add notification with different cvId
      store.addNotification({
        type: 'success',
        title: 'Different CV Notification',
        message: 'This should NOT appear',
      }, TEST_CV_IDS.CV_2);

      // Wait a bit to ensure notification doesn't appear
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.queryByText('This should NOT appear')).not.toBeInTheDocument();
    });

    it('should display all notifications when no cvId provided', async () => {
      const store = useNotificationStore.getState();

      render(<NotificationToast onOpenDrawer={jest.fn()} />);

      // Add notification without cvId filter
      store.addNotification({
        type: 'info',
        title: 'Global Notification',
        message: 'This should appear',
      }, TEST_CV_IDS.CV_1);

      await waitFor(() => {
        expect(screen.getByText('This should appear')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Component Props', () => {
    it('should handle missing onOpenDrawer prop gracefully', () => {
      const testCvId = TEST_CV_IDS.CV_1;

      // Should not throw error when onOpenDrawer is undefined
      expect(() => {
        render(<NotificationToast onOpenDrawer={undefined as any} cvId={testCvId} />);
      }).not.toThrow();
    });
  });
});
