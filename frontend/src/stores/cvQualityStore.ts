/**
 * CV Quality Analysis Store
 *
 * Manages state for CV quality coaching feature.
 * Parallel to aiSuggestionsStore but independent of job descriptions.
 */

import { create } from 'zustand';
import { aiService, type CorrectionMode, type RewordingMode } from '../services/ai';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { useNotificationStore } from '../packages/notifications/store';
import {
  CVQualityAnalysisData,
  CVQualityAnalysisResponse,
  Issue,
} from '../types/ai';
import { getDraftHistoryKey } from '../utils/cvQualityDraftHistoryKey';
import {
  bothAreDescriptionField,
  isDescriptionFieldPath,
} from '../utils/cvQualityFieldPaths';
import { useEditedSinceAIStore } from './editedSinceAIStore';
import {
  getPersistedProofreadScore,
  setPersistedProofreadScore,
} from './cvQualityPersistence';
import {
  shouldApplyCompletion,
  computeNextStateFromCompletion,
} from '../utils/cvQualityCompletionHelpers';

/** Skip overwriting with GET for this long after a dismiss to avoid ghost suggestion cards. */
const DISMISS_COOLDOWN_MS = 3000;

/**
 * True if this issue should be removed when dismissing the given itemId/fieldPath.
 * Matches by exact id+field_path, or by description field when both are description-type paths.
 */
function clearEditedFlagsForQualityAnalysis(
  cvId: string,
  qualityData: CVQualityAnalysisData
) {
  const { clearEdited } = useEditedSinceAIStore.getState();
  (qualityData.issues ?? []).forEach((issue: Issue) => {
    const path = issue.field_path ?? '';
    const itemId = issue.item_id ?? '';
    if (
      isDescriptionFieldPath(path) &&
      (path.startsWith('work_experience') || path.includes('work_experience'))
    ) {
      if (itemId) clearEdited(cvId, `work_experience:${itemId}`);
    } else if (
      isDescriptionFieldPath(path) &&
      (path.startsWith('education') || path.includes('education'))
    ) {
      if (itemId) clearEdited(cvId, `education:${itemId}`);
    } else if (
      isDescriptionFieldPath(path) &&
      (path.startsWith('certifications') || path.includes('certifications'))
    ) {
      if (itemId) clearEdited(cvId, `certifications:${itemId}`);
    } else if (
      isDescriptionFieldPath(path) &&
      (path.startsWith('projects') || path.includes('projects'))
    ) {
      if (itemId) clearEdited(cvId, `projects:${itemId}`);
    } else if (
      isDescriptionFieldPath(path) &&
      (path.startsWith('awards') || path.includes('awards'))
    ) {
      if (itemId) clearEdited(cvId, `awards:${itemId}`);
    } else if (
      isDescriptionFieldPath(path) &&
      (path.startsWith('volunteer_experience') || path.includes('volunteer_experience'))
    ) {
      if (itemId) clearEdited(cvId, `volunteer_experience:${itemId}`);
    }
  });
  const hasSkills =
    qualityData.skills &&
    ((qualityData.skills.technical?.length ?? 0) > 0 ||
      (qualityData.skills.soft?.length ?? 0) > 0);
  if (hasSkills) clearEdited(cvId, 'skills');
}

function matchesWritingCorrection(
  issue: Issue,
  itemId: string,
  fieldPath: string,
  normalizedId: string | null
): boolean {
  if (!issue.html_diff) return false;
  const idMatch =
    (issue.item_id ?? '') === itemId ||
    (normalizedId !== null && (issue.item_id ?? '') === normalizedId);
  const exactMatch = idMatch && issue.field_path === fieldPath;
  const descriptionFieldMatch =
    idMatch && bothAreDescriptionField(issue.field_path ?? '', fieldPath);
  const matchById = exactMatch || descriptionFieldMatch;
  const matchBySection =
    (issue.field_path ?? '') === fieldPath &&
    !!itemId &&
    (fieldPath === itemId || fieldPath.startsWith(itemId + '.'));
  return matchById || matchBySection;
}

/**
 * Returns updated field_draft_histories with the entry for this field/item removed when
 * the field is a description field; otherwise returns current histories unchanged.
 */
function computeNextDraftHistories(
  current: CVQualityAnalysisData,
  fieldPath: string,
  itemId: string
): Record<string, Issue[]> {
  const next = { ...(current.field_draft_histories ?? {}) };
  if (isDescriptionFieldPath(fieldPath)) {
    const draftHistoryKey = getDraftHistoryKey(fieldPath, itemId);
    delete next[draftHistoryKey];
  }
  return next;
}

interface CVQualityStore {
  // State
  qualityAnalysis: CVQualityAnalysisData | null;
  currentCvId: string | null;
  currentAnalysisId: string | null;
  /** Mode of the in-progress analysis; used when resuming polling so loadingStep shows correctly. */
  currentCorrectionMode: CorrectionMode | null;
  /** User-selected coaching rewording scope; synced from completed coaching analysis when present. */
  rewordingMode: RewordingMode;
  setRewordingMode: (mode: RewordingMode) => void;
  analysisLoading: boolean;
  analysisError: string | null;
  overallScore: number | null;
  /** Proofread score (80+ = gate passed). Only set when analysis has correction_mode === 'proofread'. */
  proofreadScore: number | null;
  isDismissing: boolean;
  /** Set after a successful dismiss PATCH; loadLatestQualityAnalysis skips overwriting for DISMISS_COOLDOWN_MS to avoid ghost cards. */
  lastDismissedAt: number | null;

  // Actions
  generateQualityAnalysis: (
    cvId: string,
    correctionMode?: CorrectionMode,
    rewordingMode?: RewordingMode
  ) => Promise<string | void>;
  updateQualityAnalysisStatus: (
    analysisId: string
  ) => Promise<CVQualityAnalysisResponse>;
  loadLatestQualityAnalysis: (cvId: string, cvUpdatedAt?: string) => Promise<void>;
  setAnalysisLoading: (loading: boolean) => void;
  /** Merge field draft history from field-retry response so UI updates without refetch. */
  setFieldDraftHistory: (cvId: string, fieldPath: string, listForField: Issue[]) => void;

  // Helper (internal use only - not part of public API)
  _dismissItem: (
    updateFn: (current: CVQualityAnalysisData) => CVQualityAnalysisData | Partial<CVQualityAnalysisData>,
    errorTitle: string,
    errorMessage: string
  ) => Promise<void>;

  // Dismissal actions
  dismissWritingCorrection: (itemId: string, fieldPath: string) => Promise<void>;
  dismissContentCoaching: (itemId: string) => Promise<void>;
  dismissProfessionalSummarySuggestion: (summarySectionId?: string) => Promise<void>;
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
  currentCorrectionMode: null,
  rewordingMode: 'minimal',
  setRewordingMode: (mode: RewordingMode) => {
    set({ rewordingMode: mode });
  },
  analysisLoading: false,
  analysisError: null,
  overallScore: null,
  proofreadScore: null,
  isDismissing: false,
  lastDismissedAt: null,

  // Generate quality analysis
  generateQualityAnalysis: async (
    cvId: string,
    correctionMode: CorrectionMode = 'proofread',
    rewordingModeArg?: RewordingMode
  ) => {
    const rewordingMode = rewordingModeArg ?? get().rewordingMode ?? 'minimal';
    set({
      analysisLoading: true,
      analysisError: null,
      currentCvId: cvId,
      currentAnalysisId: null, // Clear so poll for old analysis is skipped (isMidCreate)
      currentCorrectionMode: correctionMode,
    });

    try {
      // Clear any existing analyses to ensure a fresh run
      await aiService.deleteAllQualityAnalyses(cvId);

      // Clear local state so old suggestions don't linger while the new run starts.
      // Do not reset proofreadScore - it stays until a new proofread run completes (persisted).
      set({
        qualityAnalysis: null,
        currentCvId: cvId,
        currentAnalysisId: null,
        currentCorrectionMode: correctionMode,
        overallScore: null,
      });

      const result = await aiService.createQualityAnalysis(cvId, correctionMode, rewordingMode);

      if (!result || !result.analysis_id) {
        throw new Error('Invalid response from quality analysis API');
      }

      // Keep analysisLoading true - polling will clear it when analysis completes
      // Set currentAnalysisId so polling can track it
      set({
        currentAnalysisId: result.analysis_id,
        currentCvId: cvId,
        currentCorrectionMode: correctionMode,
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
        currentCorrectionMode: null,
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
        const state = get();
        const stateSlice = {
          currentCvId: state.currentCvId,
          currentAnalysisId: state.currentAnalysisId,
          analysisLoading: state.analysisLoading,
          proofreadScore: state.proofreadScore,
        };

        if (!shouldApplyCompletion(analysis, stateSlice)) {
          return analysis;
        }

        const nextState = computeNextStateFromCompletion(analysis, stateSlice);
        const qd = analysis.quality_data;
        const nextRewordingMode: RewordingMode =
          qd?.correction_mode === 'coaching'
            ? qd?.rewording_mode === 'deep'
              ? 'deep'
              : 'minimal'
            : get().rewordingMode;
        set({ ...nextState, rewordingMode: nextRewordingMode });

        if (
          nextState.proofreadScore != null &&
          (analysis.quality_data?.correction_mode === 'proofread')
        ) {
          setPersistedProofreadScore(analysis.cv_id, nextState.proofreadScore);
        }

        const qualityData = nextState.qualityAnalysis;
        if (qualityData) {
          clearEditedFlagsForQualityAnalysis(analysis.cv_id, qualityData);
        }
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
        currentCorrectionMode: null,
        rewordingMode: 'minimal',
      });
    }

    try {
      const analysis = await aiService.getLatestQualityAnalysis(cvId);

      if (!analysis || analysis.cv_id !== cvId) {
        // No analysis for this CV: set store to "viewing this CV, no analysis" so
        // PDFCVEditor auto-trigger sees !qualityAnalysis and can start proofread.
        const keptProofreadScore = getPersistedProofreadScore(cvId);
        const state = get();
        const preservedLastDismissedAt =
          state.currentCvId === cvId && state.lastDismissedAt != null
            ? state.lastDismissedAt
            : null;
        set({
          currentCvId: cvId,
          qualityAnalysis: null,
          currentAnalysisId: null,
          currentCorrectionMode: null,
          rewordingMode: 'minimal',
          analysisLoading: false,
          analysisError: null,
          overallScore: null,
          proofreadScore: keptProofreadScore,
          isDismissing: false,
          lastDismissedAt: preservedLastDismissedAt,
        });
        return;
      }

      if (analysis.is_generating) {
        // Analysis is still generating - restore loading state, keep proofreadScore from persisted
        const keptProofreadScore = getPersistedProofreadScore(cvId) ?? (get().currentCvId === cvId ? get().proofreadScore : null);
        const restoredMode =
          analysis.quality_data?.correction_mode === 'proofread' ||
          analysis.quality_data?.correction_mode === 'coaching'
            ? analysis.quality_data.correction_mode
            : null;
        set({
          qualityAnalysis: null,
          currentCvId: cvId,
          currentAnalysisId: analysis.id,
          currentCorrectionMode: restoredMode,
          analysisLoading: true,
          analysisError: null,
          overallScore: null,
          proofreadScore: keptProofreadScore,
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
      const qualityData = analysis.quality_data;
      const isProofread = qualityData?.correction_mode === 'proofread';

      // Only proofread completion replaces proofreadScore. Use persisted when store is null.
      // Never use coaching score as proofreadScore (would incorrectly satisfy the gate).
      const currentProofreadScore = get().proofreadScore;
      const persistedScore = getPersistedProofreadScore(cvId);
      const nextProofreadScore =
        isProofread && analysis.overall_quality_score != null
          ? analysis.overall_quality_score
          : currentProofreadScore ?? persistedScore ?? null;

      if (nextProofreadScore != null && isProofread) {
        setPersistedProofreadScore(cvId, nextProofreadScore);
      }

      if (qualityData) {
        const loadedRewordingMode: RewordingMode =
          qualityData.correction_mode === 'coaching'
            ? qualityData.rewording_mode === 'deep'
              ? 'deep'
              : 'minimal'
            : get().rewordingMode;
        set({
          qualityAnalysis: qualityData,
          currentCvId: cvId,
          currentAnalysisId: analysis.id,
          currentCorrectionMode: null,
          rewordingMode: loadedRewordingMode,
          analysisLoading: false,
          analysisError: analysis.generation_error || null,
          overallScore: analysis.overall_quality_score ?? null,
          proofreadScore: nextProofreadScore,
          lastDismissedAt: null,
        });
        clearEditedFlagsForQualityAnalysis(cvId, qualityData);
      } else {
        // No quality data returned; clear local state, keep proofreadScore from persisted
        const keptProofreadScore = getPersistedProofreadScore(cvId);
        set({
          qualityAnalysis: null,
          currentCvId: cvId,
          currentAnalysisId: analysis.id,
          currentCorrectionMode: null,
          analysisLoading: false,
          analysisError: analysis.generation_error || null,
          overallScore: analysis.overall_quality_score ?? null,
          proofreadScore: keptProofreadScore,
          lastDismissedAt: null,
        });
      }
    } catch (error: any) {
      Logger.error('[loadLatestQualityAnalysis] Error loading analysis', {
        cvId,
        error: error?.message || String(error),
      });
      // Clear error state when switching CVs (even if load fails); keep proofreadScore from persisted
      const currentCvId = get().currentCvId;
      if (!currentCvId || currentCvId !== cvId) {
        const keptProofreadScore = getPersistedProofreadScore(cvId);
        set({
          currentCvId: cvId,
          analysisError: null,
          analysisLoading: false,
          qualityAnalysis: null,
          overallScore: null,
          proofreadScore: keptProofreadScore,
          currentAnalysisId: null,
        });
      }
    }
  },

  setAnalysisLoading: (loading: boolean) => {
    set({ analysisLoading: loading });
  },

  setFieldDraftHistory: (cvId: string, fieldPath: string, listForField: Issue[]) => {
    const { currentCvId, qualityAnalysis } = get();
    if (currentCvId !== cvId || !qualityAnalysis) return;
    const nextHistories = {
      ...(qualityAnalysis.field_draft_histories ?? {}),
      [fieldPath]: listForField,
    };
    set({
      qualityAnalysis: {
        ...qualityAnalysis,
        field_draft_histories: nextHistories,
      },
    });
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

    // Set lastDismissedAt immediately so loadLatestQualityAnalysis cooldown applies
    // before any refetch triggered by CV update can overwrite this dismiss
    set({
      qualityAnalysis: updated,
      isDismissing: true,
      lastDismissedAt: Date.now(),
    });

    if (analysisId) {
      try {
        await aiService.updateQualityAnalysis(analysisId, updated);
      } catch (error) {
        // Rollback state on error
        set({ qualityAnalysis: previousState, lastDismissedAt: null });
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

  // Dismiss individual writing correction. When itemId is a section key (e.g. personal_info),
  // also remove issues whose field_path matches and starts with that section (for issues with no item_id).
  // When itemId is prefixed (work_<uuid>, edu_<uuid>), also match issue.item_id to the UUID so backend-stored issues are removed.
  // Same normalization (strip work_/edu_ prefix) must be kept in sync with backend quality_analysis_helpers._normalize_correction_id.
  // Also clears field_draft_histories for the item's description so description correction cards close.
  dismissWritingCorrection: async (itemId: string, fieldPath: string) => {
    const normalizedId =
      itemId.startsWith('work_') && itemId.length > 5
        ? itemId.slice(5)
        : itemId.startsWith('edu_') && itemId.length > 4
          ? itemId.slice(4)
          : null;

    await get()._dismissItem(
      (current) => {
        const nextIssues = current.issues.filter(
          (i) => !matchesWritingCorrection(i, itemId, fieldPath, normalizedId)
        );
        const nextHistories = computeNextDraftHistories(
          current,
          fieldPath,
          itemId
        );

        return {
          ...current,
          issues: nextIssues,
          field_draft_histories: nextHistories,
        };
      },
      'Failed to dismiss suggestion',
      'The suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss content coaching item (itemId may be 'personal_info', custom section id, or legacy 'professional_summary')
  dismissContentCoaching: async (itemId: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        issues: current.issues.filter((i) => {
          if (!i.coaching) return true;
          if (itemId === 'personal_info') {
            return i.item_type !== 'personal_info';
          }
          if (i.item_type === 'custom' && (i.item_id ?? '') === itemId) return false;
          if (itemId === 'professional_summary') {
            return i.item_type !== 'professional_summary' && (i.field_path ?? '') !== 'professional_summary' && !(i.field_path ?? '').startsWith('professional_summary.');
          }
          return (i.item_id ?? '') !== itemId;
        }),
      }),
      'Failed to dismiss coaching',
      'The coaching item could not be dismissed. Please try again.'
    );
  },

  // Dismiss summary suggestion (remove professional_summary or custom summary issues from issues array).
  // When summarySectionId is provided, only custom issues with that item_id are removed; otherwise no custom issues are removed.
  dismissProfessionalSummarySuggestion: async (summarySectionId?: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        issues: current.issues.filter((i) => {
          if (i.item_type === 'professional_summary') return false;
          if (i.item_type === 'custom') {
            if (summarySectionId != null && (i.item_id ?? '') === summarySectionId)
              return false;
            return true;
          }
          const fp = i.field_path ?? '';
          if (fp === 'professional_summary' || fp.startsWith('professional_summary.'))
            return false;
          return true;
        }),
      }),
      'Failed to dismiss suggestion',
      'The summary suggestion could not be dismissed. Please try again.'
    );
  },

  // Dismiss work experience suggestion
  dismissWorkExperienceSuggestion: async (itemId: string) => {
    await get()._dismissItem(
      (current) => ({
        ...current,
        issues: current.issues.filter(
          (i) =>
            !(i.item_type === 'work_experience' && (i.item_id ?? '') === itemId)
        ),
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
        issues: current.issues.filter(
          (i) =>
            !(i.item_type === 'education' && (i.item_id ?? '') === itemId)
        ),
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

  // Clear quality analysis (suggestions/analysis). Keeps proofreadScore and currentCvId
  // so the gate stays correct and score persists.
  // Callers: only used from dismissAllQualitySuggestions. When switching CVs, use
  // loadLatestQualityAnalysis(cvId) instead—it updates currentCvId and loads the new CV's analysis.
  clearQualityAnalysis: () => {
    set({
      qualityAnalysis: null,
      currentAnalysisId: null,
      currentCorrectionMode: null,
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
