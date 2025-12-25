/**
 * Section Store Selectors Hook
 *
 * Utility hook to get section-specific store functions (dismiss handlers, etc.)
 * Used by both useFormHandlers and useSectionHandlers to reduce duplication.
 */

import { useCVQualityStore } from '../../../../stores/cvQualityStore';
import { useAISuggestionsStore } from '../../../../stores/aiSuggestionsStore';

export interface SectionStoreSelectors {
  // AI Suggestions store
  dismissSuggestion: (itemId: string) => void;

  // CV Quality store
  dismissQualitySuggestion: (itemId: string) => void;
}

/**
 * Get section-specific store selector functions
 * @param sectionName - Section name ('work_experience' | 'education')
 * @returns Object with section-specific dismiss functions
 */
export function useSectionStoreSelectors(
  sectionName: 'work_experience' | 'education'
): SectionStoreSelectors {
  // AI Suggestions store selectors
  const {
    dismissWorkExperienceSuggestion,
    dismissEducationSuggestion,
  } = useAISuggestionsStore();

  // CV Quality store selectors
  const {
    dismissWorkExperienceSuggestion: dismissQualityWorkSuggestion,
    dismissEducationSuggestion: dismissQualityEducationSuggestion,
  } = useCVQualityStore();

  // Return section-specific functions
  return {
    dismissSuggestion:
      sectionName === 'work_experience'
        ? dismissWorkExperienceSuggestion
        : dismissEducationSuggestion,

    dismissQualitySuggestion:
      sectionName === 'work_experience'
        ? dismissQualityWorkSuggestion
        : dismissQualityEducationSuggestion,
  };
}
