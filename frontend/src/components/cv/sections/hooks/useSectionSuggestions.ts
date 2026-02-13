/**
 * Section Suggestions Hook
 *
 * Custom hook for managing AI suggestions, quality analysis, and writing corrections mapping.
 * Provides mapped data structures for efficient item lookup by ID.
 */

import { useMemo } from 'react';
import { useValidatedSuggestions } from '../../../../stores/aiSuggestionsStore';
import {
  CVQualityAnalysisData,
  LowQualityItem,
  WritingCorrection,
} from '../../../../types/ai';

export interface SectionSuggestions {
  suggestionsByItemId: Map<string, any>;
  qualitySuggestionsByItemId: Map<string, LowQualityItem>;
  coachingByItemId: Map<string, any>;
  writingCorrectionsByItemId: Map<string, WritingCorrection[]>;
  visibleSuggestions: any[];
  hasSuggestions: boolean;
}

/** Issue field_path matches section name (e.g. "work_experience.description" or "work_experience[2].position" matches "work_experience"). */
function sectionMatches(fieldPath: string | undefined | null, sectionName: string): boolean {
  if (!fieldPath) return false;
  return (
    fieldPath === sectionName ||
    fieldPath.startsWith(sectionName + '.') ||
    fieldPath.startsWith(sectionName + '[')
  );
}

/**
 * When the API returns item_id as a numeric index (e.g. "0", "1", "2"), resolve to actual
 * section item ids so lookup by exp.id works.
 * - Tries 0-based index, then 1-based (index-1), then clamps out-of-range to last item.
 */
function keyBySectionItemIds(
  itemId: string,
  sectionItemIds: string[] | undefined
): string[] {
  const keys = [itemId];
  if (!sectionItemIds || sectionItemIds.length === 0) return keys;
  const index = parseInt(itemId, 10);
  if (Number.isNaN(index) || index < 0) return keys;
  let resolvedId: string | undefined;
  if (sectionItemIds[index] !== undefined) {
    resolvedId = sectionItemIds[index];
  } else if (index > 0 && sectionItemIds[index - 1] !== undefined) {
    resolvedId = sectionItemIds[index - 1];
  } else if (sectionItemIds.length > 0) {
    resolvedId = sectionItemIds[sectionItemIds.length - 1];
  }
  if (resolvedId) keys.push(resolvedId);
  return keys;
}

/**
 * Hook for managing section-specific suggestions and quality analysis
 * @param cvId - CV ID for fetching suggestions
 * @param sectionName - Section name ('work_experience' | 'education')
 * @param qualityAnalysis - Quality analysis data from store
 * @param sectionItemIds - Optional ordered list of item ids (e.g. data.map(d => d.id)) so suggestions keyed by API index ("0","1","2") also resolve by actual id
 * @returns Mapped suggestions and quality data by item ID
 */
export function useSectionSuggestions(
  cvId: string,
  sectionName: 'work_experience' | 'education',
  qualityAnalysis: CVQualityAnalysisData | null,
  sectionItemIds?: string[]
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

  // Map quality suggestions by item ID from issues (key by API item_id and by section item id when index-based)
  const qualitySuggestionsByItemId = useMemo(() => {
    const map = new Map<string, LowQualityItem>();
    const itemType =
      sectionName === 'work_experience' ? 'work_experience' : 'education';
    qualityAnalysis?.issues
      ?.filter(
        (i) =>
          sectionMatches(i.field_path, sectionName) &&
          i.item_type === itemType &&
          (i.quality_score ?? 100) < 50 &&
          !i.html_diff &&
          !i.coaching
      )
      .forEach((i) => {
        const itemId = i.item_id ?? '';
        if (!itemId) return;
        const value: LowQualityItem = {
          item_type: 'low_score',
          item_id: itemId,
          field_path: i.field_path,
          quality_score: i.quality_score ?? 0,
          original: i.original ?? '',
          suggested: i.suggested ?? '',
          reasoning: i.reasoning,
          html_diff: i.html_diff ?? '',
          coaching_questions: i.coaching?.coaching_questions,
        };
        for (const key of keyBySectionItemIds(itemId, sectionItemIds)) {
          map.set(key, value);
        }
      });
    return map;
  }, [qualityAnalysis, sectionName, sectionItemIds]);

  // Map coaching items by ID from issues (key by API item_id and by section item id when index-based)
  const coachingByItemId = useMemo(() => {
    const map = new Map<string, { item_id: string; field_path: string; issue_category: string; coaching_questions: { question: string }[]; direct_prompts: string[] }>();
    const itemType =
      sectionName === 'work_experience' ? 'work_experience' : 'education';
    qualityAnalysis?.issues
      ?.filter(
        (i) =>
          sectionMatches(i.field_path, sectionName) &&
          i.item_type === itemType &&
          i.coaching
      )
      .forEach((i) => {
        const itemId = i.item_id ?? '';
        if (!itemId || !i.coaching) return;
        const value = {
          item_id: itemId,
          field_path: i.field_path,
          issue_category: i.issue_category,
          coaching_questions: i.coaching.coaching_questions,
          direct_prompts: i.coaching.direct_prompts ?? [],
          reasoning: i.reasoning ?? undefined,
        };
        for (const key of keyBySectionItemIds(itemId, sectionItemIds)) {
          map.set(key, value);
        }
      });
    return map;
  }, [qualityAnalysis, sectionName, sectionItemIds]);

  // Map writing corrections by item ID from issues (key by API item_id and by section item id when index-based).
  // API response shape / WritingCorrection mapping: keep in sync with backend quality_analysis_helpers
  // (_synthetic_correction_from_issues, find_correction_by_id, apply endpoint).
  const writingCorrectionsByItemId = useMemo(() => {
    const map = new Map<string, WritingCorrection[]>();
    const itemType =
      sectionName === 'work_experience' ? 'work_experience' : 'education';
    qualityAnalysis?.issues
      ?.filter(
        (i) =>
          sectionMatches(i.field_path, sectionName) &&
          i.item_type === itemType &&
          i.html_diff
      )
      .forEach((i) => {
        const itemId = i.item_id ?? '';
        if (!itemId) return;
        const path = i.field_path;
        if (!path) return;
        const fieldName =
          path.includes('.') ? path.split('.').pop()! : 'description';
        const baseCorrection: WritingCorrection = {
          item_id: itemId,
          field_path: path,
          importance:
            i.issue_severity === 'critical' ? 'highly_recommended' : 'standard',
          field_corrections: [
            {
              field_name: fieldName,
              html_diff: i.html_diff!,
              reasoning: i.reasoning,
              original_value: i.original ?? '',
              corrected_value: i.suggested ?? '',
            },
          ],
        };
        const keys = keyBySectionItemIds(itemId, sectionItemIds);
        for (const key of keys) {
          const existing = map.get(key) || [];
          existing.push({ ...baseCorrection, item_id: key });
          map.set(key, existing);
        }
      });
    return map;
  }, [qualityAnalysis, sectionName, sectionItemIds]);

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
