/**
 * Active Job Description Preference Utilities
 *
 * Reader helpers for the per-CV active job description selection.
 * Writes are owned by AI store actions in `stores/ai/jobDescriptionsStore.ts`.
 */

const ACTIVE_JOB_DESCRIPTION_MAP_KEY = "activeJobDescriptionIdPerCV";

export function getActiveJobDescriptionIdForCV(cvId: string): string | null {
  if (typeof window === "undefined" || !cvId) return null;

  try {
    const raw = localStorage.getItem(ACTIVE_JOB_DESCRIPTION_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    const value = map[cvId];
    if (!value) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}
