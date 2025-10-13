import { renderHook, act } from '@testing-library/react'
import { useUIStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store before each test
    localStorage.clear()
    useUIStore.getState().reset()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useUIStore())

    expect(result.current.theme).toBe('auto')
    expect(result.current.sidebarOpen).toBe(true)
    expect(result.current.globalLoading).toBe(false)
    expect(result.current.notifications).toEqual([])
    expect(result.current.dialogs).toEqual({
      confirmDelete: false,
      unsavedChanges: false,
      cvUpload: false
    })
  })

  describe('theme management', () => {
    it('should set theme', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')
    })
  })

  describe('sidebar management', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useUIStore())

      expect(result.current.sidebarOpen).toBe(true)

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.sidebarOpen).toBe(false)

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.sidebarOpen).toBe(true)
    })

    it('should set sidebar state', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setSidebarOpen(false)
      })

      expect(result.current.sidebarOpen).toBe(false)

      act(() => {
        result.current.setSidebarOpen(true)
      })

      expect(result.current.sidebarOpen).toBe(true)
    })
  })

  describe('loading state', () => {
    it('should set global loading state', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setGlobalLoading(true)
      })

      expect(result.current.globalLoading).toBe(true)

      act(() => {
        result.current.setGlobalLoading(false)
      })

      expect(result.current.globalLoading).toBe(false)
    })
  })

  describe('notifications', () => {
    it('should add notification', () => {
      const { result } = renderHook(() => useUIStore())
      const notification = {
        type: 'success' as const,
        title: 'Success',
        message: 'Operation successful',
        duration: 5000
      }

      act(() => {
        const id = result.current.addNotification(notification)
        expect(typeof id).toBe('string')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject(notification)
    })

    it('should remove notification', () => {
      const { result } = renderHook(() => useUIStore())
      let notificationId: string

      act(() => {
        notificationId = result.current.addNotification({
          type: 'success',
          title: 'Success',
          message: 'Operation successful'
        })
      })

      expect(result.current.notifications).toHaveLength(1)

      act(() => {
        result.current.removeNotification(notificationId!)
      })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Success 1',
          message: 'Operation 1 successful'
        })
        result.current.addNotification({
          type: 'error',
          title: 'Error 1',
          message: 'Operation 1 failed'
        })
      })

      expect(result.current.notifications).toHaveLength(2)

      act(() => {
        result.current.clearNotifications()
      })

      expect(result.current.notifications).toHaveLength(0)
    })
  })

  describe('dialogs', () => {
    it('should open dialog', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.openDialog('confirmDelete')
      })

      expect(result.current.dialogs.confirmDelete).toBe(true)
    })

    it('should close dialog', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.openDialog('confirmDelete')
      })

      expect(result.current.dialogs.confirmDelete).toBe(true)

      act(() => {
        result.current.closeDialog('confirmDelete')
      })

      expect(result.current.dialogs.confirmDelete).toBe(false)
    })

    it('should close all dialogs', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.openDialog('confirmDelete')
        result.current.openDialog('unsavedChanges')
        result.current.openDialog('cvUpload')
      })

      expect(result.current.dialogs.confirmDelete).toBe(true)
      expect(result.current.dialogs.unsavedChanges).toBe(true)
      expect(result.current.dialogs.cvUpload).toBe(true)

      act(() => {
        result.current.closeAllDialogs()
      })

      expect(result.current.dialogs.confirmDelete).toBe(false)
      expect(result.current.dialogs.unsavedChanges).toBe(false)
      expect(result.current.dialogs.cvUpload).toBe(false)
    })
  })

  describe('utility functions', () => {
    it('should show success notification', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.showSuccess('Success!', 'Operation completed')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        title: 'Success!',
        message: 'Operation completed'
      })
    })

    it('should show error notification', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.showError('Error!', 'Something went wrong')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject({
        type: 'error',
        title: 'Error!',
        message: 'Something went wrong'
      })
    })

    it('should show warning notification', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.showWarning('Warning!', 'Please be careful')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject({
        type: 'warning',
        title: 'Warning!',
        message: 'Please be careful'
      })
    })

    it('should show info notification', () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.showInfo('Info', 'Here is some information')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject({
        type: 'info',
        title: 'Info',
        message: 'Here is some information'
      })
    })
  })

  // Note: Persistence tests are skipped as they require more complex setup
  // The store uses Zustand's persist middleware which may not work properly in test environment
})
