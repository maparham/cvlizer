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
        writing_corrections: [],
      });

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections(baseParams)
      );

      expect(result.current.descriptionCorrection).toBeNull();
    });

    it("is set when there is a matching correction for the section (description field)", () => {
      const correction: WritingCorrection = {
        item_id: "personal_info",
        section: "personal_info.description",
        field_corrections: [
          {
            field_name: "description",
            original_value: "Old bio",
            html_diff: "<del>Old</del><ins>New</ins>",
          },
        ],
        importance: "standard",
      };
      mockUseValidatedQualityAnalysis.mockReturnValue({
        writing_corrections: [correction],
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
      expect(result.current.descriptionCorrection?.correction.item_id).toBe(
        "personal_info"
      );
      expect(result.current.descriptionCorrection?.html_diff).toContain(
        "Old"
      );
    });

    it("finds correction when formFieldName is content and API returns field_name content (Professional Summary regression)", () => {
      const correction: WritingCorrection = {
        item_id: "professional_summary",
        section: "professional_summary",
        field_corrections: [
          {
            field_name: "content",
            original_value: "Weak summary text",
            html_diff: "<del>Weak</del><ins>Strong</ins>",
          },
        ],
        importance: "standard",
      };
      mockUseValidatedQualityAnalysis.mockReturnValue({
        writing_corrections: [correction],
      });

      const { result } = renderHook(() =>
        useSingleSectionWritingCorrections(baseParams)
      );

      expect(result.current.descriptionCorrection).not.toBeNull();
      expect(result.current.descriptionCorrection?.correction.section).toBe(
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
        section: "professional_summary",
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
        writing_corrections: [correction],
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

      const fieldCorrection: FieldCorrection = correction.field_corrections![0];

      await act(async () => {
        await result.current.handleApplyFieldCorrection(
          fieldCorrection,
          correction
        );
      });

      expect(mockApplyWritingCorrection).toHaveBeenCalledWith(
        "cv-1",
        "analysis-1",
        "professional_summary"
      );
      expect(dismissWritingCorrection).toHaveBeenCalledWith(
        "professional_summary",
        "professional_summary"
      );
    });
  });

  describe("createWritingCorrectionHandler (edit mode)", () => {
    it("updates form state via updateData and onSaveCallback when in edit mode", async () => {
      const correction: WritingCorrection = {
        item_id: "professional_summary",
        section: "professional_summary",
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
        writing_corrections: [correction],
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

      const handler = result.current.createWritingCorrectionHandler(
        "edit",
        editData,
        updateData,
        onSaveCallback
      );

      await act(async () => {
        await handler(correction.field_corrections![0], correction);
      });

      expect(updateData).toHaveBeenCalledWith("content", "new");
      expect(onSaveCallback).toHaveBeenCalledWith({ content: "new" });
    });
  });
});
