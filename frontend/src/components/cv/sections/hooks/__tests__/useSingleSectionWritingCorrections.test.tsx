/**
 * Tests for useSingleSectionWritingCorrections.
 * Mocks stores and aiService to assert description correction lookup and apply/dismiss behavior.
 */

import { renderHook, act } from "@testing-library/react";
import { useSingleSectionWritingCorrections } from "../useSingleSectionWritingCorrections";
import type { WritingCorrection, FieldCorrection } from "../../../../../types/ai";

jest.mock("../../../../../stores/cvQualityStore", () => ({
  useValidatedQualityAnalysis: jest.fn(),
  useCVQualityStore: jest.fn(),
}));

jest.mock("../../../../../stores/cv", () => ({
  useCVStore: jest.fn(),
}));

jest.mock("../../../../../packages/notifications", () => ({
  useNotifications: jest.fn(),
}));

jest.mock("../../../../../services/ai", () => ({
  aiService: {
    applyWritingCorrection: jest.fn(),
  },
}));

const mockUseValidatedQualityAnalysis =
  require("../../../../../stores/cvQualityStore").useValidatedQualityAnalysis;
const mockUseCVQualityStore =
  require("../../../../../stores/cvQualityStore").useCVQualityStore;
const mockUseCVStore = require("../../../../../stores/cv").useCVStore;
const mockUseNotifications =
  require("../../../../../packages/notifications").useNotifications;
const mockApplyWritingCorrection =
  require("../../../../../services/ai").aiService.applyWritingCorrection;

function setDefaultMocks() {
  mockUseValidatedQualityAnalysis.mockReturnValue(null);
  mockUseCVQualityStore.mockReturnValue({
    dismissWritingCorrection: jest.fn().mockResolvedValue(undefined),
    currentAnalysisId: "analysis-1",
  });
  mockUseCVStore.mockImplementation((selector: (s: unknown) => unknown) => {
    const state = {
      setCurrentCV: jest.fn(),
      updateCVInList: jest.fn(),
    };
    return selector(state);
  });
  mockUseNotifications.mockReturnValue({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  });
}

describe("useSingleSectionWritingCorrections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDefaultMocks();
  });

  const baseParams = {
    cvId: "cv-1",
    sectionKeys: ["professional_summary"],
    getValueFromCV: (cv: { parsed_data?: Record<string, unknown> }) =>
      (cv.parsed_data?.professional_summary as { content?: string } | undefined)
        ?.content ?? "",
    formFieldName: "content",
  };

  describe("descriptionCorrection", () => {
    it("is null when there are no matching writing corrections", () => {
      mockUseValidatedQualityAnalysis.mockReturnValue({
        issues: [],
        overall_quality_score: 70,
        skills: {},
        timeline_gaps: [],
      });

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections(baseParams)
      );

      expect(result.current.descriptionCorrection).toBeNull();
    });

    it("is set when there is a matching correction for the section (description field)", () => {
      mockUseValidatedQualityAnalysis.mockReturnValue({
        issues: [
          {
            item_type: "personal_info",
            item_id: null,
            field_path: "personal_info.description",
            issue_severity: "minor",
            issue_category: "unprofessional_tone",
            quality_score: null,
            reasoning: "Improve tone",
            html_diff: "<del>Old</del><ins>New</ins>",
            coaching: null,
            original: "Old bio",
            suggested: "New bio",
          },
        ],
        overall_quality_score: 70,
        skills: {},
        timeline_gaps: [],
      });

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections({
          ...baseParams,
          sectionKeys: ["personal_info", "personal_info.description"],
          getValueFromCV: (cv) =>
            (cv.parsed_data?.personal_info as { description?: string } | undefined)
              ?.description ?? "",
          formFieldName: "description",
        })
      );

      expect(result.current.descriptionCorrection).not.toBeNull();
      expect(result.current.descriptionCorrection?.correction.item_id).toBe("");
      expect(result.current.descriptionCorrection?.correction.field_path).toBe(
        "personal_info.description"
      );
      expect(result.current.descriptionCorrection?.html_diff).toContain(
        "Old"
      );
    });

    it("finds correction when formFieldName is content (Professional Summary)", () => {
      mockUseValidatedQualityAnalysis.mockReturnValue({
        issues: [
          {
            item_type: "professional_summary",
            item_id: "professional_summary",
            field_path: "professional_summary",
            issue_severity: "minor",
            issue_category: "too_brief",
            quality_score: null,
            reasoning: "Expand",
            html_diff: "<del>Weak</del><ins>Strong</ins>",
            coaching: null,
            original: "Weak summary text",
            suggested: "Strong summary text",
          },
        ],
        overall_quality_score: 70,
        skills: {},
        timeline_gaps: [],
      });

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections(baseParams)
      );

      expect(result.current.descriptionCorrection).not.toBeNull();
      expect(result.current.descriptionCorrection?.correction.field_path).toBe(
        "professional_summary"
      );
      expect(result.current.descriptionCorrection?.html_diff).toContain(
        "Weak"
      );
    });
  });

  describe("handleApplyFieldCorrection", () => {
    it("calls API and dismiss when applied", async () => {
      const correction: WritingCorrection = {
        item_id: "professional_summary",
        field_path: "professional_summary",
        field_corrections: [
          {
            field_name: "content",
            original_value: "x",
            html_diff: "<ins>y</ins>",
          },
        ],
        importance: "standard",
      };
      mockUseValidatedQualityAnalysis.mockReturnValue({
        issues: [
          {
            item_type: "professional_summary",
            item_id: "professional_summary",
            field_path: "professional_summary",
            issue_severity: "minor",
            issue_category: "too_brief",
            quality_score: null,
            reasoning: "",
            html_diff: "<ins>y</ins>",
            coaching: null,
            original: "x",
            suggested: "y",
          },
        ],
        overall_quality_score: 70,
        skills: {},
        timeline_gaps: [],
      });
      const dismissWritingCorrection = jest.fn().mockResolvedValue(undefined);
      mockUseCVQualityStore.mockReturnValue({
        dismissWritingCorrection,
        currentAnalysisId: "analysis-1",
      });
      mockApplyWritingCorrection.mockResolvedValue({
        id: "cv-1",
        parsed_data: { professional_summary: { content: "y" } },
      });

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections(baseParams)
      );

      const desc = result.current.descriptionCorrection;
      expect(desc).not.toBeNull();
      const fieldCorrection: FieldCorrection = desc!.correction.field_corrections![0];
      const parentCorrection = desc!.correction;

      await act(async () => {
        await result.current.handleApplyFieldCorrection(
          fieldCorrection,
          parentCorrection
        );
      });

      expect(mockApplyWritingCorrection).toHaveBeenCalledWith(
        "cv-1",
        "analysis-1",
        "professional_summary",
        0
      );
      expect(dismissWritingCorrection).toHaveBeenCalledWith(
        parentCorrection.item_id,
        parentCorrection.field_path
      );
    });
  });

  describe("createWritingCorrectionHandler (edit mode)", () => {
    it("updates form state via updateData and onSaveCallback when in edit mode", async () => {
      const correction: WritingCorrection = {
        item_id: "professional_summary",
        field_path: "professional_summary",
        field_corrections: [
          {
            field_name: "content",
            original_value: "old",
            html_diff: "<ins>new</ins>",
          },
        ],
        importance: "standard",
      };
      mockUseValidatedQualityAnalysis.mockReturnValue({
        issues: [
          {
            item_type: "professional_summary",
            item_id: "professional_summary",
            field_path: "professional_summary",
            issue_severity: "minor",
            issue_category: "too_brief",
            quality_score: null,
            reasoning: "",
            html_diff: "<ins>new</ins>",
            coaching: null,
            original: "old",
            suggested: "new",
          },
        ],
        overall_quality_score: 70,
        skills: {},
        timeline_gaps: [],
      });
      const dismissWritingCorrection = jest.fn().mockResolvedValue(undefined);
      mockUseCVQualityStore.mockReturnValue({
        dismissWritingCorrection,
        currentAnalysisId: "analysis-1",
      });
      const updatedCV = {
        id: "cv-1",
        parsed_data: { professional_summary: { content: "new" } },
      };
      mockApplyWritingCorrection.mockResolvedValue(updatedCV);

      const updateData = jest.fn();
      const onSaveCallback = jest.fn().mockResolvedValue(undefined);
      const editData = { content: "old" };

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections(baseParams)
      );

      const desc = result.current.descriptionCorrection;
      expect(desc).not.toBeNull();
      const handler = result.current.createWritingCorrectionHandler(
        "edit",
        editData,
        updateData,
        onSaveCallback
      );

      await act(async () => {
        await handler(desc!.correction.field_corrections![0], desc!.correction);
      });

      expect(updateData).toHaveBeenCalledWith("content", "new");
      expect(onSaveCallback).toHaveBeenCalledWith({ content: "new" });
    });
  });
});
