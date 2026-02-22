/**
 * Returns which quality analysis step (1 or 2) is currently loading.
 * Uses activeTasks (persisted) or store currentCorrectionMode for accuracy.
 *
 * proofread = Step 1, coaching = Step 2.
 * Returns null when not loading.
 */

import { useMemo } from 'react';
import type { AITask } from './useAITaskPolling';

export function useLoadingStep(
  cvId: string,
  activeTasks: Map<string, AITask>,
  analysisLoading: boolean,
  currentCorrectionMode: string | null
): 1 | 2 | null {
  return useMemo(() => {
    if (!analysisLoading) return null;
    const task = Array.from(activeTasks.values()).find(
      (t) =>
        t.type === 'cv_quality_analysis' &&
        t.cvId === cvId &&
        t.isGenerating,
    );
    const modeFromTask = task?.data?.correctionMode as 'proofread' | 'coaching' | undefined;
    const mode = modeFromTask ?? currentCorrectionMode ?? undefined;
    if (mode === 'proofread') return 1;
    if (mode === 'coaching') return 2;
    // Default to Step 1 when mode is unknown or not yet set
    return 1;
  }, [activeTasks, cvId, analysisLoading, currentCorrectionMode]);
}
