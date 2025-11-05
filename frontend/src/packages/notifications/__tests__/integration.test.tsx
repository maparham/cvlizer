/**
 * Integration tests for notification system
 *
 * Tests the end-to-end notification flow to ensure CV context isolation
 * works correctly across different components and scenarios.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useCVNotifications } from '../hooks';
import {
  clearNotificationStore,
  TEST_CV_IDS
} from '../test-helpers';

describe('Notification System Integration', () => {
  beforeEach(() => {
    clearNotificationStore();
    jest.clearAllMocks();
  });

  describe('End-to-End CV Context Flow', () => {
    it('should create and display notifications in correct CV context', () => {
      const cvId1 = TEST_CV_IDS.CV_1;
      const cvId2 = TEST_CV_IDS.CV_2;

      // Render hook for CV1
      const { result: result1 } = renderHook(() => useCVNotifications(cvId1));

      act(() => {
        result1.current.showSuccess('CV1 Success', 'Operation completed in CV1');
      });

      expect(result1.current.notifications).toHaveLength(1);
      expect(result1.current.notifications[0].cvId).toBe(cvId1);

      // Render hook for CV2
      const { result: result2 } = renderHook(() => useCVNotifications(cvId2));

      // Should show no notifications for CV2
      expect(result2.current.notifications).toHaveLength(0);

      act(() => {
        result2.current.showError('CV2 Error', 'Operation failed in CV2');
      });

      // CV2 should now have 1 notification
      expect(result2.current.notifications).toHaveLength(1);
      expect(result2.current.notifications[0].cvId).toBe(cvId2);

      // CV1 should still have 1 notification
      expect(result1.current.notifications).toHaveLength(1);
      expect(result1.current.notifications[0].cvId).toBe(cvId1);
    });

    it('should maintain separate notification contexts for different CVs', () => {
      const cvId1 = TEST_CV_IDS.CV_1;
      const cvId2 = TEST_CV_IDS.CV_2;

      const { result: result1 } = renderHook(() => useCVNotifications(cvId1));
      const { result: result2 } = renderHook(() => useCVNotifications(cvId2));

      // Create notifications in CV1
      act(() => {
        result1.current.showSuccess('CV1 Success 1');
        result1.current.showError('CV1 Error 1');
      });

      expect(result1.current.notifications).toHaveLength(2);

      // Create notifications in CV2
      act(() => {
        result2.current.showSuccess('CV2 Success 1');
        result2.current.showWarning('CV2 Warning 1');
      });

      expect(result2.current.notifications).toHaveLength(2);

      // Verify isolation
      expect(result1.current.notifications).toHaveLength(2);
      expect(result1.current.notifications.every(n => n.cvId === cvId1)).toBe(true);

      expect(result2.current.notifications).toHaveLength(2);
      expect(result2.current.notifications.every(n => n.cvId === cvId2)).toBe(true);
    });
  });

  describe('Dashboard Mode', () => {
    it('should show all notifications when no cvId is provided', () => {
      const cvId1 = TEST_CV_IDS.CV_1;
      const cvId2 = TEST_CV_IDS.CV_2;

      // Create notifications with different cvIds
      const { result: result1 } = renderHook(() => useCVNotifications(cvId1));
      const { result: result2 } = renderHook(() => useCVNotifications(cvId2));

      act(() => {
        result1.current.showSuccess('CV1 Notification');
        result2.current.showError('CV2 Notification');
      });

      // Dashboard hook should see all notifications
      const { result: dashboardResult } = renderHook(() => useCVNotifications());

      expect(dashboardResult.current.notifications).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined cvId gracefully', () => {
      // Should not throw error when cvId is undefined
      expect(() => {
        const { result } = renderHook(() => useCVNotifications(undefined));
        act(() => {
          result.current.showSuccess('Test Notification');
        });
      }).not.toThrow();
    });

    it('should handle empty string cvId', () => {
      // Should not throw error when cvId is empty string
      expect(() => {
        const { result } = renderHook(() => useCVNotifications(''));
        act(() => {
          result.current.showSuccess('Test Notification');
        });
      }).not.toThrow();
    });
  });
});
