/**
 * Unit tests for NotificationDrawer component
 *
 * Tests the NotificationDrawer component to ensure it properly filters
 * notifications by cvId and displays them correctly.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotificationDrawer from '../NotificationDrawer';
import { useNotificationStore } from '../../store';
import {
  clearNotificationStore,
  TEST_CV_IDS
} from '../../test-helpers';

// Helper to render component with Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NotificationDrawer Component', () => {
  beforeEach(() => {
    clearNotificationStore();
  });

  describe('CV ID Filtering - Badge Count', () => {
    it('should show correct badge count for cvId prop', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const store = useNotificationStore.getState();

      // Add notifications with different cvIds
      store.addNotification({
        type: 'success',
        title: 'CV1 Notification 1',
      }, TEST_CV_IDS.CV_1);

      store.addNotification({
        type: 'error',
        title: 'CV2 Notification',
      }, TEST_CV_IDS.CV_2);

      store.addNotification({
        type: 'warning',
        title: 'CV1 Notification 2',
      }, TEST_CV_IDS.CV_1);

      renderWithRouter(<NotificationDrawer open={false} onClose={jest.fn()} cvId={testCvId} />);

      // Badge should show 2 (only CV1 notifications)
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });

    it('should show correct badge count for all notifications when no cvId', () => {
      const store = useNotificationStore.getState();

      // Add notifications with different cvIds
      store.addNotification({
        type: 'success',
        title: 'CV1 Notification',
      }, TEST_CV_IDS.CV_1);

      store.addNotification({
        type: 'error',
        title: 'CV2 Notification',
      }, TEST_CV_IDS.CV_2);

      store.addNotification({
        type: 'warning',
        title: 'CV3 Notification',
      }, TEST_CV_IDS.CV_3);

      renderWithRouter(<NotificationDrawer open={false} onClose={jest.fn()} />);

      // Badge should show 3 (all notifications)
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });

    it('should hide badge when no notifications match cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const store = useNotificationStore.getState();

      // Add notifications with different cvIds
      store.addNotification({
        type: 'success',
        title: 'CV2 Notification',
      }, TEST_CV_IDS.CV_2);

      renderWithRouter(<NotificationDrawer open={false} onClose={jest.fn()} cvId={testCvId} />);

      // Badge should be invisible/not show a number
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('should render notification icon', () => {
      renderWithRouter(<NotificationDrawer open={false} onClose={jest.fn()} />);

      // The notification icon should be visible
      expect(screen.getByTestId('NotificationsIcon')).toBeInTheDocument();
    });
  });
});
