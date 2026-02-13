/**
 * Writing Correction Utils Hook
 *
 * Utility hook for writing correction helpers used in both Form and Display components.
 * Provides pure utility functions to find corrections and extract metadata.
 * Does NOT contain routing logic - handlers are passed directly from components.
 */

import { useCallback } from 'react';
import { WritingCorrection, FieldCorrection } from '../../../../types/ai';
import { getFieldCorrection } from '../../../../utils/writingCorrections';

export interface WritingCorrectionUtils {
  findWritingCorrectionForField: (fieldName: string, originalValue: string) => WritingCorrection | undefined;
  getCorrectionMetadata: (fieldCorrection: FieldCorrection | null) => { importance?: 'highly_recommended' | 'standard'; reasoning?: string };
  /** Get description/content correction. fieldName defaults to 'description' (use 'content' for Professional Summary). */
  getDescriptionCorrection: (itemId: string, fieldName?: string) => { html_diff: string; correction: WritingCorrection } | null;
}

/**
 * Hook for writing correction utility functions
 * @param writingCorrections - Array of writing corrections for an item
 * @returns Utility functions for working with writing corrections
 */
export function useWritingCorrectionHelpers(
  writingCorrections: WritingCorrection[]
): WritingCorrectionUtils {
  // Find the WritingCorrection containing a field correction
  const findWritingCorrectionForField = useCallback(
    (fieldName: string, originalValue: string): WritingCorrection | undefined => {
      return writingCorrections.find(wc =>
        wc.field_corrections?.some(fc =>
          fc.field_name === fieldName &&
          fc.original_value === originalValue
        )
      );
    },
    [writingCorrections]
  );

  // Get importance and reasoning for field corrections
  const getCorrectionMetadata = useCallback(
    (fieldCorrection: FieldCorrection | null): { importance?: 'highly_recommended' | 'standard'; reasoning?: string } => {
      if (!fieldCorrection) return { importance: undefined, reasoning: undefined };
      const writingCorrection = findWritingCorrectionForField(fieldCorrection.field_name, fieldCorrection.original_value);
      return {
        importance: writingCorrection?.importance,
        reasoning: fieldCorrection.reasoning, // Field-specific reasoning only, no fallback
      };
    },
    [findWritingCorrectionForField]
  );

  // Get description/content correction in htmlDiffCorrection format
  const getDescriptionCorrection = useCallback(
    (itemId: string, fieldName: string = 'description'): { html_diff: string; correction: WritingCorrection } | null => {
      const descriptionFieldCorrection = getFieldCorrection(writingCorrections, itemId, fieldName);
      if (descriptionFieldCorrection) {
        const writingCorrection = findWritingCorrectionForField(fieldName, descriptionFieldCorrection.original_value);
        return writingCorrection
          ? { html_diff: descriptionFieldCorrection.html_diff, correction: writingCorrection }
          : null;
      }
      return null;
    },
    [writingCorrections, findWritingCorrectionForField]
  );

  return {
    findWritingCorrectionForField,
    getCorrectionMetadata,
    getDescriptionCorrection,
  };
}
