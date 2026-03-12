/**
 * CV Quality Persistence
 *
 * localStorage helpers for proofread scores and correction modes.
 * Used by cvQualityStore and callers (PDFCVEditor, useAITaskPolling) to persist
 * state across page reloads when auth clears activeTasks.
 */

import { Logger } from '../utils/logger';
import type { CorrectionMode } from '../services/ai';

const PROOFREAD_SCORES_STORAGE_KEY = 'cv_optimizer_proofread_scores';
const ANALYSIS_MODES_STORAGE_KEY = 'cv_optimizer_analysis_modes';
const AUTO_PROOFREAD_DONE_STORAGE_KEY = 'cv_optimizer_auto_proofread_done';

export function getPersistedProofreadScore(cvId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROOFREAD_SCORES_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, number>;
    const v = map[cvId];
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

export function setPersistedProofreadScore(cvId: string, score: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PROOFREAD_SCORES_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[cvId] = score;
    localStorage.setItem(PROOFREAD_SCORES_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    Logger.error('Failed to persist proofread score', { cvId, error: e });
  }
}

export function getPersistedCorrectionMode(analysisId: string): CorrectionMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ANALYSIS_MODES_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, CorrectionMode>;
    const v = map[analysisId];
    return v === 'proofread' || v === 'coaching' ? v : null;
  } catch {
    return null;
  }
}

export function setPersistedCorrectionMode(analysisId: string, mode: CorrectionMode): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(ANALYSIS_MODES_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, CorrectionMode>) : {};
    map[analysisId] = mode;
    localStorage.setItem(ANALYSIS_MODES_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    Logger.error('Failed to persist analysis mode', { analysisId, error: e });
  }
}

export function clearPersistedCorrectionMode(analysisId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(ANALYSIS_MODES_STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, CorrectionMode>;
    delete map[analysisId];
    localStorage.setItem(ANALYSIS_MODES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

/**
 * Return whether the one-time auto-proofread has already been run for this CV.
 *
 * Design note: this is intentionally a *separate* flag from proofreadScore so that
 * UI behavior ("did we auto-run once?") is decoupled from scoring details.
 */
export function getAutoProofreadDone(cvId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(AUTO_PROOFREAD_DONE_STORAGE_KEY);
    if (!raw) return false;
    const set = new Set(JSON.parse(raw) as string[]);
    return set.has(cvId);
  } catch {
    return false;
  }
}

const MAX_AUTO_PROOFREAD_DONE_ENTRIES = 100;

/**
 * Mark that the one-time auto-proofread has been run for this CV.
 *
 * Call after the analysis request resolves so we only persist on success;
 * repeated mounts are prevented by the caller's load-complete guards until then.
 * Stored set is capped at MAX_AUTO_PROOFREAD_DONE_ENTRIES to avoid unbounded growth.
 */
export function setAutoProofreadDone(cvId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUTO_PROOFREAD_DONE_STORAGE_KEY);
    const set = raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    set.add(cvId);
    const arr = [...set];
    const capped =
      arr.length > MAX_AUTO_PROOFREAD_DONE_ENTRIES
        ? arr.slice(-MAX_AUTO_PROOFREAD_DONE_ENTRIES)
        : arr;
    localStorage.setItem(
      AUTO_PROOFREAD_DONE_STORAGE_KEY,
      JSON.stringify(capped),
    );
  } catch (e) {
    Logger.error('Failed to persist auto-proofread done', { cvId, error: e });
  }
}

/**
 * Clear the auto-proofread flag so the one-time flow can be attempted again.
 *
 * Used only when the underlying API call fails; this avoids a permanent
 * "stuck" state where the flag is true but the analysis never completed.
 */
export function clearAutoProofreadDone(cvId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUTO_PROOFREAD_DONE_STORAGE_KEY);
    if (!raw) return;
    const set = new Set(JSON.parse(raw) as string[]);
    set.delete(cvId);
    localStorage.setItem(AUTO_PROOFREAD_DONE_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore
  }
}
