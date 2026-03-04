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

/** Clamp a numeric value to a valid AI Tools sub-tab index (0, 1, or 2). */
export function clampAIToolsSubTab(value: number): 0 | 1 | 2 {
  return Math.min(2, Math.max(0, Math.floor(value))) as 0 | 1 | 2;
}

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

  // CV Editor tab state (per CV)
  cvEditorTabs: Record<string, number>;
  // AI Tools sub-tab index (0/1/2) per CV
  cvEditorAIToolsSubTab: Record<string, number>;

  // Dashboard CV list: view mode and table sort
  cvViewMode: "card" | "list";
  cvTableSortBy: string;
  cvTableSortDirection: "asc" | "desc";

  // Dashboard Job Applications list: view mode and table sort
  jobViewMode: "card" | "list";
  jobTableSortBy: string;
  jobTableSortDirection: "asc" | "desc";

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

  // CV Editor tab actions
  setCVEditorTab: (cvId: string, tabIndex: number) => void;
  getCVEditorTab: (cvId: string) => number;
  setCVEditorAIToolsSubTab: (cvId: string, subTabIndex: number) => void;
  getCVEditorAIToolsSubTab: (cvId: string) => number;

  // Dashboard CV list view and table sort
  setCVViewMode: (mode: "card" | "list") => void;
  setCVTableSort: (sortBy: string, sortDirection: "asc" | "desc") => void;

  // Dashboard Job Applications list view and table sort
  setJobViewMode: (mode: "card" | "list") => void;
  setJobTableSort: (sortBy: string, sortDirection: "asc" | "desc") => void;

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
        cvEditorTabs: {},
        cvEditorAIToolsSubTab: {},
        cvViewMode: "card",
        cvTableSortBy: "created_at",
        cvTableSortDirection: "desc",
        jobViewMode: "card",
        jobTableSortBy: "created_at",
        jobTableSortDirection: "desc",

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

        // CV Editor tab actions
        setCVEditorTab: (cvId: string, tabIndex: number) => {
          set((state) => ({
            cvEditorTabs: {
              ...state.cvEditorTabs,
              [cvId]: tabIndex,
            },
          }));
        },

        getCVEditorTab: (cvId: string) => {
          const state = get();
          return state.cvEditorTabs[cvId] ?? 0;
        },

        setCVEditorAIToolsSubTab: (cvId: string, subTabIndex: number) => {
          set((state) => ({
            cvEditorAIToolsSubTab: {
              ...state.cvEditorAIToolsSubTab,
              [cvId]: subTabIndex,
            },
          }));
        },

        getCVEditorAIToolsSubTab: (cvId: string) => {
          const state = get();
          return state.cvEditorAIToolsSubTab[cvId] ?? 0;
        },

        setCVViewMode: (mode) => set({ cvViewMode: mode }),
        setCVTableSort: (sortBy, sortDirection) =>
          set({ cvTableSortBy: sortBy, cvTableSortDirection: sortDirection }),

        setJobViewMode: (mode) => set({ jobViewMode: mode }),
        setJobTableSort: (sortBy, sortDirection) =>
          set({ jobTableSortBy: sortBy, jobTableSortDirection: sortDirection }),

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
            cvEditorTabs: {},
            cvEditorAIToolsSubTab: {},
            cvViewMode: "card",
            cvTableSortBy: "created_at",
            cvTableSortDirection: "desc",
            jobViewMode: "card",
            jobTableSortBy: "created_at",
            jobTableSortDirection: "desc",
          });
        },
      }),
      {
        name: "ui-store",
        // Only persist theme, sidebar, and dashboard CV list preferences
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          cvEditorTabs: state.cvEditorTabs,
          cvEditorAIToolsSubTab: state.cvEditorAIToolsSubTab,
          cvViewMode: state.cvViewMode,
          cvTableSortBy: state.cvTableSortBy,
          cvTableSortDirection: state.cvTableSortDirection,
          jobViewMode: state.jobViewMode,
          jobTableSortBy: state.jobTableSortBy,
          jobTableSortDirection: state.jobTableSortDirection,
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
