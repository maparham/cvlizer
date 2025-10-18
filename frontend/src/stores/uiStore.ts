/**
 * UI Store - Zustand State Management
 *
 * This module provides centralized state management for UI-related operations including:
 * - Theme management (light/dark/auto)
 * - Sidebar state and navigation
 * - Global loading states for operations
 * - Dialog state management for modals and confirmations
 * - Convenience methods for common UI operations
 *
 * Usage:
 * - Import useUIStore hook to access UI state and actions
 * - Manage theme and sidebar state across components
 * - Control dialog visibility and global loading states
 * - For notifications, use the notifications package instead
 */
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface UIState {
  // Theme and appearance
  theme: "light" | "dark" | "auto";
  sidebarOpen: boolean;

  // Loading states for different operations
  globalLoading: boolean;

  // Dialog states
  dialogs: {
    confirmDelete: boolean;
    unsavedChanges: boolean;
    cvUpload: boolean;
  };

  // Actions
  setTheme: (theme: "light" | "dark" | "auto") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Loading actions
  setGlobalLoading: (loading: boolean) => void;

  // Dialog actions
  openDialog: (dialog: keyof UIState["dialogs"]) => void;
  closeDialog: (dialog: keyof UIState["dialogs"]) => void;
  closeAllDialogs: () => void;

  // Reset function for testing
  reset: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: "auto",
        sidebarOpen: true,
        globalLoading: false,
        dialogs: {
          confirmDelete: false,
          unsavedChanges: false,
          cvUpload: false,
        },

        // Theme actions
        setTheme: (theme) => {
          set({ theme });
        },

        // Sidebar actions
        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }));
        },

        setSidebarOpen: (open) => {
          set({ sidebarOpen: open });
        },


        // Loading actions
        setGlobalLoading: (loading) => {
          set({ globalLoading: loading });
        },

        // Dialog actions
        openDialog: (dialog) => {
          set((state) => ({
            dialogs: {
              ...state.dialogs,
              [dialog]: true,
            },
          }));
        },

        closeDialog: (dialog) => {
          set((state) => ({
            dialogs: {
              ...state.dialogs,
              [dialog]: false,
            },
          }));
        },

        closeAllDialogs: () => {
          set({
            dialogs: {
              confirmDelete: false,
              unsavedChanges: false,
              cvUpload: false,
            },
          });
        },

        // Reset function for testing
        reset: () => {
          set({
            theme: "auto",
            sidebarOpen: true,
            globalLoading: false,
            dialogs: {
              confirmDelete: false,
              unsavedChanges: false,
              cvUpload: false,
            },
          });
        },
      }),
      {
        name: "ui-store",
        // Only persist theme and sidebar state
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      },
    ),
    {
      name: "ui-store",
    },
  ),
);

// Note: For notifications, use the notifications package instead:
// import { useNotifications } from "../packages/notifications";
