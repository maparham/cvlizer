/**
 * Basic tests for notification system
 *
 * Simple tests to verify the core functionality works correctly.
 */

import { act, renderHook } from '@testing-library/react';
import { useNotificationStore } from '../store';

describe('Basic Notification Store Tests', () => {
  beforeEach(() => {
    // Clear any existing notifications
    useNotificationStore.getState().clearNotifications();
  });

  it('should create a notification with cvId', () => {
    const { result } = renderHook(() => useNotificationStore());
    const testCvId = 'test-cv-123';

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
    expect(notifications[0].title).toBe('Test Notification');
    expect(notifications[0].type).toBe('success');
  });

  it('should filter notifications by cvId', () => {
    const { result } = renderHook(() => useNotificationStore());
    const cvId1 = 'cv-1';
    const cvId2 = 'cv-2';

    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'CV1 Notification',
      }, cvId1);

      result.current.addNotification({
        type: 'error',
        title: 'CV2 Notification',
      }, cvId2);
    });

    const allNotifications = result.current.notifications;
    expect(allNotifications).toHaveLength(2);

    const cv1Notifications = allNotifications.filter(n => n.cvId === cvId1);
    expect(cv1Notifications).toHaveLength(1);
    expect(cv1Notifications[0].title).toBe('CV1 Notification');

    const cv2Notifications = allNotifications.filter(n => n.cvId === cvId2);
    expect(cv2Notifications).toHaveLength(1);
    expect(cv2Notifications[0].title).toBe('CV2 Notification');
  });

  it('should remove notification by id', () => {
    const { result } = renderHook(() => useNotificationStore());
    const testCvId = 'test-cv-123';

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
      }, 'cv-1');

      result.current.addNotification({
        type: 'error',
        title: 'Notification 2',
      }, 'cv-2');
    });

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should create convenience method notifications with cvId', () => {
    const { result } = renderHook(() => useNotificationStore());
    const testCvId = 'test-cv-123';

    act(() => {
      result.current.showSuccess('Success!', 'Operation completed', testCvId);
    });

    const notifications = result.current.notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('success');
    expect(notifications[0].title).toBe('Success!');
    expect(notifications[0].message).toBe('Operation completed');
    expect(notifications[0].cvId).toBe(testCvId);
  });
});
