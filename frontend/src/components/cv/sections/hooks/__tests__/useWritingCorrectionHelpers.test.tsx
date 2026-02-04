/**
 * Tests for useWritingCorrectionHelpers.
 * Covers findWritingCorrectionForField, getCorrectionMetadata, getDescriptionCorrection
 * (including fieldName and legacy html_diff fallback). No store/API mocks.
 */

import { renderHook } from "@testing-library/react";
import { useWritingCorrectionHelpers } from "../useWritingCorrectionHelpers";
import type { WritingCorrection, FieldCorrection } from "../../../../../types/ai";

const mockFieldCorrection1: FieldCorrection = {
  field_name: "company",
  original_value: "Google Inc",
  html_diff: "<del>Google Inc</del><ins>Google</ins>",
  reasoning: "Use official company name",
};

const mockFieldCorrection2: FieldCorrection = {
  field_name: "position",
  original_value: "Developer",
  html_diff: "<del>Developer</del><ins>Software Engineer</ins>",
};

const mockFieldCorrection3: FieldCorrection = {
  field_name: "description",
  original_value: "Built web apps",
  html_diff: "<del>Built web apps</del><ins>Developed scalable web applications</ins>",
  reasoning: "Be more specific",
};

const mockWritingCorrections: WritingCorrection[] = [
  {
    item_id: "work-1",
    section: "work_experience",
    field_corrections: [
      mockFieldCorrection1,
      mockFieldCorrection2,
      mockFieldCorrection3,
    ],
    importance: "highly_recommended",
  },
];

const mockWritingCorrectionContent: WritingCorrection = {
  item_id: "professional_summary",
  section: "professional_summary",
  field_corrections: [
    {
      field_name: "content",
      original_value: "Weak summary",
      html_diff: "<del>Weak</del><ins>Strong</ins>",
      reasoning: "Stronger opening",
    },
  ],
  importance: "standard",
};

const mockLegacyCorrection: WritingCorrection = {
  item_id: "work-2",
  section: "work_experience",
  html_diff: "- Old description\n+ New improved description",
  importance: "standard",
};

describe("useWritingCorrectionHelpers", () => {
  describe("findWritingCorrectionForField", () => {
    it("finds correction when field name and original value match", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const found = result.current.findWritingCorrectionForField(
        "company",
        "Google Inc"
      );

      expect(found).toBeDefined();
      expect(found?.item_id).toBe("work-1");
      expect(found?.importance).toBe("highly_recommended");
    });

    it("returns undefined when field name does not match", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const found = result.current.findWritingCorrectionForField(
        "nonexistent",
        "Google Inc"
      );

      expect(found).toBeUndefined();
    });

    it("returns undefined when original value does not match", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const found = result.current.findWritingCorrectionForField(
        "company",
        "Microsoft"
      );

      expect(found).toBeUndefined();
    });

    it("handles empty corrections array", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers([])
      );

      const found = result.current.findWritingCorrectionForField(
        "company",
        "Google Inc"
      );

      expect(found).toBeUndefined();
    });

    it("handles WritingCorrection without field_corrections", () => {
      const correctionsWithoutFields: WritingCorrection[] = [
        {
          item_id: "work-3",
          section: "work_experience",
          importance: "standard",
        },
      ];

      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(correctionsWithoutFields)
      );

      const found = result.current.findWritingCorrectionForField(
        "company",
        "Google"
      );

      expect(found).toBeUndefined();
    });
  });

  describe("getCorrectionMetadata", () => {
    it("returns importance and reasoning when correction exists", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const metadata = result.current.getCorrectionMetadata(mockFieldCorrection1);

      expect(metadata.importance).toBe("highly_recommended");
      expect(metadata.reasoning).toBe("Use official company name");
    });

    it("returns field-specific reasoning", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const metadata = result.current.getCorrectionMetadata(mockFieldCorrection3);

      expect(metadata.reasoning).toBe("Be more specific");
    });

    it("returns undefined importance and reasoning when field correction is null", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const metadata = result.current.getCorrectionMetadata(null);

      expect(metadata.importance).toBeUndefined();
      expect(metadata.reasoning).toBeUndefined();
    });

    it("returns undefined when field correction has no matching writing correction", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const orphanedField: FieldCorrection = {
        field_name: "orphaned",
        original_value: "value",
        html_diff: "- value\n+ newvalue",
      };

      const metadata = result.current.getCorrectionMetadata(orphanedField);

      expect(metadata.importance).toBeUndefined();
      expect(metadata.reasoning).toBeUndefined();
    });
  });

  describe("getDescriptionCorrection", () => {
    it("returns html_diff and correction when description field exists", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const desc = result.current.getDescriptionCorrection("work-1");

      expect(desc).not.toBeNull();
      expect(desc?.html_diff).toContain("Built web apps");
      expect(desc?.correction.item_id).toBe("work-1");
    });

    it("uses default fieldName 'description' when second arg omitted", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const desc = result.current.getDescriptionCorrection("work-1");

      expect(desc).not.toBeNull();
      expect(desc?.html_diff).toBe(mockFieldCorrection3.html_diff);
    });

    it("uses fieldName 'content' for professional summary", () => {
      const corrections = [mockWritingCorrectionContent];
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(corrections)
      );

      const desc = result.current.getDescriptionCorrection(
        "professional_summary",
        "content"
      );

      expect(desc).not.toBeNull();
      expect(desc?.html_diff).toContain("Weak");
      expect(desc?.correction.section).toBe("professional_summary");
    });

    it("returns null when itemId has no matching correction", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections)
      );

      const desc = result.current.getDescriptionCorrection("nonexistent-id");

      expect(desc).toBeNull();
    });

    it("returns null when field has no correction for that item", () => {
      const correctionsNoDescription: WritingCorrection[] = [
        {
          item_id: "work-3",
          section: "work_experience",
          field_corrections: [mockFieldCorrection1],
          importance: "standard",
        },
      ];

      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(correctionsNoDescription)
      );

      const desc = result.current.getDescriptionCorrection("work-3");

      expect(desc).toBeNull();
    });

    it("falls back to legacy html_diff when no field_corrections for description", () => {
      const correctionsWithLegacy = [mockLegacyCorrection];
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(correctionsWithLegacy)
      );

      const desc = result.current.getDescriptionCorrection("work-2");

      expect(desc).not.toBeNull();
      expect(desc?.html_diff).toBe("- Old description\n+ New improved description");
      expect(desc?.correction.item_id).toBe("work-2");
    });

    it("returns null for empty corrections array", () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers([])
      );

      const desc = result.current.getDescriptionCorrection("work-1");

      expect(desc).toBeNull();
    });
  });
});
