/**
 * Per-item description draft history (work_experience / education).
 *
 * Builds generations list from field_draft_histories for one item's description,
 * tracks current index, and provides onRetry / onBack / canGoBack for
 * InlineFieldCorrection.
 */

import React from "react";
import { Issue, WritingCorrection, type RewordingMode } from "../../../../types/ai";
import {
  descriptionCorrectionToIssue,
  issueToDescriptionCorrection,
} from "../../ai/descriptionCorrectionUtils";
import { useValidatedQualityAnalysis, useCVQualityStore } from "../../../../stores/cvQualityStore";
import { useDraftHistoryNavigation } from "./useDraftHistoryNavigation";
import { useNotifications } from "../../../../packages/notifications";
import { aiService } from "../../../../services/ai";
import { getDraftHistoryKey } from "../../../../utils/cvQualityDraftHistoryKey";
import { FIELD_PATHS } from "../../../../utils/cvQualityFieldPaths";

export type SectionKind = "work_experience" | "education";

function getFieldPathForSection(section: SectionKind): string {
  return section === "work_experience"
    ? FIELD_PATHS.WORK_EXPERIENCE_DESC
    : FIELD_PATHS.EDUCATION_DESC;
}

export interface UseItemDescriptionDraftHistoryParams {
  cvId: string | undefined;
  itemId: string;
  section: SectionKind;
  /** Current description correction from useFieldCorrections (for initial list when no history) */
  descriptionCorrection: { html_diff: string; correction: WritingCorrection } | null;
  formFieldName?: string;
}

export interface UseItemDescriptionDraftHistoryResult {
  /** The correction to display (list[currentIndex] or null) */
  descriptionCorrection: { html_diff: string; correction: WritingCorrection } | null;
  onRetry: (() => Promise<void>) | undefined;
  onBack: (() => void) | undefined;
  canGoBack: boolean;
  onForward: (() => void) | undefined;
  canGoForward: boolean;
  /** True while a retry request is in progress (disable retry button, show loading) */
  isRetrying: boolean;
  /** 1-based draft index (1 = newest) for display */
  draftIndex: number;
  /** Total number of draft versions */
  draftTotal: number;
}

export function useItemDescriptionDraftHistory(
  params: UseItemDescriptionDraftHistoryParams
): UseItemDescriptionDraftHistoryResult {
  const {
    cvId,
    itemId,
    section,
    descriptionCorrection: initialDescriptionCorrection,
    formFieldName = "description",
  } = params;
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");
  const storeRewordingMode = useCVQualityStore((s) =>
    s.currentCvId === cvId ? s.rewordingMode : "minimal"
  );
  const { currentAnalysisId, setFieldDraftHistory } = useCVQualityStore();
  const { showSuccess, showError } = useNotifications();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [retrying, setRetrying] = React.useState(false);

  const fieldPath = getFieldPathForSection(section);
  const key = getDraftHistoryKey(fieldPath, itemId);
  const apiPath = fieldPath;

  const generationsList = React.useMemo((): Issue[] => {
    const history = qualityAnalysis?.field_draft_histories?.[key];
    if (history && history.length > 0) return history;
    if (initialDescriptionCorrection) {
      const issue = descriptionCorrectionToIssue(
        initialDescriptionCorrection,
        section
      );
      return [issue];
    }
    return [];
  }, [qualityAnalysis?.field_draft_histories, key, initialDescriptionCorrection, section]);

  React.useEffect(() => {
    if (currentIndex >= generationsList.length && generationsList.length > 0) {
      setCurrentIndex(0);
    }
  }, [generationsList.length, currentIndex]);

  const descriptionCorrection =
    generationsList.length > 0 && currentIndex < generationsList.length
      ? issueToDescriptionCorrection(generationsList[currentIndex], formFieldName)
      : null;

  const rewordingModeForRetry: RewordingMode = React.useMemo(() => {
    if (qualityAnalysis?.correction_mode === "coaching") {
      return qualityAnalysis.rewording_mode === "deep" ? "deep" : "minimal";
    }
    return storeRewordingMode;
  }, [
    qualityAnalysis?.correction_mode,
    qualityAnalysis?.rewording_mode,
    storeRewordingMode,
  ]);

  const onRetryCallback = React.useCallback(async () => {
    if (!cvId || !currentAnalysisId) return;
    setRetrying(true);
    try {
      const response = await aiService.requestFieldRetry(
        cvId,
        currentAnalysisId,
        apiPath,
        itemId,
        rewordingModeForRetry
      );
      setFieldDraftHistory(cvId, key, response.list_for_field);
      setCurrentIndex(0);
      showSuccess("New suggestion generated");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      showError(
        e?.response?.data?.detail ?? e?.message ?? "Failed to regenerate suggestion"
      );
    } finally {
      setRetrying(false);
    }
  }, [
    cvId,
    currentAnalysisId,
    apiPath,
    itemId,
    key,
    rewordingModeForRetry,
    setFieldDraftHistory,
    showSuccess,
    showError,
  ]);

  const onBack = React.useCallback(() => {
    setCurrentIndex((i) =>
      Math.min(i + 1, Math.max(0, generationsList.length - 1))
    );
  }, [generationsList.length]);

  const onForward = React.useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const isCoaching = qualityAnalysis?.correction_mode === "coaching";
  const nav = useDraftHistoryNavigation({
    generationsListLength: generationsList.length,
    currentIndex: currentIndex,
    isCoaching,
    onBack,
    onForward,
  });

  return {
    descriptionCorrection,
    onRetry: cvId && currentAnalysisId && isCoaching ? onRetryCallback : undefined,
    onBack: nav.onBack,
    canGoBack: nav.canGoBack,
    onForward: nav.onForward,
    canGoForward: nav.canGoForward,
    isRetrying: retrying,
    draftIndex: nav.draftIndex,
    draftTotal: nav.draftTotal,
  };
}
