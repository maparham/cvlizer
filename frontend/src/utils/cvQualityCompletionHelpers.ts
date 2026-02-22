/**
 * CV Quality Completion Helpers
 *
 * Extracts completion/dedup logic from cvQualityStore so the store stays
 * focused on state and orchestration.
 */

import type { CVQualityAnalysisResponse } from '../types/ai';
import { getPersistedProofreadScore } from '../stores/cvQualityPersistence';

/** Minimal store state needed for completion checks. */
export interface QualityStoreStateSlice {
  currentCvId: string | null;
  currentAnalysisId: string | null;
  analysisLoading: boolean;
  proofreadScore: number | null;
}

/**
 * Returns true if we should apply this analysis completion to the store.
 * Skips when:
 * - Poll for OLD task completes while we've started a new one (isStaleCompletion)
 * - We're mid-create (currentAnalysisId cleared but analysisLoading still true)
 */
export function shouldApplyCompletion(
  analysis: CVQualityAnalysisResponse,
  state: QualityStoreStateSlice
): boolean {
  const { currentCvId, currentAnalysisId, analysisLoading } = state;
  const isStaleCompletion =
    currentAnalysisId !== null && currentAnalysisId !== analysis.id;
  const isMidCreate =
    currentCvId === analysis.cv_id &&
    currentAnalysisId === null &&
    analysisLoading;

  return !isStaleCompletion && !isMidCreate;
}

/**
 * Computes the store state diff for a completed analysis.
 * Pure function; caller is responsible for persisting proofreadScore when applicable.
 */
export function computeNextStateFromCompletion(
  analysis: CVQualityAnalysisResponse,
  state: QualityStoreStateSlice
): {
  qualityAnalysis: CVQualityAnalysisResponse['quality_data'] | null;
  currentCvId: string;
  currentAnalysisId: string;
  currentCorrectionMode: null;
  analysisLoading: false;
  analysisError: string | null;
  overallScore: number | null;
  proofreadScore: number | null;
} {
  const qualityData = analysis.quality_data || null;
  const isProofread = qualityData?.correction_mode === 'proofread';

  const currentProofreadScore = state.proofreadScore;
  const persistedScore = getPersistedProofreadScore(analysis.cv_id);
  const nextProofreadScore =
    isProofread && analysis.overall_quality_score != null
      ? analysis.overall_quality_score
      : currentProofreadScore ?? persistedScore ?? null;

  return {
    qualityAnalysis: qualityData,
    currentCvId: analysis.cv_id,
    currentAnalysisId: analysis.id,
    currentCorrectionMode: null,
    analysisLoading: false,
    analysisError: analysis.generation_error || null,
    overallScore: analysis.overall_quality_score ?? null,
    proofreadScore: nextProofreadScore,
  };
}
