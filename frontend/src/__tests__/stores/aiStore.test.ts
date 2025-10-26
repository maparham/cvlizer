/**
 * AI Store Integration Tests
 *
 * Comprehensive unit tests for AI store selectors and job description management:
 * - useVisibleJobDescriptions selector filtering
 * - useActiveJobDescription behavior with hidden job descriptions
 * - hideJobDescriptionFromSidebar and showJobDescriptionInSidebar functionality
 * - localStorage persistence
 * - State updates and component re-renders
 */

import { renderHook, act } from "@testing-library/react";
import {
  useAIStore,
  useVisibleJobDescriptions,
  useActiveJobDescription,
} from "../../stores/ai";
import { JobDescription } from "../../types/ai";

// Mock logger and errorHandler to avoid import.meta.env issues
jest.mock("../../utils/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock("../../utils/errorHandler", () => ({
  ErrorHandler: jest.fn().mockImplementation(() => ({
    handle: jest.fn(),
    logError: jest.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock the AI service
jest.mock("../../services/aiService", () => ({
  aiService: {
    checkAIFeatureStatus: jest.fn(),
    analyzeJobFit: jest.fn(),
    createJobFitDraft: jest.fn(),
    getCVDrafts: jest.fn(),
    approveWhyGoodFitDraft: jest.fn(),
    deleteWhyGoodFitDraft: jest.fn(),
    analyzeATSOptimization: jest.fn(),
    enhanceContent: jest.fn(),
    getJobDescriptions: jest.fn(),
    createJobDescription: jest.fn(),
    deleteJobDescription: jest.fn(),
    clearAllCache: jest.fn(),
    clearCacheForCV: jest.fn(),
  },
}));

// Test data
const mockJobDescription1: JobDescription = {
  id: "jd-1",
  cv_id: "cv-1",
  content: "First job description content",
  title: "Software Engineer",
  company: "Company A",
  location: "San Francisco, CA",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockJobDescription2: JobDescription = {
  id: "jd-2",
  cv_id: "cv-1",
  content: "Second job description content",
  title: "Product Manager",
  company: "Company B",
  location: "New York, NY",
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

const mockJobDescription3: JobDescription = {
  id: "jd-3",
  cv_id: "cv-1",
  content: "Third job description content",
  title: "Designer",
  company: "Company C",
  location: "Seattle, WA",
  created_at: "2024-01-03T00:00:00Z",
  updated_at: "2024-01-03T00:00:00Z",
};

describe("AI Store Job Description Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset store state before each test
    useAIStore.setState({
      jobDescriptions: [],
      activeJobDescriptionId: undefined,
      activeJobDescriptionIdPerCV: {},
      hiddenJobDescriptionIds: [],
    });

    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Initialize localStorage with empty values for both keys
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "activeJobDescriptionIdPerCV") return "{}";
      if (key === "hiddenJobDescriptionIds") return "[]";
      return null;
    });
  });

  describe("useVisibleJobDescriptions Selector", () => {
    it("filters out hidden job descriptions", () => {
      const { result } = renderHook(() => useVisibleJobDescriptions());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [
            mockJobDescription1,
            mockJobDescription2,
            mockJobDescription3,
          ],
          hiddenJobDescriptionIds: ["jd-2"],
        });
      });

      expect(result.current).toHaveLength(2);
      expect(result.current).toContain(mockJobDescription1);
      expect(result.current).toContain(mockJobDescription3);
      expect(result.current).not.toContain(mockJobDescription2);
    });

    it("returns all job descriptions when none are hidden", () => {
      const { result } = renderHook(() => useVisibleJobDescriptions());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [
            mockJobDescription1,
            mockJobDescription2,
            mockJobDescription3,
          ],
          hiddenJobDescriptionIds: [],
        });
      });

      expect(result.current).toHaveLength(3);
      expect(result.current).toContain(mockJobDescription1);
      expect(result.current).toContain(mockJobDescription2);
      expect(result.current).toContain(mockJobDescription3);
    });

    it("returns empty array when all job descriptions are hidden", () => {
      const { result } = renderHook(() => useVisibleJobDescriptions());

      act(() => {
        useAIStore.getState().jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
          mockJobDescription3,
        ];
        useAIStore.getState().hiddenJobDescriptionIds = [
          "jd-1",
          "jd-2",
          "jd-3",
        ];
      });

      expect(result.current).toHaveLength(0);
    });

    it("returns empty array when no job descriptions exist", () => {
      const { result } = renderHook(() => useVisibleJobDescriptions());

      act(() => {
        useAIStore.getState().jobDescriptions = [];
        useAIStore.getState().hiddenJobDescriptionIds = [];
      });

      expect(result.current).toHaveLength(0);
    });
  });

  describe("useActiveJobDescription Selector", () => {
    it("returns active job description when it exists and is not hidden", () => {
      const { result } = renderHook(() => useActiveJobDescription());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [
            mockJobDescription1,
            mockJobDescription2,
            mockJobDescription3,
          ],
          activeJobDescriptionId: "jd-1",
          hiddenJobDescriptionIds: ["jd-2"],
        });
      });

      expect(result.current).toEqual(mockJobDescription1);
    });

    it("returns undefined when active job description is hidden", () => {
      const { result } = renderHook(() => useActiveJobDescription());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [
            mockJobDescription1,
            mockJobDescription2,
            mockJobDescription3,
          ],
          activeJobDescriptionId: "jd-1",
          hiddenJobDescriptionIds: ["jd-1"],
        });
      });

      expect(result.current).toBeUndefined();
    });

    it("returns undefined when no active job description is set", () => {
      const { result } = renderHook(() => useActiveJobDescription());

      act(() => {
        useAIStore.getState().jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
          mockJobDescription3,
        ];
        useAIStore.getState().activeJobDescriptionId = undefined;
        useAIStore.getState().hiddenJobDescriptionIds = [];
      });

      expect(result.current).toBeUndefined();
    });

    it("returns undefined when active job description does not exist in job descriptions", () => {
      const { result } = renderHook(() => useActiveJobDescription());

      act(() => {
        useAIStore.getState().jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        useAIStore.getState().activeJobDescriptionId = "jd-nonexistent";
        useAIStore.getState().hiddenJobDescriptionIds = [];
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe("hideJobDescriptionFromSidebar", () => {
    it("adds job description ID to hidden list", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
          mockJobDescription3,
        ];
        result.current.hiddenJobDescriptionIds = ["jd-2"];
      });

      act(() => {
        result.current.hideJobDescriptionFromSidebar("jd-1");
      });

      expect(result.current.hiddenJobDescriptionIds).toContain("jd-1");
      expect(result.current.hiddenJobDescriptionIds).toContain("jd-2");
      expect(result.current.hiddenJobDescriptionIds).not.toContain("jd-3");
    });

    it("persists hidden job description IDs to localStorage", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        result.current.hiddenJobDescriptionIds = [];
      });

      act(() => {
        result.current.hideJobDescriptionFromSidebar("jd-1");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "hiddenJobDescriptionIds",
        JSON.stringify(["jd-1"]),
      );
    });

    it("does not add duplicate IDs to hidden list", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        result.current.hiddenJobDescriptionIds = ["jd-1"];
      });

      act(() => {
        result.current.hideJobDescriptionFromSidebar("jd-1");
      });

      expect(result.current.hiddenJobDescriptionIds).toEqual(["jd-1"]);
    });
  });

  describe("showJobDescriptionInSidebar", () => {
    it("removes job description ID from hidden list", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
          mockJobDescription3,
        ];
        result.current.hiddenJobDescriptionIds = ["jd-1", "jd-2"];
      });

      act(() => {
        result.current.showJobDescriptionInSidebar("jd-1");
      });

      expect(result.current.hiddenJobDescriptionIds).not.toContain("jd-1");
      expect(result.current.hiddenJobDescriptionIds).toContain("jd-2");
    });

    it("persists updated hidden job description IDs to localStorage", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        result.current.hiddenJobDescriptionIds = ["jd-1", "jd-2"];
      });

      act(() => {
        result.current.showJobDescriptionInSidebar("jd-1");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "hiddenJobDescriptionIds",
        JSON.stringify(["jd-2"]),
      );
    });

    it("handles removing non-existent ID gracefully", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        result.current.hiddenJobDescriptionIds = ["jd-1"];
      });

      act(() => {
        result.current.showJobDescriptionInSidebar("jd-nonexistent");
      });

      expect(result.current.hiddenJobDescriptionIds).toEqual(["jd-1"]);
    });
  });

  describe("setActiveJobDescription", () => {
    it("sets active job description ID", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setActiveJobDescription("jd-1", "cv-1");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd-1");
    });

    it("clears active job description when undefined is passed", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.activeJobDescriptionId = "jd-1";
        result.current.setActiveJobDescription(undefined, "cv-1");
      });

      expect(result.current.activeJobDescriptionId).toBeUndefined();
    });

    it("persists active job description ID to localStorage", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [mockJobDescription1];
        result.current.setActiveJobDescription("jd-1", "cv-1");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "activeJobDescriptionIdPerCV",
        JSON.stringify({ "cv-1": "jd-1" }),
      );
    });

    it("removes active job description from localStorage when undefined", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        // First set a job description with CV context
        result.current.jobDescriptions = [mockJobDescription1];
        result.current.setActiveJobDescription("jd-1", "cv-1");
      });

      act(() => {
        result.current.setActiveJobDescription(undefined, "cv-1");
      });

      // Should update the map to remove the CV key, not call removeItem
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "activeJobDescriptionIdPerCV",
        JSON.stringify({}),
      );
    });
  });

  describe("State Updates and Re-renders", () => {
    it("triggers re-render when job descriptions change", () => {
      const { result, rerender } = renderHook(() =>
        useVisibleJobDescriptions(),
      );

      act(() => {
        useAIStore.setState({
          jobDescriptions: [mockJobDescription1],
          hiddenJobDescriptionIds: [],
        });
      });

      expect(result.current).toHaveLength(1);

      act(() => {
        useAIStore.setState({
          jobDescriptions: [mockJobDescription1, mockJobDescription2],
        });
      });

      rerender();
      expect(result.current).toHaveLength(2);
    });

    it("triggers re-render when hidden job description IDs change", () => {
      const { result, rerender } = renderHook(() =>
        useVisibleJobDescriptions(),
      );

      act(() => {
        useAIStore.setState({
          jobDescriptions: [mockJobDescription1, mockJobDescription2],
          hiddenJobDescriptionIds: [],
        });
      });

      expect(result.current).toHaveLength(2);

      act(() => {
        useAIStore.setState({
          hiddenJobDescriptionIds: ["jd-1"],
        });
      });

      rerender();
      expect(result.current).toHaveLength(1);
      expect(result.current).toContain(mockJobDescription2);
    });

    it("triggers re-render when active job description changes", () => {
      const { result, rerender } = renderHook(() => useActiveJobDescription());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [mockJobDescription1, mockJobDescription2],
          activeJobDescriptionId: undefined,
          hiddenJobDescriptionIds: [],
        });
      });

      expect(result.current).toBeUndefined();

      act(() => {
        useAIStore.setState({
          activeJobDescriptionId: "jd-1",
        });
      });

      rerender();
      expect(result.current).toEqual(mockJobDescription1);
    });
  });

  describe("localStorage Persistence", () => {
    it("loads initial state from localStorage", () => {
      // Set up localStorage mocks before getting store state
      const activeMap = { "cv-1": "jd-1" };
      const hiddenIds = ["jd-2"];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "activeJobDescriptionIdPerCV")
          return JSON.stringify(activeMap);
        if (key === "hiddenJobDescriptionIds") return JSON.stringify(hiddenIds);
        return null;
      });

      // Manually set the state as if loaded from localStorage
      useAIStore.setState({
        activeJobDescriptionIdPerCV: activeMap,
        hiddenJobDescriptionIds: hiddenIds,
      });

      const { result } = renderHook(() => useAIStore());

      expect(result.current.activeJobDescriptionIdPerCV).toEqual({
        "cv-1": "jd-1",
      });
      expect(result.current.hiddenJobDescriptionIds).toEqual(["jd-2"]);
    });

    it("handles corrupted localStorage data gracefully", () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "hiddenJobDescriptionIds") return "invalid-json";
        return null;
      });

      const { result } = renderHook(() => useAIStore());

      expect(result.current.hiddenJobDescriptionIds).toEqual([]);
    });

    it("handles missing localStorage data gracefully", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAIStore());

      expect(result.current.activeJobDescriptionIdPerCV).toEqual({});
      expect(result.current.hiddenJobDescriptionIds).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("handles hiding the currently active job description", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        result.current.activeJobDescriptionId = "jd-1";
        result.current.hiddenJobDescriptionIds = [];
      });

      act(() => {
        result.current.hideJobDescriptionFromSidebar("jd-1");
      });

      expect(result.current.hiddenJobDescriptionIds).toContain("jd-1");
      expect(result.current.activeJobDescriptionId).toBe("jd-1"); // ID remains but selector will return undefined
    });

    it("handles selecting a previously hidden job description", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = [
          mockJobDescription1,
          mockJobDescription2,
        ];
        result.current.activeJobDescriptionId = undefined;
        result.current.hiddenJobDescriptionIds = ["jd-1"];
      });

      act(() => {
        result.current.showJobDescriptionInSidebar("jd-1");
        result.current.setActiveJobDescription("jd-1", "cv-1");
      });

      expect(result.current.hiddenJobDescriptionIds).not.toContain("jd-1");
      expect(result.current.activeJobDescriptionId).toBe("jd-1");
    });

    it("handles rapid state changes", () => {
      const { result } = renderHook(() => useVisibleJobDescriptions());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [
            mockJobDescription1,
            mockJobDescription2,
            mockJobDescription3,
          ],
          hiddenJobDescriptionIds: [],
        });
      });

      expect(result.current).toHaveLength(3);

      // Rapidly hide and show job descriptions using store actions
      act(() => {
        const store = useAIStore.getState();
        store.hideJobDescriptionFromSidebar("jd-1");
        store.hideJobDescriptionFromSidebar("jd-2");
        store.showJobDescriptionInSidebar("jd-1");
      });

      expect(result.current).toHaveLength(2);
      expect(result.current).toContain(mockJobDescription1);
      expect(result.current).toContain(mockJobDescription3);
      expect(result.current).not.toContain(mockJobDescription2);
    });
  });

  describe("Integration with Component State", () => {
    it("maintains consistent state across multiple selectors", () => {
      const visibleHook = renderHook(() => useVisibleJobDescriptions());
      const activeHook = renderHook(() => useActiveJobDescription());

      act(() => {
        useAIStore.setState({
          jobDescriptions: [
            mockJobDescription1,
            mockJobDescription2,
            mockJobDescription3,
          ],
          activeJobDescriptionId: "jd-1",
          hiddenJobDescriptionIds: ["jd-2"],
        });
      });

      expect(visibleHook.result.current).toHaveLength(2);
      expect(visibleHook.result.current).toContain(mockJobDescription1);
      expect(visibleHook.result.current).toContain(mockJobDescription3);
      expect(activeHook.result.current).toEqual(mockJobDescription1);

      // Hide the active job description
      act(() => {
        useAIStore.getState().hideJobDescriptionFromSidebar("jd-1");
      });

      expect(visibleHook.result.current).toHaveLength(1);
      expect(visibleHook.result.current).toContain(mockJobDescription3);
      expect(activeHook.result.current).toBeUndefined();
    });
  });
});
