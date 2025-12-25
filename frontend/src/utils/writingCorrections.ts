/**
 * Writing Corrections Utility Functions
 *
 * Utility functions for extracting field-specific corrections from writing corrections arrays.
 * Used to match corrections to their target fields for inline display.
 */

import { WritingCorrection, FieldCorrection } from '../types/ai';

/**
 * Get field correction for a specific field from writing corrections array
 *
 * @param writingCorrections - Array of writing corrections for an item
 * @param itemId - ID of the CV item (work experience, education, etc.)
 * @param fieldName - Name of the field (company, position, institution, degree, location, start_date, end_date)
 * @returns FieldCorrection object if found, null otherwise
 */
export function getFieldCorrection(
  writingCorrections: WritingCorrection[],
  itemId: string,
  fieldName: string
): FieldCorrection | null {
  if (!writingCorrections || writingCorrections.length === 0) {
    return null;
  }

  // Find first correction for this item that has a matching field correction
  for (const correction of writingCorrections) {
    if (correction.item_id !== itemId) {
      continue;
    }

    if (correction.field_corrections && correction.field_corrections.length > 0) {
      const fieldCorrection = correction.field_corrections.find(
        (fc) => fc.field_name === fieldName
      );
      if (fieldCorrection) {
        return fieldCorrection;
      }
    }
  }

  return null;
}

/**
 * Get markdown diff correction for description/text fields
 *
 * @deprecated Use getFieldCorrection(writingCorrections, itemId, "description") instead.
 * Description corrections are now handled through field_corrections with field_name="description".
 *
 * @param writingCorrections - Array of writing corrections for an item
 * @param itemId - ID of the CV item (work experience, education, professional_summary, etc.)
 * @returns Object with markdown_diff string and full WritingCorrection, or null if not found
 */
export function getMarkdownDiffCorrection(
  writingCorrections: WritingCorrection[],
  itemId: string
): { markdown_diff: string; correction: WritingCorrection } | null {
  if (!writingCorrections || writingCorrections.length === 0) {
    return null;
  }

  // First try to find description in field_corrections (new approach)
  const descriptionFieldCorrection = getFieldCorrection(writingCorrections, itemId, 'description');
  if (descriptionFieldCorrection) {
    // Find the WritingCorrection that contains this field correction
    const correction = writingCorrections.find(wc =>
      wc.item_id === itemId &&
      wc.field_corrections?.some(fc => fc.field_name === 'description')
    );
    if (correction) {
      return {
        markdown_diff: descriptionFieldCorrection.markdown_diff,
        correction: correction,
      };
    }
  }

  // Fallback to legacy markdown_diff at WritingCorrection level (backward compatibility)
  for (const correction of writingCorrections) {
    if (correction.item_id !== itemId) {
      continue;
    }

    if (correction.markdown_diff && correction.markdown_diff.trim() !== '') {
      return {
        markdown_diff: correction.markdown_diff,
        correction: correction,
      };
    }
  }

  return null;
}
