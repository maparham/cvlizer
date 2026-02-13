/**
 * Quality Suggestion Normalizer Utility
 *
 * Normalizes quality suggestion types (LowQualityItem and ProfessionalSummaryV2)
 * into a unified data structure for consistent rendering.
 */

import {
  LowQualityItem,
  ProfessionalSummaryV2,
  CoachingQuestion,
} from '../../../../types/ai';

/**
 * Union type for quality suggestion types (cv_review_v2)
 */
export type QualitySuggestionUnion = LowQualityItem | ProfessionalSummaryV2;

/**
 * Normalized quality suggestion data structure
 */
export interface NormalizedQualitySuggestion {
  original: string;
  suggested: string;
  htmlDiff: string;
  qualityScore?: number;
  reasoning?: string;
  keyChanges?: string[];
  coachingQuestions?: CoachingQuestion[];
}

/**
 * Type guard to check if suggestion is LowQualityItem
 */
export function isLowQualityItem(
  suggestion: QualitySuggestionUnion
): suggestion is LowQualityItem {
  return (
    'quality_score' in suggestion &&
    'original' in suggestion &&
    'suggested' in suggestion
  );
}

/**
 * Normalizes quality suggestion data into a unified structure for rendering.
 *
 * @param suggestion - LowQualityItem or ProfessionalSummaryV2
 * @returns Normalized suggestion with consistent field names
 */
export function normalizeQualitySuggestion(
  suggestion: QualitySuggestionUnion
): NormalizedQualitySuggestion {
  if (isLowQualityItem(suggestion)) {
    return {
      original: suggestion.original || '',
      suggested: suggestion.suggested || '',
      htmlDiff: suggestion.html_diff || '',
      qualityScore: suggestion.quality_score,
      reasoning: suggestion.reasoning || undefined,
      keyChanges: undefined,
      coachingQuestions: suggestion.coaching_questions,
    };
  }

  const v2 = suggestion as ProfessionalSummaryV2;
  return {
    original: v2.original_text || '',
    suggested: v2.suggested_text ?? '',
    htmlDiff: v2.html_diff || '',
    qualityScore: undefined,
    reasoning: v2.reasoning ?? undefined,
    keyChanges: undefined,
    coachingQuestions: undefined,
  };
}
