/**
 * Quality skill helpers for CV-quality suggestions (spelling/capitalization).
 * Pure functions for applying suggestions to skill lists and inferring "original" from reasoning.
 */

export interface QualitySkillSuggestion {
  skill: string;
  reasoning?: string;
  original?: string;
}

/**
 * Returns true if the skill (case-insensitive) is already in the list.
 */
export function hasSkillAlready(
  list: string[] | undefined,
  skill: string,
): boolean {
  return (list || []).some(
    (existing) => existing.toLowerCase() === skill.toLowerCase(),
  );
}

/**
 * Infer which current skill is being corrected when API doesn't return `original`.
 * Reasoning often contains the misspelling in quotes, e.g. "Corrects misspelling \"jawascript\" in skills list."
 * Supports double- and single-quoted strings.
 */
export function inferOriginalFromReasoning(
  reasoning: string | undefined,
  currentSkills: string[],
): string | undefined {
  if (!reasoning || currentSkills.length === 0) return undefined;
  const currentLower = new Set(currentSkills.map((s) => s.toLowerCase()));
  const doubleQuoted = reasoning.match(/"([^"]*)"/g) ?? [];
  const singleQuoted = reasoning.match(/'([^']*)'/g) ?? [];
  for (const q of [...doubleQuoted, ...singleQuoted]) {
    const inner = q.slice(1, -1).trim();
    if (inner && currentLower.has(inner.toLowerCase())) return inner;
  }
  return undefined;
}

/**
 * Resolve the "original" string for a suggestion (API value or inferred from reasoning).
 */
export function resolveOriginal(
  suggestion: QualitySkillSuggestion,
  currentList: string[],
): string | undefined {
  const { original: apiOriginal, reasoning } = suggestion;
  if (apiOriginal !== undefined && apiOriginal !== "") return apiOriginal;
  return inferOriginalFromReasoning(reasoning, currentList);
}

/**
 * Apply a single quality skill suggestion to a list: replace by original (case-insensitive) or append; dedupe.
 * If original is set but does not match any existing skill, the suggested skill is added regardless.
 * Returns the new list, or null if skill was already present and no original (caller should dismiss without applying).
 */
export function applyOneQualitySuggestion(
  list: string[],
  suggestion: QualitySkillSuggestion,
): string[] | null {
  const { skill } = suggestion;
  const original = resolveOriginal(suggestion, list);

  if (original) {
    const hasMatch = list.some(
      (s) => s.toLowerCase() === original.toLowerCase(),
    );
    if (hasMatch) {
      const replaced = list.map((s) =>
        s.toLowerCase() === original.toLowerCase() ? skill : s,
      );
      const seen = new Set<string>();
      return replaced.filter((s) => {
        const key = s.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    /* original set but no matching item: add suggested skill regardless */
  }

  if (hasSkillAlready(list, skill)) return null;
  return [...list, skill];
}

/**
 * Apply multiple quality skill suggestions to a list in order (replace or append, dedupe).
 * If original is set but does not match any existing skill, the suggested skill is added regardless.
 */
export function applyQualitySuggestionsToList(
  list: string[],
  suggestions: QualitySkillSuggestion[],
): string[] {
  let result = [...list];
  for (const s of suggestions) {
    const original = resolveOriginal(s, result);
    if (original) {
      const hasMatch = result.some(
        (item) => item.toLowerCase() === original.toLowerCase(),
      );
      if (hasMatch) {
        result = result.map((item) =>
          item.toLowerCase() === original.toLowerCase() ? s.skill : item,
        );
        const seen = new Set<string>();
        result = result.filter((item) => {
          const key = item.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } else if (!hasSkillAlready(result, s.skill)) {
        result = [...result, s.skill];
      }
    } else if (!hasSkillAlready(result, s.skill)) {
      result = [...result, s.skill];
    }
  }
  return result;
}
