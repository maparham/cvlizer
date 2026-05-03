/**
 * Pure helpers for applying/deduplicating skill suggestions in UI flows.
 */

import type { SkillsSuggestions } from "../types/ai";
import { normalizeSkillsTechnical } from "./normalizeSkillsTechnical";

export interface SkillsSectionDataLike {
  technical?: Record<string, string[]>;
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function mergeTechnicalSkill(
  technical: SkillsSectionDataLike["technical"],
  skill: string,
  category: string,
): SkillsSectionDataLike["technical"] {
  const normalized = normalizeSkillsTechnical(technical);
  const targetCategory = category.trim() || "AI Suggested";
  return {
    ...normalized,
    [targetCategory]: dedupeCaseInsensitive([
      ...(normalized[targetCategory] || []),
      skill,
    ]),
  };
}

/**
 * Merge one incoming job-based suggestion into skills section data.
 */
export function mergeOneJobSkillSuggestion(
  sectionData: SkillsSectionDataLike,
  suggestionSkill: string,
  category: string,
): SkillsSectionDataLike {
  return {
    ...sectionData,
    technical: mergeTechnicalSkill(sectionData.technical, suggestionSkill, category),
  };
}

/**
 * Merge all incoming job-based skill suggestions into skills section data.
 */
export function mergeAllJobSkillSuggestions(
  sectionData: SkillsSectionDataLike,
  suggestions: SkillsSuggestions,
): SkillsSectionDataLike {
  let nextTechnical = sectionData.technical;
  for (const [category, items] of Object.entries(suggestions)) {
    for (const item of items || []) {
      nextTechnical = mergeTechnicalSkill(nextTechnical, item.skill, category);
    }
  }

  return {
    ...sectionData,
    technical: nextTechnical,
  };
}
