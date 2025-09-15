import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto'
  sidebarOpen: boolean
  
  // Notifications
  notifications: Notification[]
  
  // Loading states for different operations
  globalLoading: boolean
  
  // Dialog states
  dialogs: {
    confirmDelete: boolean
    unsavedChanges: boolean
    cvUpload: boolean
  }

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void
  
  // Dialog actions
  openDialog: (dialog: keyof UIState['dialogs']) => void
  closeDialog: (dialog: keyof UIState['dialogs']) => void
  closeAllDialogs: () => void
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'auto',
        sidebarOpen: true,
        notifications: [],
        globalLoading: false,
        dialogs: {
          confirmDelete: false,
          unsavedChanges: false,
          cvUpload: false
        },

        // Theme actions
        setTheme: (theme) => {
          set({ theme })
        },

        // Sidebar actions
        toggleSidebar: () => {
          set(state => ({ sidebarOpen: !state.sidebarOpen }))
        },

        setSidebarOpen: (open) => {
          set({ sidebarOpen: open })
        },

        // Notification actions
        addNotification: (notification) => {
          const id = generateId()
          const newNotification: Notification = {
            ...notification,
            id,
            duration: notification.duration ?? 5000
          }

          set(state => ({
            notifications: [...state.notifications, newNotification]
          }))

          // Auto-remove notification after duration
          if (newNotification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id)
            }, newNotification.duration)
          }

          return id // Return the notification ID
        },

        removeNotification: (id) => {
          set(state => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }))
        },

        clearNotifications: () => {
          set({ notifications: [] })
        },

        // Loading actions
        setGlobalLoading: (loading) => {
          set({ globalLoading: loading })
        },

        // Dialog actions
        openDialog: (dialog) => {
          set(state => ({
            dialogs: {
              ...state.dialogs,
              [dialog]: true
            }
          }))
        },

        closeDialog: (dialog) => {
          set(state => ({
            dialogs: {
              ...state.dialogs,
              [dialog]: false
            }
          }))
        },

        closeAllDialogs: () => {
          set({
            dialogs: {
              confirmDelete: false,
              unsavedChanges: false,
              cvUpload: false
            }
          })
        }
      }),
      {
        name: 'ui-store',
        // Only persist theme and sidebar state
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen
        })
      }
    ),
    {
      name: 'ui-store'
    }
  )
)

// Utility hooks for common patterns
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUIStore()
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    // Convenience methods
    showSuccess: (title: string, message?: string) => 
      addNotification({ type: 'success', title, message }),
    showError: (title: string, message?: string) => 
      addNotification({ type: 'error', title, message }),
    showWarning: (title: string, message?: string) => 
      addNotification({ type: 'warning', title, message }),
    showInfo: (title: string, message?: string) => 
      addNotification({ type: 'info', title, message })
  }
}
