/**
 * CV Quality Analysis Store
 *
 * Manages state for CV quality coaching feature.
 * Parallel to aiSuggestionsStore but independent of job descriptions.
 */

import { create } from 'zustand';
import { aiService, type CorrectionMode } from '../services/ai';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { useNotificationStore } from '../packages/notifications/store';
import {
  CVQualityAnalysisData,
  CVQualityAnalysisResponse,
} from '../types/ai';

/** Skip overwriting with GET for this long after a dismiss to avoid ghost suggestion cards. */
const DISMISS_COOLDOWN_MS = 3000;

interface CVQualityStore {
  // State
  qualityAnalysis: CVQualityAnalysisData | null;
  currentCvId: string | null;
  currentAnalysisId: string | null;
  analysisLoading: boolean;
  analysisError: string | null;
  overallScore: number | null;
  isDismissing: boolean;
  /** Set after a successful dismiss PATCH; loadLatestQualityAnalysis skips overwriting for DISMISS_COOLDOWN_MS to avoid ghost cards. */
  lastDismissedAt: number | null;

  // Actions
  generateQualityAnalysis: (cvId: string, correctionMode?: CorrectionMode) => Promise<string | void>;
  updateQualityAnalysisStatus: (
    analysisId: string
  ) => Promise<CVQualityAnalysisResponse>;
  loadLatestQualityAnalysis: (cvId: string, cvUpdatedAt?: string) => Promise<void>;
  setAnalysisLoading: (loading: boolean) => void;

  // Helper (internal use only - not part of public API)
  _dismissItem: (
    updateFn: (current: CVQualityAnalysisData) => CVQualityAnalysisData | Partial<CVQualityAnalysisData>,
    errorTitle: string,
    errorMessage: string
  ) => Promise<void>;

  // Dismissal actions
  dismissWritingCorrection: (itemId: string, section: string) => Promise<void>;
  dismissContentCoaching: (itemId: string) => Promise<void>;
  dismissProfessionalSummarySuggestion: () => Promise<void>;
  dismissWorkExperienceSuggestion: (itemId: string) => Promise<void>;
  dismissEducationSuggestion: (itemId: string) => Promise<void>;
  dismissSkillSuggestion: (skill: string, type: 'technical' | 'soft') => Promise<void>;
  /** Remove multiple skill suggestions in one PATCH (for Apply All). */
  dismissSkillSuggestionsBatch: (
    suggestions: Array<{ skill: string; type: 'technical' | 'soft' }>,
  ) => Promise<void>;
  dismissAllQualitySuggestions: () => Promise<void>;

  clearQualityAnalysis: () => void;
  clearAnalysisError: () => void;
  deleteCurrentAnalysis: () => Promise<void>;
}

export const useCVQualityStore = create<CVQualityStore>((set, get) => ({
  // Initial state
  qualityAnalysis: null,
  currentCvId: null,
  currentAnalysisId: null,
  analysisLoading: false,
  analysisError: null,
  overallScore: null,
  isDismissing: false,
  lastDismissedAt: null,

  // Generate quality analysis
  generateQualityAnalysis: async (cvId: string, correctionMode: CorrectionMode = 'writing_only') => {
    set({ analysisLoading: true, analysisError: null });

    try {
      // Clear any existing analyses to ensure a fresh run
      await aiService.deleteAllQualityAnalyses(cvId);

      // Clear local state so old suggestions don't linger while the new run starts
      set({
        qualityAnalysis: null,
        currentCvId: cvId,
        currentAnalysisId: null,
        overallScore: null,
      });

      const result = await aiService.createQualityAnalysis(cvId, correctionMode);

      if (!result || !result.analysis_id) {
        throw new Error('Invalid response from quality analysis API');
      }

      // Keep analysisLoading true - polling will clear it when analysis completes
      // Set currentAnalysisId so polling can track it
      set({
        currentAnalysisId: result.analysis_id,
        currentCvId: cvId,
        analysisLoading: true, // Keep loading true until polling completes
      });

      return result.analysis_id;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to generate quality analysis';

      const isRateLimitError =
        error?.code === '429' || error?.response?.status === 429;

      ErrorHandler.handle(error, {
        feature: 'cv-quality',
        action: 'create-analysis',
        metadata: { cvId },
      });

      set({
        analysisLoading: false,
        analysisError: isRateLimitError ? null : errorMessage,
        currentAnalysisId: null,
      });

      // Re-throw error so caller knows it failed
      throw error;
    }
  },

  // Update analysis status (called by polling)
  updateQualityAnalysisStatus: async (analysisId: string) => {
    try {
      const analysis = await aiService.getQualityAnalysisStatus(analysisId);

      if (!analysis.is_generating) {
        set({
          qualityAnalysis: analysis.quality_data || null,
          currentCvId: analysis.cv_id,
          currentAnalysisId: analysisId,
          analysisLoading: false,
          analysisError: analysis.generation_error || null,
          overallScore: analysis.overall_quality_score || null,
        });
      }

      return analysis;
    } catch (error: any) {
      Logger.error('Failed to update quality analysis status', {
        analysisId,
        error: error?.message || String(error),
      });

      // Don't clear loading state on error - let polling continue
      // The polling hook will handle network errors and retry
      // Only clear loading state when polling detects task completion or failure

      throw error;
    }
  },

  // Load latest analysis (for page refresh persistence)
  // Only loads analyses that are still generating or completed after CV was last modified
  loadLatestQualityAnalysis: async (cvId: string, _cvUpdatedAt?: string) => {
    if (cvId.startsWith('temp-')) {
      return;
    }

    // Check if we're switching to a different CV - clear error/loading state
    const currentCvId = get().currentCvId;
    if (currentCvId && currentCvId !== cvId) {
      // Switching CVs - reset error and loading state to prevent stale state
      set({
        analysisError: null,
        analysisLoading: false,
      });
    }

    try {
      const analysis = await aiService.getLatestQualityAnalysis(cvId);

      if (!analysis || analysis.cv_id !== cvId) {
        return;
      }

      if (analysis.is_generating) {
        // Analysis is still generating - always restore loading state
        set({
          qualityAnalysis: null,
          currentCvId: cvId,
          currentAnalysisId: analysis.id,
          analysisLoading: true,
          analysisError: null,
          overallScore: null,
        });
        return;
      }

      // Avoid overwriting with stale GET after a dismiss (prevents ghost cards)
      const { currentAnalysisId, lastDismissedAt } = get();
      if (
        currentAnalysisId === analysis.id &&
        lastDismissedAt != null &&
        Date.now() - lastDismissedAt < DISMISS_COOLDOWN_MS
      ) {
        return;
      }

      // Analysis complete - load the stored data
      if (analysis.quality_data) {
        set({
          qualityAnalysis: analysis.quality_data,
          currentCvId: cvId,
          currentAnalysisId: analysis.id,
          analysisLoading: false,
          analysisError: analysis.generation_error || null,
          overallScore: analysis.overall_quality_score || null,
          lastDismissedAt: null,
        });
      } else {
        // No quality data returned; clear local state
        set({
          qualityAnalysis: null,
          currentCvId: cvId,
          currentAnalysisId: analysis.id,
          analysisLoading: false,
          analysisError: analysis.generation_error || null,
          overallScore: analysis.overall_quality_score || null,
          lastDismissedAt: null,
        });
      }
    } catch (error: any) {
      Logger.error('[loadLatestQualityAnalysis] Error loading analysis', {
        cvId,
        error: error?.message || String(error),
      });
      // Clear error state when switching CVs (even if load fails)
      const currentCvId = get().currentCvId;
      if (!currentCvId || currentCvId !== cvId) {
        set({
          currentCvId: cvId,
          analysisError: null,
          analysisLoading: false,
          qualityAnalysis: null,
          overallScore: null,
          currentAnalysisId: null,
        });
      }
    }
  },

  setAnalysisLoading: (loading: boolean) => {
    set({ analysisLoading: loading });
  },

  // Helper function to handle dismissal logic (DRY principle)
  // Executes the exact same logic as the original 6 dismiss functions
  _dismissItem: async (
    updateFn: (current: CVQualityAnalysisData) => CVQualityAnalysisData | Partial<CVQualityAnalysisData>,
    errorTitle: string,
    errorMessage: string
  ) => {
    if (get().isDismissing) return; // Prevent concurrent dismissals

    const current = get().qualityAnalysis;
    const analysisId = get().currentAnalysisId;
    const currentCvId = get().currentCvId;

    if (!current) return;

    const updated = updateFn(current) as CVQualityAnalysisData;

    // Save previous state for rollback
    const previousState = current;

    set({ qualityAnalysis: updated, isDismissing: true });

    if (analysisId) {
      try {
        await aiService.updateQualityAnalysis(analysisId, updated);
        set({ lastDismissedAt: Date.now() });
      } catch (error) {
        // Rollback state on error
        set({ qualityAnalysis: previousState });
        Logger.error('Failed to update quality analysis', { error });
        useNotificationStore.getState().showError(
          errorTitle,
          errorMessage,
          currentCvId || undefined,
          true // toastOnly
        );
      } finally {
        set({ isDismissing: false });
      }
    } else {
      set({ isDismissing: false });
    }
  },

  // Dismiss individual writing correction
  dismissWritingCorrection: async (itemId: string, section: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        writing_corrections: current.writing_corrections.filter(
          (w) => !(w.item_id === itemId && w.section === section)
        ),
      }),
      'Failed to dismiss suggestion',
      'The suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss content coaching item
  dismissContentCoaching: async (itemId: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        content_coaching: current.content_coaching.filter((c) => c.item_id !== itemId),
      }),
      'Failed to dismiss coaching',
      'The coaching item could not be dismissed. Please try again.'
    );
  },

  // Dismiss professional summary suggestion
  dismissProfessionalSummarySuggestion: async () => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        professional_summary: undefined,
      }),
      'Failed to dismiss suggestion',
      'The professional summary suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss work experience suggestion
  dismissWorkExperienceSuggestion: async (itemId: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        work_experience: current.work_experience.filter((w) => w.item_id !== itemId),
      }),
      'Failed to dismiss suggestion',
      'The work experience suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss education suggestion
  dismissEducationSuggestion: async (itemId: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        education: current.education.filter((e) => e.item_id !== itemId),
      }),
      'Failed to dismiss suggestion',
      'The education suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss skill suggestion
  dismissSkillSuggestion: async (skill: string, type: 'technical' | 'soft') => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        skills: {
          ...current.skills,
          [type]: current.skills[type].filter((s) => s.skill !== skill),
        },
      }),
      'Failed to dismiss suggestion',
      'The skill suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss multiple skill suggestions in one PATCH (for Apply All)
  dismissSkillSuggestionsBatch: async (
    suggestions: Array<{ skill: string; type: 'technical' | 'soft' }>,
  ) => {
    if (suggestions.length === 0) return;
    const toRemove = new Set(
      suggestions.map((s) => `${s.type}:${s.skill}`),
    );
    await get()._dismissItem(
      (current) => ({
        ...current,
        skills: {
          technical: current.skills.technical.filter(
            (s) => !toRemove.has(`technical:${s.skill}`),
          ),
          soft: current.skills.soft.filter(
            (s) => !toRemove.has(`soft:${s.skill}`),
          ),
        },
      }),
      'Failed to dismiss suggestions',
      'Skill suggestions could not be dismissed. Please try again.'
    );
  },

  // Dismiss all quality suggestions
  dismissAllQualitySuggestions: async () => {
    await get().deleteCurrentAnalysis();
  },

  // Delete current analysis
  deleteCurrentAnalysis: async () => {
    const analysisId = get().currentAnalysisId;

    if (!analysisId) return;

    try {
      await aiService.deleteQualityAnalysis(analysisId);

      get().clearQualityAnalysis();
    } catch (error: any) {
      Logger.error('Failed to delete quality analysis', {
        analysisId,
        error: error?.message || String(error),
      });
    }
  },

  // Clear quality analysis
  clearQualityAnalysis: () => {
    set({
      qualityAnalysis: null,
      currentCvId: null,
      currentAnalysisId: null,
      analysisLoading: false,
      analysisError: null,
      overallScore: null,
      isDismissing: false,
      lastDismissedAt: null,
    });
  },

  // Clear analysis error
  clearAnalysisError: () => {
    set({ analysisError: null });
  },
}));

// CV-validated selector: Only return analysis if it belongs to the current CV
export const useValidatedQualityAnalysis = (cvId: string) => {
  return useCVQualityStore((state) => {
    if (state.currentCvId === cvId) {
      return state.qualityAnalysis;
    }
    return null;
  });
};
