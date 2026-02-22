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
