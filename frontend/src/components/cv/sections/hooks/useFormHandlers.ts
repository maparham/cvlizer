/**
 * Form Handlers Hook
 *
 * Custom hook for form-level wrapper handlers used in Form mode.
 * Handles form-specific operations that update form fields directly.
 */

import { useCallback } from 'react';
import { useNotifications } from '../../../../packages/notifications';
import { useCVQualityStore } from '../../../../stores/cvQualityStore';
import { WritingCorrection, FieldCorrection } from '../../../../types/ai';
import { parseHtmlDiff } from '../../../../utils/htmlDiffParser';

const ARRAY_FIELD_NAMES = ['achievements', 'honors'] as const;

/**
 * Normalize corrected_value for array fields (achievements, honors) that may
 * arrive as JSON strings from the API. Returns parsed array or value as-is.
 */
function normalizeCorrectedValue(
  fieldName: string,
  value: unknown
): unknown {
  if (!ARRAY_FIELD_NAMES.includes(fieldName as any)) return value;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

export interface FormHandlers {
  handleApplyQualitySuggestionForm: (suggested: string) => void;
  handleDismissQualitySuggestionForm: () => void;
  handleApplyWritingCorrectionForm: (correction: WritingCorrection) => Promise<void>;
  handleDismissWritingCorrectionForm: (correction: WritingCorrection) => Promise<void>;
  handleApplyAllForm: (itemId: string, qualitySuggested?: string, corrections?: WritingCorrection[]) => Promise<void>;
  handleApplySingleFieldCorrectionForm: (fieldCorrection: FieldCorrection, parentCorrection: WritingCorrection) => Promise<void>;
}

/**
 * Hook for form-level wrapper handlers used in Form mode
 * @param sectionName - Section name ('work_experience' | 'education')
 * @param itemId - ID of the item being edited
 * @param updateItem - Function to update a form field
 * @param onSave - Optional callback to trigger save
 * @param _handleApplyWritingCorrection - (Unused in form mode) Writing correction handler from useSectionHandlers
 * @param qualitySuggestion - Optional quality suggestion for this item
 * @param writingCorrections - Optional writing corrections for this item
 * @returns Form handler functions
 */
export function useFormHandlers<T extends { id: string }>(
  sectionName: 'work_experience' | 'education',
  itemId: string,
  updateItem: (field: keyof T, value: any) => void,
  onSave?: () => void,
  _handleApplyWritingCorrection?: (correction: WritingCorrection) => Promise<void>
): FormHandlers {
  const { showSuccess } = useNotifications();
  const { dismissWritingCorrection } = useCVQualityStore();

  // Get section-specific dismiss functions
  const {
    dismissWorkExperienceSuggestion: dismissQualityWorkSuggestion,
    dismissEducationSuggestion: dismissQualityEducationSuggestion,
  } = useCVQualityStore();

  const dismissQualitySuggestion = sectionName === 'work_experience'
    ? dismissQualityWorkSuggestion
    : dismissQualityEducationSuggestion;

  // Handle applying quality suggestion in form
  const handleApplyQualitySuggestionForm = useCallback(
    (suggested: string) => {
      // Update the form field
      updateItem("description" as keyof T, suggested);
      // Trigger save
      onSave?.();
      // Dismiss the suggestion
      dismissQualitySuggestion(itemId);
      showSuccess("Quality suggestion applied successfully");
    },
    [updateItem, onSave, dismissQualitySuggestion, itemId, showSuccess]
  );

  // Handle dismissing quality suggestion in form
  const handleDismissQualitySuggestionForm = useCallback(
    () => {
      dismissQualitySuggestion(itemId);
      showSuccess("Quality suggestion dismissed");
    },
    [dismissQualitySuggestion, itemId, showSuccess]
  );

  // Handle applying writing correction in form
  const handleApplyWritingCorrectionForm = useCallback(
    async (correction: WritingCorrection) => {
      // Apply field corrections directly to form fields (like user typing manually)
      if (correction.field_corrections) {
        correction.field_corrections.forEach(fieldCorrection => {
          const value = normalizeCorrectedValue(
            fieldCorrection.field_name,
            fieldCorrection.corrected_value
          );
          updateItem(fieldCorrection.field_name as keyof T, value);
        });
      }

      // Apply markdown diff (description field)
      if (correction.html_diff) {
        const correctedDescription = parseHtmlDiff(correction.html_diff);
        updateItem("description" as keyof T, correctedDescription);
      }

      // Dismiss the correction from store (client-side only, no backend call)
      await dismissWritingCorrection(correction.item_id, correction.field_path);

      // Show success notification
      showSuccess("Writing correction applied successfully");

      // Do NOT call onSave() - user saves manually when ready
      // Do NOT call handleApplyWritingCorrection - that's for display mode only
    },
    [updateItem, dismissWritingCorrection, showSuccess]
  );

  // Handle dismissing writing correction in form
  const handleDismissWritingCorrectionForm = useCallback(
    async (correction: WritingCorrection) => {
      await dismissWritingCorrection(correction.item_id, correction.field_path);
      showSuccess("Writing correction dismissed");
    },
    [dismissWritingCorrection, showSuccess]
  );

  // Handle applying single field correction in form
  const handleApplySingleFieldCorrectionForm = useCallback(
    async (fieldCorrection: FieldCorrection, parentCorrection: WritingCorrection) => {
      const value = normalizeCorrectedValue(
        fieldCorrection.field_name,
        fieldCorrection.corrected_value
      );
      updateItem(fieldCorrection.field_name as keyof T, value);

      // Dismiss the entire parent WritingCorrection from store
      await dismissWritingCorrection(parentCorrection.item_id, parentCorrection.field_path);

      // Show success notification
      showSuccess("Writing correction applied successfully");

      // Do NOT call onSave() - user saves manually when ready
    },
    [updateItem, dismissWritingCorrection, showSuccess]
  );

  // Handle applying all suggestions in form
  const handleApplyAllForm = useCallback(
    async (
      itemId: string,
      qualitySuggested?: string,
      corrections?: WritingCorrection[]
    ) => {
      // Apply writing corrections first - directly to form fields (like user typing)
      if (corrections && corrections.length > 0) {
        for (const correction of corrections) {
          // Apply field corrections
          if (correction.field_corrections) {
            correction.field_corrections.forEach(fieldCorrection => {
              const value = normalizeCorrectedValue(
                fieldCorrection.field_name,
                fieldCorrection.corrected_value
              );
              updateItem(fieldCorrection.field_name as keyof T, value);
            });
          }

          // Apply markdown diff (description field)
          if (correction.html_diff) {
            const correctedDescription = parseHtmlDiff(correction.html_diff);
            updateItem("description" as keyof T, correctedDescription);
          }
        }
      }

      // Apply quality suggestion last (takes precedence if both modify description)
      if (qualitySuggested) {
        updateItem("description" as keyof T, qualitySuggested);
      }

      // Dismiss all suggestions with error handling
      const failedDismissals: WritingCorrection[] = [];

      if (corrections && corrections.length > 0) {
        for (const correction of corrections) {
          try {
            await dismissWritingCorrection(correction.item_id, correction.field_path);
          } catch (error) {
            failedDismissals.push(correction);
            console.error(`Failed to dismiss correction ${correction.item_id}:`, error);
          }
        }
      }

      if (qualitySuggested) {
        dismissQualitySuggestion(itemId);
      }

      // Show appropriate notification based on dismissal results
      if (failedDismissals.length > 0) {
        const failedIds = failedDismissals.map(c => c.item_id).join(', ');
        showSuccess(
          `Suggestions applied but ${failedDismissals.length} dismissal(s) failed. ` +
          `Applied corrections (${failedIds}) were not dismissed. Please try dismissing them manually.`
        );
      } else {
        showSuccess("All suggestions applied successfully");
      }

      // Do NOT call onSave() - user saves manually
    },
    [updateItem, dismissWritingCorrection, dismissQualitySuggestion, showSuccess]
  );

  return {
    handleApplyQualitySuggestionForm,
    handleDismissQualitySuggestionForm,
    handleApplyWritingCorrectionForm,
    handleDismissWritingCorrectionForm,
    handleApplyAllForm,
    handleApplySingleFieldCorrectionForm,
  };
}
