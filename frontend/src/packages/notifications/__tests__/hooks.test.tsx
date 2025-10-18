/**
 * Unit tests for notification hooks
 *
 * Tests the useCVNotifications hook to ensure it properly handles CV context
 * and creates notifications with the correct cvId.
 */

import { act, renderHook } from '@testing-library/react';
import { useCVNotifications } from '../hooks';
import {
  clearNotificationStore,
  createMockNotifications,
  addNotificationsToStore,
  TEST_CV_IDS
} from '../test-helpers';

describe('useCVNotifications Hook', () => {
  beforeEach(() => {
    clearNotificationStore();
  });

  describe('CV ID Parameter Handling', () => {
    it('should use explicit cvId parameter for notification creation', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showSuccess('Test Success', 'Test message');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].cvId).toBe(testCvId);
      expect(notifications[0].type).toBe('success');
    });

    it('should create notifications with different cvIds when hook is called with different parameters', () => {
      const { result: result1 } = renderHook(() => useCVNotifications(TEST_CV_IDS.CV_1));
      const { result: result2 } = renderHook(() => useCVNotifications(TEST_CV_IDS.CV_2));

      act(() => {
        result1.current.showSuccess('CV1 Success');
        result2.current.showError('CV2 Error');
      });

      const cv1Notifications = result1.current.notifications;
      const cv2Notifications = result2.current.notifications;

      expect(cv1Notifications).toHaveLength(1);
      expect(cv1Notifications[0].cvId).toBe(TEST_CV_IDS.CV_1);
      expect(cv1Notifications[0].type).toBe('success');

      expect(cv2Notifications).toHaveLength(1);
      expect(cv2Notifications[0].cvId).toBe(TEST_CV_IDS.CV_2);
      expect(cv2Notifications[0].type).toBe('error');
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications by cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;

      // Add notifications with different cvIds to the store
      const mockNotifications = createMockNotifications([
        TEST_CV_IDS.CV_1,
        TEST_CV_IDS.CV_2,
        TEST_CV_IDS.CV_1,
        TEST_CV_IDS.CV_3,
      ]);

      addNotificationsToStore(mockNotifications);

      const { result } = renderHook(() => useCVNotifications(testCvId));

      const filteredNotifications = result.current.notifications;
      expect(filteredNotifications).toHaveLength(2);
      expect(filteredNotifications.every(n => n.cvId === testCvId)).toBe(true);
    });

    it('should show all notifications when no cvId is provided (Dashboard mode)', () => {
      // Add notifications with different cvIds to the store
      const mockNotifications = createMockNotifications([
        TEST_CV_IDS.CV_1,
        TEST_CV_IDS.CV_2,
        TEST_CV_IDS.CV_3,
      ]);

      addNotificationsToStore(mockNotifications);

      const { result } = renderHook(() => useCVNotifications());

      const allNotifications = result.current.notifications;
      expect(allNotifications).toHaveLength(3);
    });

    it('should return empty array when no notifications match cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;

      // Add notifications with different cvIds
      const mockNotifications = createMockNotifications([
        TEST_CV_IDS.CV_2,
        TEST_CV_IDS.CV_3,
      ]);

      addNotificationsToStore(mockNotifications);

      const { result } = renderHook(() => useCVNotifications(testCvId));

      const filteredNotifications = result.current.notifications;
      expect(filteredNotifications).toHaveLength(0);
    });
  });

  describe('Convenience Methods', () => {
    it('should create success notification with correct cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showSuccess('Success Title', 'Success message');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].title).toBe('Success Title');
      expect(notifications[0].message).toBe('Success message');
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should create error notification with correct cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showError('Error Title', 'Error message');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should create warning notification with correct cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showWarning('Warning Title', 'Warning message');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should create info notification with correct cvId', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showInfo('Info Title', 'Info message');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should create validation error notification with correct cvId and persistent flag', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showValidationError('Validation Error', 'Invalid input');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should handle toast-only notifications correctly', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showInfo('Toast Only', 'This is toast only', true);
      });

      // Toast-only notifications should not be added to persistent store
      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Notification Management', () => {
    it('should remove notification by id', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      let notificationId: string;
      act(() => {
        notificationId = result.current.showSuccess('Test Notification');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.removeNotification(notificationId!);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showSuccess('Notification 1');
        result.current.showError('Notification 2');
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should mark notification as shown', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      let notificationId: string;
      act(() => {
        notificationId = result.current.showSuccess('Test Notification');
      });

      const notification = result.current.notifications[0];
      expect(notification.shown).toBe(false);

      act(() => {
        result.current.markNotificationAsShown(notificationId!);
      });

      // Wait for state update
      act(() => {
        // Force a re-render to get updated state
      });

      const updatedNotification = result.current.notifications[0];
      expect(updatedNotification.shown).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined cvId parameter gracefully', () => {
      const { result } = renderHook(() => useCVNotifications(undefined));

      act(() => {
        result.current.showSuccess('Test Notification');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].cvId).toBeUndefined();
    });

    it('should handle empty string cvId parameter', () => {
      const { result } = renderHook(() => useCVNotifications(''));

      act(() => {
        result.current.showSuccess('Test Notification');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].cvId).toBe('');
    });

    it('should maintain cvId consistency across multiple operations', () => {
      const testCvId = TEST_CV_IDS.CV_1;
      const { result } = renderHook(() => useCVNotifications(testCvId));

      act(() => {
        result.current.showSuccess('Success 1');
        result.current.showError('Error 1');
        result.current.showWarning('Warning 1');
        result.current.showInfo('Info 1');
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(4);
      expect(notifications.every(n => n.cvId === testCvId)).toBe(true);
    });
  });
});
