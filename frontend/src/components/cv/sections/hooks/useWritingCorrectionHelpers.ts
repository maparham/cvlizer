/**
 * Writing Correction Utils Hook
 *
 * Utility hook for writing correction helpers used in both Form and Display components.
 * Provides pure utility functions to find corrections and extract metadata.
 * Does NOT contain routing logic - handlers are passed directly from components.
 */

import { useCallback } from 'react';
import { WritingCorrection, FieldCorrection } from '../../../../types/ai';
import { getFieldCorrection, getMarkdownDiffCorrection } from '../../../../utils/writingCorrections';

export interface WritingCorrectionUtils {
  findWritingCorrectionForField: (fieldName: string, originalValue: string) => WritingCorrection | undefined;
  getCorrectionMetadata: (fieldCorrection: FieldCorrection | null) => { importance?: 'highly_recommended' | 'standard'; reasoning?: string };
  getDescriptionCorrection: (itemId: string) => { markdown_diff: string; correction: WritingCorrection } | null;
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
        reasoning: fieldCorrection.reasoning || writingCorrection?.reasoning, // Field-specific first, fallback to parent
      };
    },
    [findWritingCorrectionForField]
  );

  // Get description correction in markdownDiffCorrection format
  const getDescriptionCorrection = useCallback(
    (itemId: string): { markdown_diff: string; correction: WritingCorrection } | null => {
      const descriptionFieldCorrection = getFieldCorrection(writingCorrections, itemId, 'description');
      if (descriptionFieldCorrection) {
        const writingCorrection = findWritingCorrectionForField('description', descriptionFieldCorrection.original_value);
        return writingCorrection
          ? { markdown_diff: descriptionFieldCorrection.markdown_diff, correction: writingCorrection }
          : null;
      }
      // Fallback to legacy format
      return getMarkdownDiffCorrection(writingCorrections, itemId);
    },
    [writingCorrections, findWritingCorrectionForField]
  );

  return {
    findWritingCorrectionForField,
    getCorrectionMetadata,
    getDescriptionCorrection,
  };
}
