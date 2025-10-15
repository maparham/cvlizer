/**
 * Unit Tests for AI Store Job Description Association Actions
 *
 * These tests verify the store actions for managing JD-CV associations
 * and per-CV active job description tracking.
 */

import { renderHook, act } from "@testing-library/react";
import { useAIStore } from "../../stores/aiStore";
import { JobDescription } from "../../types/ai";
import { aiService } from "../../services/aiService";

// Mock the aiService
jest.mock("../../services/aiService", () => ({
  aiService: {
    getJobDescriptions: jest.fn(),
    associateJobDescriptionWithCV: jest.fn(),
    disassociateJobDescriptionFromCV: jest.fn(),
    clearAllCache: jest.fn(),
  },
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

describe("AI Store JD Association Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue("{}");
  });

  describe("setActiveJobDescription", () => {
    it("should set active JD for specific CV", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd1");
      expect(result.current.activeJobDescriptionIdPerCV).toEqual({
        cv1: "jd1",
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "activeJobDescriptionIdPerCV",
        JSON.stringify({ cv1: "jd1" })
      );
    });

    it("should clear active JD for specific CV", () => {
      const { result } = renderHook(() => useAIStore());

      // First set an active JD
      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      // Then clear it
      act(() => {
        result.current.setActiveJobDescription(undefined, "cv1");
      });

      expect(result.current.activeJobDescriptionId).toBeUndefined();
      expect(result.current.activeJobDescriptionIdPerCV).toEqual({});
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "activeJobDescriptionIdPerCV",
        JSON.stringify({})
      );
    });

    it("should maintain separate active JDs for different CVs", () => {
      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
        result.current.setActiveJobDescription("jd2", "cv2");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd2"); // Last set
      expect(result.current.activeJobDescriptionIdPerCV).toEqual({
        cv1: "jd1",
        cv2: "jd2",
      });
    });
  });

  describe("loadJobDescriptions", () => {
    it("should restore per-CV active JD when cvId provided", async () => {
      const mockJobDescriptions: JobDescription[] = [
        {
          id: "jd1",
          cv_id: "cv1",
          cv_ids: ["cv1", "cv2"],
          content: "Test JD 1",
          title: "Test Job 1",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
      ];

      (aiService.getJobDescriptions as jest.Mock).mockResolvedValue(mockJobDescriptions);

      const { result } = renderHook(() => useAIStore());

      // Set up per-CV active JD
      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      // Load job descriptions for cv1
      await act(async () => {
        await result.current.loadJobDescriptions("cv1");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd1");
      expect(aiService.getJobDescriptions).toHaveBeenCalled();
    });

    it("should clear active JD if it's not associated with current CV", async () => {
      const mockJobDescriptions: JobDescription[] = [
        {
          id: "jd1",
          cv_id: "cv1",
          cv_ids: ["cv1"], // Not associated with cv2
          content: "Test JD 1",
          title: "Test Job 1",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
      ];

      (aiService.getJobDescriptions as jest.Mock).mockResolvedValue(mockJobDescriptions);

      const { result } = renderHook(() => useAIStore());

      // Set up per-CV active JD for cv1
      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      // Load job descriptions for cv2 (different CV)
      await act(async () => {
        await result.current.loadJobDescriptions("cv2");
      });

      expect(result.current.activeJobDescriptionId).toBeUndefined();
    });
  });

  describe("associateJobDescriptionWithCV", () => {
    it("should associate JD with CV and update state", async () => {
      (aiService.associateJobDescriptionWithCV as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAIStore());

      await act(async () => {
        await result.current.associateJobDescriptionWithCV("jd1", "cv1");
      });

      expect(aiService.associateJobDescriptionWithCV).toHaveBeenCalledWith("jd1", "cv1");
      expect(aiService.clearAllCache).toHaveBeenCalled();
    });

    it("should handle association errors gracefully", async () => {
      const error = new Error("Association failed");
      (aiService.associateJobDescriptionWithCV as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAIStore());

      await act(async () => {
        try {
          await result.current.associateJobDescriptionWithCV("jd1", "cv1");
        } catch (e) {
          // Expected to throw
        }
      });

      expect(aiService.associateJobDescriptionWithCV).toHaveBeenCalledWith("jd1", "cv1");
    });
  });

  describe("disassociateJobDescriptionFromCV", () => {
    it("should disassociate JD from CV and update state", async () => {
      (aiService.disassociateJobDescriptionFromCV as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAIStore());

      await act(async () => {
        await result.current.disassociateJobDescriptionFromCV("jd1", "cv1");
      });

      expect(aiService.disassociateJobDescriptionFromCV).toHaveBeenCalledWith("jd1", "cv1");
      expect(aiService.clearAllCache).toHaveBeenCalled();
    });

    it("should clear active JD if it was the active one for the CV", async () => {
      const mockJobDescriptions: JobDescription[] = [
        {
          id: "jd1",
          cv_id: "cv1",
          cv_ids: ["cv1"],
          content: "Test JD 1",
          title: "Test Job 1",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
      ];

      (aiService.getJobDescriptions as jest.Mock).mockResolvedValue(mockJobDescriptions);
      (aiService.disassociateJobDescriptionFromCV as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAIStore());

      // Set up initial state
      act(() => {
        result.current.jobDescriptions = mockJobDescriptions;
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      await act(async () => {
        await result.current.disassociateJobDescriptionFromCV("jd1", "cv1");
      });

      // Active JD should be cleared from per-CV map
      expect(result.current.activeJobDescriptionIdPerCV).toEqual({});
    });
  });

  describe("useCVJobDescriptions selector", () => {
    it("should filter JDs by cv_ids array", () => {
      const mockJobDescriptions: JobDescription[] = [
        {
          id: "jd1",
          cv_id: "cv1",
          cv_ids: ["cv1", "cv2"],
          content: "Test JD 1",
          title: "Test Job 1",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
        {
          id: "jd2",
          cv_id: "cv1",
          cv_ids: ["cv1"],
          content: "Test JD 2",
          title: "Test Job 2",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
        {
          id: "jd3",
          cv_id: "cv2",
          cv_ids: ["cv2"],
          content: "Test JD 3",
          title: "Test Job 3",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
      ];

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = mockJobDescriptions;
      });

      // Test filtering for cv1
      const { result: cv1Result } = renderHook(() => {
        return useAIStore((state) =>
          state.jobDescriptions.filter((jd) => jd.cv_ids.includes("cv1"))
        );
      });

      expect(cv1Result.current).toHaveLength(2);
      expect(cv1Result.current.map(jd => jd.id)).toEqual(["jd1", "jd2"]);

      // Test filtering for cv2
      const { result: cv2Result } = renderHook(() => {
        return useAIStore((state) =>
          state.jobDescriptions.filter((jd) => jd.cv_ids.includes("cv2"))
        );
      });

      expect(cv2Result.current).toHaveLength(2);
      expect(cv2Result.current.map(jd => jd.id)).toEqual(["jd1", "jd3"]);
    });
  });

  describe("clearJobDescriptionsForCV", () => {
    it("should clear active JD if it belongs to the CV being cleared", () => {
      const mockJobDescriptions: JobDescription[] = [
        {
          id: "jd1",
          cv_id: "cv1",
          cv_ids: ["cv1"],
          content: "Test JD 1",
          title: "Test Job 1",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
      ];

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = mockJobDescriptions;
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      act(() => {
        result.current.clearJobDescriptionsForCV("cv1");
      });

      expect(result.current.activeJobDescriptionId).toBeUndefined();
      expect(result.current.jobDescriptions).toHaveLength(0);
    });

    it("should not clear active JD if it doesn't belong to the CV being cleared", () => {
      const mockJobDescriptions: JobDescription[] = [
        {
          id: "jd1",
          cv_id: "cv1",
          cv_ids: ["cv1"],
          content: "Test JD 1",
          title: "Test Job 1",
          company: "Test Company",
          location: "Test Location",
          source_url: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          hidden: false,
          is_parsing: false,
          parse_error: null,
        },
      ];

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.jobDescriptions = mockJobDescriptions;
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      act(() => {
        result.current.clearJobDescriptionsForCV("cv2");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd1");
      expect(result.current.jobDescriptions).toHaveLength(1);
    });
  });

  describe("JD sharing between CVs", () => {
    test("loadJobDescriptions loads all user JDs regardless of CV", async () => {
      const mockJDs = [
        createMockJD("jd1", "cv1", ["cv1", "cv2"]), // Associated with cv1 and cv2
        createMockJD("jd2", "cv1", ["cv1"]), // Only associated with cv1
        createMockJD("jd3", "cv2", ["cv2", "cv3"]), // Associated with cv2 and cv3
      ];

      vi.mocked(aiService.getJobDescriptions).mockResolvedValue(mockJDs);

      const { result } = renderHook(() => useAIStore());

      // Load JDs for cv1
      await act(async () => {
        await result.current.loadJobDescriptions("cv1");
      });

      // Should load ALL user JDs, not just those associated with cv1
      expect(result.current.jobDescriptions).toHaveLength(3);
      expect(result.current.jobDescriptions[0].id).toBe("jd1");
      expect(result.current.jobDescriptions[1].id).toBe("jd2");
      expect(result.current.jobDescriptions[2].id).toBe("jd3");

      // Load JDs for cv2
      await act(async () => {
        await result.current.loadJobDescriptions("cv2");
      });

      // Should still have all 3 JDs
      expect(result.current.jobDescriptions).toHaveLength(3);
    });

    test("useCVJobDescriptions filters JDs by CV association", () => {
      const mockJDs = [
        createMockJD("jd1", "cv1", ["cv1", "cv2"]),
        createMockJD("jd2", "cv1", ["cv1"]),
        createMockJD("jd3", "cv2", ["cv2", "cv3"]),
      ];

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setJobDescriptions(mockJDs);
      });

      // Test cv1 should see jd1 and jd2
      const { result: cv1Hook } = renderHook(() => useCVJobDescriptions("cv1"));
      expect(cv1Hook.current).toHaveLength(2);
      expect(cv1Hook.current[0].id).toBe("jd1");
      expect(cv1Hook.current[1].id).toBe("jd2");

      // Test cv2 should see jd1 and jd3
      const { result: cv2Hook } = renderHook(() => useCVJobDescriptions("cv2"));
      expect(cv2Hook.current).toHaveLength(2);
      expect(cv2Hook.current[0].id).toBe("jd1");
      expect(cv2Hook.current[1].id).toBe("jd3");

      // Test cv3 should only see jd3
      const { result: cv3Hook } = renderHook(() => useCVJobDescriptions("cv3"));
      expect(cv3Hook.current).toHaveLength(1);
      expect(cv3Hook.current[0].id).toBe("jd3");
    });

    test("associateJobDescriptionWithCV adds CV to jd.cv_ids array", async () => {
      const mockJD = createMockJD("jd1", "cv1", ["cv1"]);
      const updatedJD = createMockJD("jd1", "cv1", ["cv1", "cv2"]);

      vi.mocked(aiService.associateJobDescriptionWithCV).mockResolvedValue(undefined);
      vi.mocked(aiService.getJobDescriptions).mockResolvedValue([updatedJD]);

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setJobDescriptions([mockJD]);
      });

      await act(async () => {
        await result.current.associateJobDescriptionWithCV("jd1", "cv2");
      });

      expect(aiService.associateJobDescriptionWithCV).toHaveBeenCalledWith("jd1", "cv2");
      expect(result.current.jobDescriptions[0].cv_ids).toEqual(["cv1", "cv2"]);
    });

    test("disassociateJobDescriptionFromCV removes CV from jd.cv_ids array", async () => {
      const mockJD = createMockJD("jd1", "cv1", ["cv1", "cv2"]);
      const updatedJD = createMockJD("jd1", "cv1", ["cv1"]);

      vi.mocked(aiService.disassociateJobDescriptionFromCV).mockResolvedValue(undefined);
      vi.mocked(aiService.getJobDescriptions).mockResolvedValue([updatedJD]);

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setJobDescriptions([mockJD]);
      });

      await act(async () => {
        await result.current.disassociateJobDescriptionFromCV("jd1", "cv2");
      });

      expect(aiService.disassociateJobDescriptionFromCV).toHaveBeenCalledWith("jd1", "cv2");
      expect(result.current.jobDescriptions[0].cv_ids).toEqual(["cv1"]);
    });
  });

  describe("Independent JD selection per CV", () => {
    test("setActiveJobDescription maintains per-CV active JDs", () => {
      const { result } = renderHook(() => useAIStore());

      // Set active JD for cv1
      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      expect(result.current.activeJobDescriptionIdPerCV).toEqual({
        cv1: "jd1"
      });

      // Set active JD for cv2
      act(() => {
        result.current.setActiveJobDescription("jd2", "cv2");
      });

      expect(result.current.activeJobDescriptionIdPerCV).toEqual({
        cv1: "jd1",
        cv2: "jd2"
      });

      // Change active JD for cv1
      act(() => {
        result.current.setActiveJobDescription("jd3", "cv1");
      });

      expect(result.current.activeJobDescriptionIdPerCV).toEqual({
        cv1: "jd3",
        cv2: "jd2"
      });
    });

    test("loadJobDescriptions restores correct active JD for each CV", async () => {
      const mockJDs = [
        createMockJD("jd1", "cv1", ["cv1", "cv2"]),
        createMockJD("jd2", "cv2", ["cv2", "cv3"]),
      ];

      vi.mocked(aiService.getJobDescriptions).mockResolvedValue(mockJDs);

      const { result } = renderHook(() => useAIStore());

      // Set up localStorage with per-CV active JDs
      const savedState = {
        cv1: "jd1",
        cv2: "jd2",
      };
      localStorage.setItem("activeJobDescriptionIdPerCV", JSON.stringify(savedState));

      // Load JDs for cv1
      await act(async () => {
        await result.current.loadJobDescriptions("cv1");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd1");

      // Load JDs for cv2
      await act(async () => {
        await result.current.loadJobDescriptions("cv2");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd2");
    });

    test("loadJobDescriptions clears active JD if not valid for current CV", async () => {
      const mockJDs = [
        createMockJD("jd1", "cv1", ["cv1"]), // Only associated with cv1
        createMockJD("jd2", "cv2", ["cv2"]), // Only associated with cv2
      ];

      vi.mocked(aiService.getJobDescriptions).mockResolvedValue(mockJDs);

      const { result } = renderHook(() => useAIStore());

      // Set up localStorage with jd2 active for cv1 (invalid)
      const savedState = {
        cv1: "jd2", // jd2 is not associated with cv1
      };
      localStorage.setItem("activeJobDescriptionIdPerCV", JSON.stringify(savedState));

      // Load JDs for cv1
      await act(async () => {
        await result.current.loadJobDescriptions("cv1");
      });

      // Should clear active JD since jd2 is not associated with cv1
      expect(result.current.activeJobDescriptionId).toBeUndefined();
    });

    test("switching between CVs maintains independent active JDs", () => {
      const mockJDs = [
        createMockJD("jd1", "cv1", ["cv1", "cv2"]),
        createMockJD("jd2", "cv2", ["cv1", "cv2"]),
        createMockJD("jd3", "cv3", ["cv3"]),
      ];

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setJobDescriptions(mockJDs);
      });

      // Set active JD for cv1
      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd1");
      expect(result.current.activeJobDescriptionIdPerCV.cv1).toBe("jd1");

      // Set active JD for cv2
      act(() => {
        result.current.setActiveJobDescription("jd2", "cv2");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd2");
      expect(result.current.activeJobDescriptionIdPerCV.cv2).toBe("jd2");

      // Switch back to cv1 - should restore jd1
      act(() => {
        result.current.setActiveJobDescription("jd1", "cv1");
      });

      expect(result.current.activeJobDescriptionId).toBe("jd1");
      expect(result.current.activeJobDescriptionIdPerCV.cv1).toBe("jd1");
      expect(result.current.activeJobDescriptionIdPerCV.cv2).toBe("jd2"); // cv2 still has jd2
    });
  });

  describe("JD persistence across operations", () => {
    test("creating new JD preserves existing associations", async () => {
      const existingJD = createMockJD("jd1", "cv1", ["cv1", "cv2"]);
      const newJD = createMockJD("jd2", "cv1", ["cv1"]);

      vi.mocked(aiService.createJobDescription).mockResolvedValue(newJD);
      vi.mocked(aiService.getJobDescriptions).mockResolvedValue([existingJD, newJD]);

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setJobDescriptions([existingJD]);
      });

      await act(async () => {
        await result.current.createJobDescription({
          content: "New job description",
          title: "New Role",
          company: "New Company",
          location: "New Location",
        });
      });

      expect(result.current.jobDescriptions).toHaveLength(2);
      expect(result.current.jobDescriptions[0].cv_ids).toEqual(["cv1", "cv2"]); // Preserved
      expect(result.current.jobDescriptions[1].cv_ids).toEqual(["cv1"]); // New JD
    });

    test("deleting JD removes it from all CVs", async () => {
      const mockJD = createMockJD("jd1", "cv1", ["cv1", "cv2", "cv3"]);

      vi.mocked(aiService.deleteJobDescription).mockResolvedValue(undefined);
      vi.mocked(aiService.getJobDescriptions).mockResolvedValue([]);

      const { result } = renderHook(() => useAIStore());

      act(() => {
        result.current.setJobDescriptions([mockJD]);
        result.current.setActiveJobDescription("jd1", "cv1");
        result.current.setActiveJobDescription("jd1", "cv2");
      });

      await act(async () => {
        await result.current.deleteJobDescription("jd1");
      });

      expect(result.current.jobDescriptions).toHaveLength(0);
      expect(result.current.activeJobDescriptionId).toBeUndefined();
      expect(result.current.activeJobDescriptionIdPerCV.cv1).toBeUndefined();
      expect(result.current.activeJobDescriptionIdPerCV.cv2).toBeUndefined();
    });
  });
});
