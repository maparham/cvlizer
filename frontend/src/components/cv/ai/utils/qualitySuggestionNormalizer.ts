/**
 * Quality Suggestion Normalizer Utility
 *
 * Normalizes different quality suggestion types (LowQualityItem and ProfessionalSummaryQualitySuggestion)
 * into a unified data structure for consistent rendering.
 */

import { LowQualityItem, ProfessionalSummaryQualitySuggestion, CoachingQuestion } from '../../../../types/ai';

/**
 * Union type for all quality suggestion types
 */
export type QualitySuggestionUnion = LowQualityItem | ProfessionalSummaryQualitySuggestion;

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
 * LowQualityItem has: quality_score, original, suggested, reasoning
 * ProfessionalSummaryQualitySuggestion has: original_text, suggested_text, key_changes
 */
export function isLowQualityItem(
  suggestion: QualitySuggestionUnion
): suggestion is LowQualityItem {
  return 'quality_score' in suggestion && 'original' in suggestion && 'suggested' in suggestion;
}

/**
 * Normalizes quality suggestion data from different source types
 * into a unified structure for rendering.
 *
 * @param suggestion - LowQualityItem or ProfessionalSummaryQualitySuggestion
 * @returns Normalized suggestion with consistent field names
 */
export function normalizeQualitySuggestion(
  suggestion: QualitySuggestionUnion
): NormalizedQualitySuggestion {
  if (isLowQualityItem(suggestion)) {
    // LowQualityItem structure
    return {
      original: suggestion.original || '',
      suggested: suggestion.suggested || '',
      htmlDiff: suggestion.html_diff || '',
      qualityScore: suggestion.quality_score,
      reasoning: suggestion.reasoning || undefined,
      keyChanges: undefined, // LowQualityItem doesn't have key_changes
      coachingQuestions: suggestion.coaching_questions,
    };
  }

  // ProfessionalSummaryQualitySuggestion structure
  return {
    original: suggestion.original_text || '',
    suggested: suggestion.suggested_text || '',
    htmlDiff: suggestion.html_diff || '',
    qualityScore: undefined, // ProfessionalSummaryQualitySuggestion doesn't have quality_score
    reasoning: undefined, // ProfessionalSummaryQualitySuggestion doesn't have reasoning
    keyChanges: suggestion.key_changes && suggestion.key_changes.length > 0 ? suggestion.key_changes : undefined,
    coachingQuestions: suggestion.coaching_questions,
  };
}
