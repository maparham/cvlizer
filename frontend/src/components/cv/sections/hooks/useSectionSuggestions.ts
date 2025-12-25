/**
 * Section Suggestions Hook
 *
 * Custom hook for managing AI suggestions, quality analysis, and writing corrections mapping.
 * Provides mapped data structures for efficient item lookup by ID.
 */

import { useMemo } from 'react';
import { useValidatedSuggestions } from '../../../../stores/aiSuggestionsStore';
import { CVQualityAnalysisData, LowQualityItem, WritingCorrection } from '../../../../types/ai';

export interface SectionSuggestions {
  suggestionsByItemId: Map<string, any>;
  qualitySuggestionsByItemId: Map<string, LowQualityItem>;
  coachingByItemId: Map<string, any>;
  writingCorrectionsByItemId: Map<string, WritingCorrection[]>;
  visibleSuggestions: any[];
  hasSuggestions: boolean;
}

/**
 * Hook for managing section-specific suggestions and quality analysis
 * @param cvId - CV ID for fetching suggestions
 * @param sectionName - Section name ('work_experience' | 'education')
 * @param qualityAnalysis - Quality analysis data from store
 * @returns Mapped suggestions and quality data by item ID
 */
export function useSectionSuggestions(
  cvId: string,
  sectionName: 'work_experience' | 'education',
  qualityAnalysis: CVQualityAnalysisData | null
): SectionSuggestions {
  // Get AI suggestions from store (job-based)
  const allSuggestions = useValidatedSuggestions(cvId);

  // Get section-specific suggestions
  const sectionSuggestions = useMemo(() => {
    return allSuggestions?.[sectionName] || [];
  }, [allSuggestions, sectionName]);

  // Filter to only visible suggestions (those with suggested text)
  const visibleSuggestions = useMemo(() => {
    return sectionSuggestions.filter((s) => s.suggested);
  }, [sectionSuggestions]);

  // Map job-based suggestions by item ID for quick lookup
  const suggestionsByItemId = useMemo(() => {
    const map = new Map();
    sectionSuggestions.forEach((suggestion) => {
      map.set(suggestion.id, suggestion);
    });
    return map;
  }, [sectionSuggestions]);

  // Map quality suggestions by item ID
  const qualitySuggestionsByItemId = useMemo(() => {
    const map = new Map<string, LowQualityItem>();
    qualityAnalysis?.[sectionName]?.forEach((item) => {
      if (item.item_type === 'low_score') {
        map.set(item.item_id, item as LowQualityItem);
      }
    });
    return map;
  }, [qualityAnalysis, sectionName]);

  // Map coaching items by ID
  const coachingByItemId = useMemo(() => {
    const map = new Map();
    qualityAnalysis?.content_coaching?.forEach((item) => {
      if (item.section === sectionName) {
        map.set(item.item_id, item);
      }
    });
    return map;
  }, [qualityAnalysis, sectionName]);

  // Map writing corrections by item ID
  const writingCorrectionsByItemId = useMemo(() => {
    const map = new Map<string, WritingCorrection[]>();
    qualityAnalysis?.writing_corrections?.forEach((correction) => {
      if (correction.section === sectionName) {
        const existing = map.get(correction.item_id) || [];
        existing.push(correction);
        map.set(correction.item_id, existing);
      }
    });
    return map;
  }, [qualityAnalysis, sectionName]);

  const hasSuggestions = visibleSuggestions.length > 0;

  return {
    suggestionsByItemId,
    qualitySuggestionsByItemId,
    coachingByItemId,
    writingCorrectionsByItemId,
    visibleSuggestions,
    hasSuggestions,
  };
}
