/**
 * Coerce CV `skills.technical` to `Record<string, string[]>` for the editor and stores.
 *
 * Older CVs and mixed deployments may still have a flat string[] under `technical`, or
 * category values that are not arrays. Those shapes break UI that expects categorized maps.
 */

import type { CV } from "../types/cv";

/**
 * Normalize raw `skills.technical` from API or local state into a categorized map.
 */
export function normalizeSkillsTechnical(
  technical: unknown,
): Record<string, string[]> {
  if (technical == null) {
    return {};
  }
  if (Array.isArray(technical)) {
    const skills: string[] = [];
    for (const item of technical) {
      if (typeof item === "string" && item.trim()) {
        skills.push(item.trim());
      }
    }
    return skills.length ? { General: skills } : {};
  }
  if (typeof technical !== "object") {
    return {};
  }
  const out: Record<string, string[]> = {};
  for (const [rawKey, rawVal] of Object.entries(
    technical as Record<string, unknown>,
  )) {
    if (typeof rawKey !== "string" || !rawKey.trim()) {
      continue;
    }
    if (!Array.isArray(rawVal)) {
      continue;
    }
    const cleaned: string[] = [];
    for (const item of rawVal) {
      if (typeof item === "string" && item.trim()) {
        cleaned.push(item.trim());
      }
    }
    // Keep empty categories: a user-added category starts with no skills, and
    // dropping it here would make it vanish from the editor immediately.
    out[rawKey.trim()] = cleaned;
  }
  return out;
}

/**
 * Returns a shallow copy of the CV with `parsed_data.skills.technical` normalized.
 * No-op when `parsed_data` or `skills` is missing.
 */
export function normalizeCVSkillsTechnicalInParsedData(cv: CV): CV {
  const pd = cv.parsed_data;
  if (!pd || typeof pd !== "object") {
    return cv;
  }
  const skillsBlock = pd.skills;
  if (!skillsBlock || typeof skillsBlock !== "object") {
    return cv;
  }
  const technical = normalizeSkillsTechnical(
    (skillsBlock as { technical?: unknown }).technical,
  );
  return {
    ...cv,
    parsed_data: {
      ...pd,
      skills: {
        ...skillsBlock,
        technical,
      },
    },
  };
}
