/**
 * Pure state updaters for suggestion stores.
 *
 * These helpers avoid repeated in-store object spread/filter logic.
 */

import type { AllSuggestionsResponse, CVQualityAnalysisData } from "../../types/ai";

type SuggestionSectionKey = "work_experience" | "education";

export function updateSkillsState(
  current: AllSuggestionsResponse,
  skill: string,
  type: string,
): AllSuggestionsResponse {
  return {
    ...current,
    skills: {
      ...current.skills,
      [type]: (current.skills[type] || []).filter((s) => s.skill !== skill),
    },
  };
}

export function clearSkillsState(
  current: AllSuggestionsResponse,
): AllSuggestionsResponse {
  return {
    ...current,
    skills: {},
  };
}

export function updateSummaryState(
  current: AllSuggestionsResponse,
): AllSuggestionsResponse {
  return {
    ...current,
    professional_summary: {
      suggested_text: "",
      original_text: current.professional_summary.original_text,
      key_changes: [],
    },
  };
}

export function updateWhyGoodFitState(
  current: AllSuggestionsResponse,
): AllSuggestionsResponse {
  return {
    ...current,
    why_good_fit: {
      title: "",
      confidence_score: 0,
      fit_analysis: "",
      key_matches: [],
      missing_skills: [],
      suggested_improvements: [],
      strengths: [],
      weaknesses: [],
    },
  };
}

export function updateSectionItemSuggestionState(
  current: AllSuggestionsResponse,
  section: SuggestionSectionKey,
  itemId: string,
): AllSuggestionsResponse {
  return {
    ...current,
    [section]: (current[section] || []).filter((s) => s.id !== itemId),
  };
}

export function clearSectionSuggestionsState(
  current: AllSuggestionsResponse,
  section: SuggestionSectionKey,
): AllSuggestionsResponse {
  return {
    ...current,
    [section]: [],
  };
}

export function updateQualitySkillsState(
  current: CVQualityAnalysisData,
  skill: string,
  type: string,
): CVQualityAnalysisData {
  return {
    ...current,
    skills: {
      ...current.skills,
      [type]: (current.skills[type] || []).filter((s) => s.skill !== skill),
    },
  };
}

export function updateQualitySkillsBatchState(
  current: CVQualityAnalysisData,
  suggestions: Array<{ skill: string; type: string }>,
): CVQualityAnalysisData {
  const toRemove = new Set(suggestions.map((s) => `${s.type}:${s.skill}`));
  return {
    ...current,
    skills: Object.fromEntries(
      Object.entries(current.skills).map(([category, items]) => [
        category,
        items.filter((s) => !toRemove.has(`${category}:${s.skill}`)),
      ]),
    ),
  };
}
