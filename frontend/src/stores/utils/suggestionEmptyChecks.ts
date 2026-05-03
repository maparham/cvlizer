/**
 * Shared "is empty" checks used by suggestion stores.
 */

import type { AllSuggestionsResponse, CVQualityAnalysisData } from "../../types/ai";

function countSkillSuggestions(skills: AllSuggestionsResponse["skills"]): number {
  return Object.values(skills || {}).reduce(
    (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
    0,
  );
}

/**
 * True when no user-visible suggestion remains across all supported sections.
 */
export function hasNoSuggestionsAcrossSections(
  suggestions: AllSuggestionsResponse,
): boolean {
  return (
    countSkillSuggestions(suggestions.skills) === 0 &&
    !suggestions.professional_summary.suggested_text &&
    (suggestions.work_experience || []).length === 0 &&
    (suggestions.education || []).length === 0 &&
    !suggestions.why_good_fit?.fit_analysis
  );
}

/**
 * True when quality analysis no longer has actionable issues or skill corrections.
 */
export function hasNoQualityIssues(quality: CVQualityAnalysisData): boolean {
  const noIssues = (quality.issues || []).length === 0;
  const noSkillSuggestions = !Object.values(quality.skills || {}).some(
    (items) => Array.isArray(items) && items.length > 0,
  );
  return noIssues && noSkillSuggestions;
}
