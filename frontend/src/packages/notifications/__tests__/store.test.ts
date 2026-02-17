/**
 * Unit tests for notification store
 *
 * Tests the core notification store functionality including CV context isolation,
 * notification creation, grouping, and filtering.
 */

import { act, renderHook } from '@testing-library/react';
import { useNotificationStore } from '../store';
import {
  clearNotificationStore,
  createMockNotification,
  createMockNotifications,
  TEST_CV_IDS
} from '../test-helpers';

describe('Notification Store', () => {
  beforeEach(() => {
    clearNotificationStore();
  });

  describe('Notification Creation with CV ID', () => {
    it('should create notification with correct cvId', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'Test message',
        }, testCvId);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].cvId).toBe(testCvId);
      expect(notifications[0].cvId).not.toBeUndefined();
    });

    it('should create notification with undefined cvId when not provided', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'Test message',
        }, undefined);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].cvId).toBeUndefined();
    });

    it('should create multiple notifications with different cvIds', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'CV1 Notification',
        }, TEST_CV_IDS.CV_1);

        result.current.addNotification({
          type: 'error',
          title: 'CV2 Notification',
        }, TEST_CV_IDS.CV_2);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(2);
      // Notifications are added with unshift, so newest first
      expect(notifications[0].cvId).toBe(TEST_CV_IDS.CV_2);
      expect(notifications[1].cvId).toBe(TEST_CV_IDS.CV_1);
    });
  });

  describe('Notification Grouping with CV Context', () => {
    it('should group identical notifications with same cvId', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Same Notification',
          message: 'Same message',
        }, testCvId);

        result.current.addNotification({
          type: 'success',
          title: 'Same Notification',
          message: 'Same message',
        }, testCvId);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].count).toBe(2);
      expect(notifications[0].groupedIds).toHaveLength(2);
    });

    it('should not group identical notifications with different cvIds', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Same Notification',
          message: 'Same message',
        }, TEST_CV_IDS.CV_1);

        result.current.addNotification({
          type: 'success',
          title: 'Same Notification',
          message: 'Same message',
        }, TEST_CV_IDS.CV_2);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(2);
      expect(notifications[0].count).toBe(1);
      expect(notifications[1].count).toBe(1);
    });

    it('should group consecutive identical messages (A, A, B, A, A → 3 items)', () => {
      const { result } = renderHook(() => useNotificationStore());
      const cvId = TEST_CV_IDS.CV_1;
      const addA = () =>
        result.current.addNotification({
          type: 'success',
          title: 'Writing correction applied successfully',
        }, cvId);
      const addB = () =>
        result.current.addNotification({
          type: 'info',
          title: 'Writing correction dismissed',
        }, cvId);

      act(() => {
        addA();
        addA();
        addB();
        addA();
        addA();
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(3);
      // Newest first: [A(group), B, A(group)]
      expect(notifications[0].title).toBe('Writing correction applied successfully');
      expect(notifications[0].count).toBe(2);
      expect(notifications[1].title).toBe('Writing correction dismissed');
      expect(notifications[1].count).toBe(1);
      expect(notifications[2].title).toBe('Writing correction applied successfully');
      expect(notifications[2].count).toBe(2);
    });

    it('should treat undefined and empty string message as identical for grouping', () => {
      const { result } = renderHook(() => useNotificationStore());
      const cvId = TEST_CV_IDS.CV_1;

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Same title',
          message: undefined,
        }, cvId);
        result.current.addNotification({
          type: 'success',
          title: 'Same title',
          message: '',
        }, cvId);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].count).toBe(2);
    });
  });

  describe('Toast-only Notifications', () => {
    it('should emit toast-only notification with correct cvId', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;
      let emittedNotification: any = null;

      // Mock the toast notification emitter
      const originalEmit = require('../store').toastNotificationEmitter.emit;
      require('../store').toastNotificationEmitter.emit = (notification: any) => {
        emittedNotification = notification;
      };

      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Toast Only',
          message: 'This is toast only',
          toastOnly: true,
        }, testCvId);
      });

      expect(emittedNotification).toBeTruthy();
      expect(emittedNotification.cvId).toBe(testCvId);
      expect(emittedNotification.title).toBe('Toast Only');

      // Verify it's not added to persistent store
      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(0);

      // Restore original emit
      require('../store').toastNotificationEmitter.emit = originalEmit;
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications by cvId', () => {
      const { result } = renderHook(() => useNotificationStore());

      // Add notifications with different cvIds
      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'CV1 Notification',
        }, TEST_CV_IDS.CV_1);

        result.current.addNotification({
          type: 'error',
          title: 'CV2 Notification',
        }, TEST_CV_IDS.CV_2);

        result.current.addNotification({
          type: 'warning',
          title: 'CV1 Another Notification',
        }, TEST_CV_IDS.CV_1);
      });

      const allNotifications = result.current.notifications;
      expect(allNotifications).toHaveLength(3);

      // Filter for CV1 notifications
      const cv1Notifications = allNotifications.filter(n => n.cvId === TEST_CV_IDS.CV_1);
      expect(cv1Notifications).toHaveLength(2);
      expect(cv1Notifications.every(n => n.cvId === TEST_CV_IDS.CV_1)).toBe(true);

      // Filter for CV2 notifications
      const cv2Notifications = allNotifications.filter(n => n.cvId === TEST_CV_IDS.CV_2);
      expect(cv2Notifications).toHaveLength(1);
      expect(cv2Notifications[0].cvId).toBe(TEST_CV_IDS.CV_2);
    });
  });

  describe('Notification Management', () => {
    it('should remove notification by id', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      let notificationId: string;
      act(() => {
        notificationId = result.current.addNotification({
          type: 'success',
          title: 'Test Notification',
        }, testCvId);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe(notificationId);

      act(() => {
        result.current.removeNotification(notificationId!);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Notification 1',
        }, TEST_CV_IDS.CV_1);

        result.current.addNotification({
          type: 'error',
          title: 'Notification 2',
        }, TEST_CV_IDS.CV_2);
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should mark notification as shown', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      let notificationId: string;
      act(() => {
        notificationId = result.current.addNotification({
          type: 'success',
          title: 'Test Notification',
        }, testCvId);
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

  describe('Convenience Methods', () => {
    it('should create success notification with cvId', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      act(() => {
        result.current.showSuccess('Success Title', 'Success message', testCvId);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].title).toBe('Success Title');
      expect(notifications[0].message).toBe('Success message');
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should create error notification with cvId', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      act(() => {
        result.current.showError('Error Title', 'Error message', testCvId);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].cvId).toBe(testCvId);
    });

    it('should create validation error notification with persistent flag', () => {
      const { result } = renderHook(() => useNotificationStore());
      const testCvId = TEST_CV_IDS.CV_1;

      act(() => {
        result.current.showValidationError('Validation Error', 'Invalid input', testCvId);
      });

      const notifications = result.current.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].persistent).toBe(true);
      expect(notifications[0].cvId).toBe(testCvId);
    });
  });
});
