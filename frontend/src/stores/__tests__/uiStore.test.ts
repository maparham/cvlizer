import { renderHook, act } from "@testing-library/react";
import { useUIStore } from "../uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    // Clear localStorage and reset store before each test
    localStorage.clear();
    useUIStore.getState().reset();
  });

  it("should initialize with correct default values", () => {
    const { result } = renderHook(() => useUIStore());

    expect(result.current.theme).toBe("auto");
    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.globalLoading).toBe(false);
    expect(result.current.dialogs).toEqual({
      confirmDelete: false,
      unsavedChanges: false,
      cvUpload: false,
    });
  });

  describe("theme management", () => {
    it("should set theme", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });
  });

  describe("sidebar management", () => {
    it("should toggle sidebar", () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it("should set sidebar state", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  describe("loading state", () => {
    it("should set global loading state", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setGlobalLoading(true);
      });

      expect(result.current.globalLoading).toBe(true);

      act(() => {
        result.current.setGlobalLoading(false);
      });

      expect(result.current.globalLoading).toBe(false);
    });
  });

  // Note: Notifications are handled by the notifications package, not uiStore

  describe("dialogs", () => {
    it("should open dialog", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openDialog("confirmDelete");
      });

      expect(result.current.dialogs.confirmDelete).toBe(true);
    });

    it("should close dialog", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openDialog("confirmDelete");
      });

      expect(result.current.dialogs.confirmDelete).toBe(true);

      act(() => {
        result.current.closeDialog("confirmDelete");
      });

      expect(result.current.dialogs.confirmDelete).toBe(false);
    });

    it("should close all dialogs", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openDialog("confirmDelete");
        result.current.openDialog("unsavedChanges");
        result.current.openDialog("cvUpload");
      });

      expect(result.current.dialogs.confirmDelete).toBe(true);
      expect(result.current.dialogs.unsavedChanges).toBe(true);
      expect(result.current.dialogs.cvUpload).toBe(true);

      act(() => {
        result.current.closeAllDialogs();
      });

      expect(result.current.dialogs.confirmDelete).toBe(false);
      expect(result.current.dialogs.unsavedChanges).toBe(false);
      expect(result.current.dialogs.cvUpload).toBe(false);
    });
  });

  // Note: Notifications utility functions are in the notifications package
  // Note: Persistence tests are skipped as they require more complex setup
  // The store uses Zustand's persist middleware which may not work properly in test environment
});
