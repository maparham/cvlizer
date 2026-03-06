/**
 * Section Handlers Hook
 *
 * Custom hook for section-level handlers (apply/dismiss suggestions, corrections) used in Display mode.
 * Handles all suggestion and correction operations that require API calls and state updates.
 */

import { useCallback } from 'react';
import { aiService } from '../../../../services/ai';
import { useCVStore } from '../../../../stores/cv';
import { useNotifications } from '../../../../packages/notifications';
import { useAISuggestionsStore } from '../../../../stores/aiSuggestionsStore';
import { useCVQualityStore } from '../../../../stores/cvQualityStore';
import { useEditedSinceAIStore } from '../../../../stores/editedSinceAIStore';
import { useOverwriteConfirm, OVERWRITE_MSG } from '../../../../contexts/OverwriteConfirmContext';
import { WritingCorrection } from '../../../../types/ai';
import { CV, WorkExperience, Education } from '../../../../types/cv';

/** Turn API error detail (string, array of validation errors, or object) into a string for display. */
function apiDetailToString(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first === 'object' && 'msg' in first) {
      const msg = (first as { msg?: string }).msg;
      if (msg != null && msg !== '') return String(msg);
      return '';
    }
  }
  if (typeof detail === 'object' && detail !== null && 'msg' in detail) {
    const msg = (detail as { msg?: string }).msg;
    if (msg != null && msg !== '') return String(msg);
    return '';
  }
  return JSON.stringify(detail);
}

export interface SectionHandlers<T extends { id: string; description?: string }> {
  handleApplySuggestion: (itemId: string, suggestedDescription: string) => Promise<void>;
  handleDiscardSuggestion: (itemId: string) => void;
  handleApplyQualitySuggestion: (itemId: string, suggestedDescription: string) => Promise<void>;
  handleDismissQualitySuggestion: (itemId: string) => void;
  handleApplyWritingCorrection: (correction: WritingCorrection, draftIndex: number) => Promise<void>;
  handleApplyAll: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => Promise<void>;
}

/**
 * Hook for section-level handlers used in Display mode
 * @param sectionName - Section name ('work_experience' | 'education')
 * @param cvId - CV ID for API calls
 * @param data - Current section data array
 * @param onUpdate - Callback to update section data
 * @param onSave - Optional callback to save changes
 * @returns Handler functions for suggestions and corrections
 */
export function useSectionHandlers<T extends { id: string; description?: string }>(
  sectionName: 'work_experience' | 'education',
  cvId: string | undefined,
  data: T[],
  onUpdate: (items: T[]) => void,
  onSave?: (items: T[], message?: string) => void
): SectionHandlers<T> {
  const { setCurrentCV, updateCVInList } = useCVStore();
  const { showSuccess, showError } = useNotifications();
  const { currentAnalysisId, dismissWritingCorrection } = useCVQualityStore();
  const { isEdited, clearEdited } = useEditedSinceAIStore();
  const { confirm: overwriteConfirm } = useOverwriteConfirm();

  // Get section-specific dismiss functions
  const {
    dismissWorkExperienceSuggestion,
    dismissEducationSuggestion,
  } = useAISuggestionsStore();

  const {
    dismissWorkExperienceSuggestion: dismissQualityWorkSuggestion,
    dismissEducationSuggestion: dismissQualityEducationSuggestion,
  } = useCVQualityStore();

  const dismissSuggestion = sectionName === 'work_experience'
    ? dismissWorkExperienceSuggestion
    : dismissEducationSuggestion;

  const dismissQualitySuggestion = sectionName === 'work_experience'
    ? dismissQualityWorkSuggestion
    : dismissQualityEducationSuggestion;

  // Get section data from CV based on section name
  const getSectionDataFromCV = useCallback((cv: CV): T[] => {
    if (sectionName === 'work_experience') {
      return (cv.parsed_data?.work_experience || []) as unknown as T[];
    } else if (sectionName === 'education') {
      return (cv.parsed_data?.education || []) as unknown as T[];
    }
    return [];
  }, [sectionName]);

  const getFieldKey = useCallback(
    (itemId: string) =>
      sectionName === 'work_experience' ? `work_experience:${itemId}` : `education:${itemId}`,
    [sectionName]
  );

  // Helper: Apply description update (DRY - used by both suggestion types)
  const applyDescriptionUpdate = useCallback(
    async (
      itemId: string,
      suggestedDescription: string,
      dismissFn: (id: string) => void,
      successMessage: string
    ) => {
      const fieldKey = getFieldKey(itemId);
      if (cvId && isEdited(cvId, fieldKey)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }

      const items = data || [];
      const itemIndex = items.findIndex((item) => item.id === itemId);

      if (itemIndex === -1) {
        showError("Item not found for suggestion application.");
        return;
      }

      try {
        const updatedItems = [...items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          description: suggestedDescription,
        };

        onUpdate(updatedItems);
        await onSave?.(updatedItems, `${sectionName === 'work_experience' ? 'Work experience' : 'Education'} description updated`);

        dismissFn(itemId);
        if (cvId) clearEdited(cvId, fieldKey);
        showSuccess(successMessage);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to apply suggestion.";
        showError(message);
      }
    },
    [cvId, data, onUpdate, onSave, showSuccess, showError, sectionName, getFieldKey, isEdited, clearEdited, overwriteConfirm]
  );

  // Helper: Dismiss suggestion (DRY - used by both suggestion types)
  const dismissSuggestionItem = useCallback(
    (dismissFn: (id: string) => void, itemId: string, successMessage: string) => {
      dismissFn(itemId);
      showSuccess(successMessage);
    },
    [showSuccess]
  );

  // Handle applying a suggestion
  const handleApplySuggestion = useCallback(
    async (itemId: string, suggestedDescription: string) => {
      await applyDescriptionUpdate(
        itemId,
        suggestedDescription,
        dismissSuggestion,
        "Suggestion applied successfully"
      );
    },
    [applyDescriptionUpdate, dismissSuggestion]
  );

  // Handle discarding a suggestion
  const handleDiscardSuggestion = useCallback(
    (itemId: string) => {
      dismissSuggestionItem(dismissSuggestion, itemId, "Suggestion discarded");
    },
    [dismissSuggestionItem, dismissSuggestion]
  );

  // Handle applying a quality suggestion
  const handleApplyQualitySuggestion = useCallback(
    async (itemId: string, suggestedDescription: string) => {
      await applyDescriptionUpdate(
        itemId,
        suggestedDescription,
        dismissQualitySuggestion,
        "Quality suggestion applied successfully"
      );
    },
    [applyDescriptionUpdate, dismissQualitySuggestion]
  );

  // Handle dismissing a quality suggestion
  const handleDismissQualitySuggestion = useCallback(
    (itemId: string) => {
      dismissSuggestionItem(dismissQualitySuggestion, itemId, "Quality suggestion dismissed");
    },
    [dismissSuggestionItem, dismissQualitySuggestion]
  );

  // Handle applying a writing correction (draftIndex is 0-based).
  const handleApplyWritingCorrection = useCallback(
    async (correction: WritingCorrection, draftIndex: number) => {
      if (!cvId || !currentAnalysisId) {
        showError("Cannot apply correction: CV ID or analysis ID missing");
        return;
      }

      const fieldKey = getFieldKey(correction.item_id);
      if (isEdited(cvId, fieldKey)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }

      try {
        // Apply correction via backend (selected draft index).
        const updatedCV = await aiService.applyWritingCorrection(
          cvId,
          currentAnalysisId,
          correction.item_id,
          draftIndex
        );

        // Update CV store
        setCurrentCV(updatedCV as CV);
        updateCVInList(updatedCV as CV);

        // Update local data with new CV data
        const updatedSectionData = getSectionDataFromCV(updatedCV);
        onUpdate(updatedSectionData);
        onSave?.(updatedSectionData, "Writing correction applied successfully");

        // Dismiss the correction from the analysis
        await dismissWritingCorrection(correction.item_id, correction.field_path);
        clearEdited(cvId, fieldKey);
        showSuccess("Writing correction applied successfully");
      } catch (error: any) {
        const message =
          apiDetailToString(error?.response?.data?.detail) ||
          error?.message ||
          'Failed to apply writing correction';
        showError('Writing correction failed', message);
      }
    },
    [cvId, currentAnalysisId, setCurrentCV, updateCVInList, onUpdate, onSave, dismissWritingCorrection, showSuccess, showError, getSectionDataFromCV, getFieldKey, isEdited, clearEdited, overwriteConfirm]
  );

  // Handle applying all suggestions (quality + writing corrections) atomically
  const handleApplyAll = useCallback(
    async (
      itemId: string,
      qualitySuggested?: string,
      writingCorrections?: WritingCorrection[]
    ) => {
      if (!cvId || !currentAnalysisId) {
        showError("Cannot apply corrections: CV ID or analysis ID missing");
        return;
      }

      const fieldKey = getFieldKey(itemId);
      if (isEdited(cvId, fieldKey)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }

      try {
        let finalCV = null;

        // Step 1: Apply all writing corrections in batch
        if (writingCorrections && writingCorrections.length > 0) {
          // Extract correction IDs
          const correctionIds = writingCorrections.map((c) => c.item_id);

          // Apply batch
          const updatedCV = await aiService.applyWritingCorrectionsBatch(
            cvId,
            currentAnalysisId,
            correctionIds
          );

          finalCV = updatedCV;

          // Dismiss all corrections together with error handling
          const dismissedCorrections: WritingCorrection[] = [];
          const failedDismissals: WritingCorrection[] = [];

          for (const correction of writingCorrections) {
            try {
              await dismissWritingCorrection(correction.item_id, correction.field_path);
              dismissedCorrections.push(correction);
            } catch (error) {
              failedDismissals.push(correction);
              console.error(`Failed to dismiss correction ${correction.item_id}:`, error);
            }
          }

          if (failedDismissals.length > 0) {
            const failedIds = failedDismissals.map(c => c.item_id).join(', ');
            showError(
              `Corrections applied but ${failedDismissals.length} dismissal(s) failed. ` +
              `Applied corrections (${failedIds}) were not dismissed. Please try dismissing them manually.`
            );
          } else {
            showSuccess(`Applied ${writingCorrections.length} writing correction(s) successfully`);
          }
        }

        // Step 2: Apply quality suggestion if present (after batch corrections)
        // Collect all changes before updating state atomically
        let qualitySuggestionApplied = false;
        let finalSectionData: T[] | null = null;

        if (qualitySuggested) {
          // Get the current section data (either from batch result or current state)
          const currentItems = finalCV
            ? getSectionDataFromCV(finalCV)
            : (data || []);

          const itemIndex = currentItems.findIndex((item) => item.id === itemId);

          if (itemIndex !== -1) {
            const updatedItems = [...currentItems];
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              description: qualitySuggested,
            };

            // Update finalCV with the quality suggestion if we have one from batch corrections
            if (finalCV && finalCV.parsed_data) {
              if (sectionName === 'work_experience') {
                finalCV = {
                  ...finalCV,
                  parsed_data: {
                    ...finalCV.parsed_data,
                    work_experience: updatedItems as unknown as WorkExperience[],
                  },
                };
              } else {
                finalCV = {
                  ...finalCV,
                  parsed_data: {
                    ...finalCV.parsed_data,
                    education: updatedItems as unknown as Education[],
                  },
                };
              }
            }

            finalSectionData = updatedItems;
            dismissQualitySuggestion(itemId);
            qualitySuggestionApplied = true;
          }
        } else if (finalCV) {
          // If we only have batch corrections, get section data from finalCV
          finalSectionData = getSectionDataFromCV(finalCV);
        }

        // Step 3: Update CV stores and state atomically (all at once)
        if (finalCV) {
          setCurrentCV(finalCV as CV);
          updateCVInList(finalCV as CV);
        }

        // Update local section data with final state (once, at the end)
        if (finalSectionData) {
          onUpdate(finalSectionData);
          clearEdited(cvId, fieldKey);

          // Determine success message based on what was applied
          if (qualitySuggestionApplied && writingCorrections && writingCorrections.length > 0) {
            onSave?.(finalSectionData, "All corrections applied successfully");
          } else if (qualitySuggestionApplied) {
            onSave?.(finalSectionData, "Quality suggestion applied successfully");
          } else if (writingCorrections && writingCorrections.length > 0) {
            // Message already shown in Step 1, just save without message
            onSave?.(finalSectionData);
          }
        }
      } catch (error: any) {
        const message =
          apiDetailToString(error?.response?.data?.detail) ||
          error?.message ||
          'Failed to apply corrections';
        showError('Apply corrections failed', message);
      }
    },
    [
      cvId,
      currentAnalysisId,
      data,
      setCurrentCV,
      updateCVInList,
      onUpdate,
      onSave,
      dismissWritingCorrection,
      dismissQualitySuggestion,
      showSuccess,
      showError,
      sectionName,
      getSectionDataFromCV,
      getFieldKey,
      isEdited,
      clearEdited,
      overwriteConfirm,
    ]
  );

  return {
    handleApplySuggestion,
    handleDiscardSuggestion,
    handleApplyQualitySuggestion,
    handleDismissQualitySuggestion,
    handleApplyWritingCorrection,
    handleApplyAll,
  };
}
