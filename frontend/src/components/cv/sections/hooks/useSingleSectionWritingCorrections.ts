/**
 * Single-Section Writing Corrections Hook
 *
 * Encapsulates the single-section writing-correction flow for Personal Info and
 * Professional Summary. Provides description correction, apply/dismiss handlers,
 * draft history (up to 3 generations) with retry/back, and a factory for the
 * edit-mode handler so the form can update local state on apply.
 */

import React from "react";
import { WritingCorrection, FieldCorrection, Issue } from "../../../../types/ai";
import {
  useValidatedQualityAnalysis,
  useCVQualityStore,
} from "../../../../stores/cvQualityStore";
import { useCVStore } from "../../../../stores/cv";
import { useNotifications } from "../../../../packages/notifications";
import { aiService } from "../../../../services/ai";
import { issueToDescriptionCorrection } from "../../ai/descriptionCorrectionUtils";
import { useFieldCorrections } from "./useFieldCorrections";
import { useDraftHistoryNavigation } from "./useDraftHistoryNavigation";

export interface UseSingleSectionWritingCorrectionsParams {
  cvId: string | undefined;
  /** Section key(s) to filter writing corrections; sub-sections match by prefix (e.g. "professional_summary" matches "professional_summary.content"). For custom sections, include both "custom_sections[sectionId].content" and sectionId. */
  sectionKeys: string[];
  /** Get the new value from the updated CV after apply (e.g. c => c.parsed_data?.personal_info?.description ?? "") */
  getValueFromCV: (cv: { parsed_data?: Record<string, unknown> }) => string;
  /** Form field name for edit-mode apply (e.g. "description" or "content") */
  formFieldName: string;
  /** Override item_type filter (e.g. "custom" for custom sections); when omitted, derived from sectionKeys[0] */
  expectedItemType?: string;
  /** When section is personal_info, get value by field name for edit-mode apply (email, location, description). */
  getValueFromCVByField?: (
    cv: { parsed_data?: Record<string, unknown> },
    fieldName: string
  ) => string;
}

export interface UseSingleSectionWritingCorrectionsResult {
  descriptionCorrection: { html_diff: string; correction: WritingCorrection } | null;
  /** When section is personal_info, correction for email field; otherwise null */
  emailCorrection: { html_diff: string; correction: WritingCorrection } | null;
  /** When section is personal_info, correction for location field; otherwise null */
  locationCorrection: { html_diff: string; correction: WritingCorrection } | null;
  handleApplyFieldCorrection: (
    fieldCorrection: FieldCorrection,
    parentCorrection: WritingCorrection
  ) => Promise<void>;
  handleDismissWritingCorrection: (correction: WritingCorrection) => Promise<void>;
  createWritingCorrectionHandler: (
    mode: "edit" | "display",
    editData?: Record<string, unknown>,
    updateData?: (field: string, value: unknown) => void,
    onSaveCallback?: (data: Record<string, unknown>) => Promise<void>
  ) => (
    _fieldCorrection: FieldCorrection,
    parentCorrection: WritingCorrection
  ) => Promise<void>;
  /** Retry (single-field coaching); call API and refresh draft history */
  onRetry: (() => Promise<void>) | undefined;
  /** Back (revisit older generation) */
  onBack: (() => void) | undefined;
  /** True when there is an older generation to show */
  canGoBack: boolean;
  /** Forward (revisit newer generation) */
  onForward: (() => void) | undefined;
  /** True when there is a newer generation to show */
  canGoForward: boolean;
  /** True while a retry request is in progress (disable retry button, show loading) */
  isRetrying: boolean;
  /** 1-based draft index (1 = newest) for display */
  draftIndex: number;
  /** Total number of draft versions */
  draftTotal: number;
}

/** Match issue field_path against sectionKeys (exact or prefix e.g. "professional_summary.content" matches key "professional_summary"). Handles custom_sections[sectionId].content when sectionKeys includes sectionId. */
function sectionMatchesKeys(fieldPath: string | undefined | null, sectionKeys: string[]): boolean {
  if (!fieldPath) return false;
  return sectionKeys.some(
    (sk) =>
      fieldPath === sk ||
      fieldPath.startsWith(sk + ".") ||
      fieldPath === `custom_sections[${sk}].content` ||
      fieldPath.startsWith(`custom_sections[${sk}].`)
  );
}

/**
 * Hook for single-section writing corrections (Personal Info, Professional Summary).
 * Filters corrections by section, derives itemId, and wires apply/dismiss with optional edit-mode form update.
 */
export function useSingleSectionWritingCorrections(
  params: UseSingleSectionWritingCorrectionsParams
): UseSingleSectionWritingCorrectionsResult {
  const {
    cvId,
    sectionKeys,
    getValueFromCV,
    formFieldName,
    expectedItemType,
    getValueFromCVByField,
  } = params;
  const isPersonalInfo = sectionKeys[0] === "personal_info";
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");
  const {
    dismissWritingCorrection,
    currentAnalysisId,
    setFieldDraftHistory,
  } = useCVQualityStore();
  const setCurrentCV = useCVStore((s) => s.setCurrentCV);
  const updateCVInList = useCVStore((s) => s.updateCVInList);
  const { showSuccess, showError } = useNotifications();
  const [currentGenerationIndex, setCurrentGenerationIndex] = React.useState(0);
  const [retrying, setRetrying] = React.useState(false);

  const fieldPath =
    sectionKeys[0] === "personal_info"
      ? "personal_info.description"
      : (sectionKeys[0] ?? "");

  const effectiveItemType =
    expectedItemType ?? sectionKeys[0]?.split(".")[0] ?? "";

  const writingCorrections = React.useMemo(() => {
    const issues = qualityAnalysis?.issues ?? [];
    const out: WritingCorrection[] = [];
    for (const i of issues) {
      if (!sectionMatchesKeys(i.field_path, sectionKeys) || !i.html_diff) continue;
      if (effectiveItemType && i.item_type !== effectiveItemType) continue;
      const fieldName =
        isPersonalInfo && i.field_path
          ? (i.field_path.split(".").pop() ?? formFieldName)
          : formFieldName;
      const itemId = i.item_id ?? "";
      out.push({
        item_id: itemId,
        field_path: i.field_path,
        importance: i.issue_severity === "critical" ? "highly_recommended" : "standard",
        field_corrections: [
          {
            field_name: fieldName,
            html_diff: i.html_diff,
            reasoning: i.reasoning,
            original_value: i.original ?? "",
            corrected_value: i.suggested ?? "",
          },
        ],
      });
    }
    return out;
  }, [qualityAnalysis?.issues, sectionKeys, formFieldName, effectiveItemType, isPersonalInfo]);

  const itemId =
    writingCorrections.length > 0
      ? writingCorrections[0].item_id
      : sectionKeys[0]?.replace(".description", "") ?? "";

  const generationsList = React.useMemo((): Issue[] => {
    const history = qualityAnalysis?.field_draft_histories?.[fieldPath];
    if (history && history.length > 0) return history;
    const issues = qualityAnalysis?.issues ?? [];
    if (isPersonalInfo) {
      const descIssue = issues.find(
        (i) =>
          i.field_path === "personal_info.description" &&
          i.html_diff &&
          (!effectiveItemType || i.item_type === effectiveItemType)
      );
      return descIssue ? [descIssue] : [];
    }
    for (const i of issues) {
      if (!sectionMatchesKeys(i.field_path, sectionKeys) || !i.html_diff) continue;
      if (effectiveItemType && i.item_type !== effectiveItemType) continue;
      return [i];
    }
    return [];
  }, [
    qualityAnalysis?.field_draft_histories,
    qualityAnalysis?.issues,
    fieldPath,
    sectionKeys,
    effectiveItemType,
    isPersonalInfo,
  ]);

  React.useEffect(() => {
    if (currentGenerationIndex >= generationsList.length && generationsList.length > 0) {
      setCurrentGenerationIndex(0);
    }
  }, [generationsList.length, currentGenerationIndex]);

  /** Resolve the new field value after apply: from updated CV (by field for personal_info, else section getter) or fallback to current edit data. */
  const resolveFieldValue = React.useCallback(
    (
      updatedCV: { parsed_data?: Record<string, unknown> },
      fieldName: string,
      editData: Record<string, unknown>
    ): string => {
      const fromCV =
        isPersonalInfo && getValueFromCVByField
          ? getValueFromCVByField(
              {
                parsed_data: updatedCV.parsed_data as
                  | Record<string, unknown>
                  | undefined,
              },
              fieldName
            )
          : getValueFromCV({
              parsed_data: updatedCV.parsed_data as
                | Record<string, unknown>
                | undefined,
            });
      return fromCV ?? (editData[fieldName] as string) ?? "";
    },
    [isPersonalInfo, getValueFromCVByField, getValueFromCV]
  );

  const createWritingCorrectionHandler = React.useCallback(
    (
      mode: "edit" | "display",
      editData?: Record<string, unknown>,
      updateData?: (field: string, value: unknown) => void,
      onSaveCallback?: (data: Record<string, unknown>) => Promise<void>
    ) => {
      return async (
        _fieldCorrection: FieldCorrection,
        parentCorrection: WritingCorrection
      ) => {
        if (!cvId || !currentAnalysisId) {
          showError("Cannot apply correction: CV ID or analysis ID missing");
          return;
        }
        // ID sent to API: personal_info needs full path (e.g. "personal_info.email"); other sections use item_id, else first segment of field_path, else section key.
        const correctionId = isPersonalInfo && parentCorrection.field_path
          ? parentCorrection.field_path
          : parentCorrection.item_id ||
            (parentCorrection.field_path?.split(".")[0]) ||
            sectionKeys[0] ||
            "";
        if (!correctionId) {
          showError("Cannot apply correction: correction ID missing");
          return;
        }
        try {
          const updatedCV = await aiService.applyWritingCorrection(
            cvId,
            currentAnalysisId,
            correctionId,
            currentGenerationIndex
          );
          setCurrentCV(updatedCV);
          updateCVInList(updatedCV);
          if (
            mode === "edit" &&
            updateData &&
            onSaveCallback &&
            editData !== undefined
          ) {
            const fieldName =
              isPersonalInfo && parentCorrection.field_path
                ? (parentCorrection.field_path.split(".").pop() ?? formFieldName)
                : formFieldName;
            const newValue = resolveFieldValue(updatedCV as unknown as { parsed_data?: Record<string, unknown> }, fieldName, editData);
            updateData(fieldName, newValue);
            const updatedEditData = { ...editData, [fieldName]: newValue };
            await onSaveCallback(updatedEditData);
          }
          await dismissWritingCorrection(
            correctionId,
            parentCorrection.field_path
          );
          showSuccess("Writing correction applied successfully");
        } catch (error: unknown) {
          const err = error as { response?: { data?: { detail?: string } }; message?: string };
          const errorMessage =
            err?.response?.data?.detail ??
            err?.message ??
            "Failed to apply writing correction";
          showError(errorMessage);
        }
      };
    },
    [
      cvId,
      currentAnalysisId,
      currentGenerationIndex,
      sectionKeys,
      formFieldName,
      isPersonalInfo,
      resolveFieldValue,
      setCurrentCV,
      updateCVInList,
      dismissWritingCorrection,
      showSuccess,
      showError,
    ]
  );

  const handleApplyFieldCorrection = React.useMemo(
    () => createWritingCorrectionHandler("display"),
    [createWritingCorrectionHandler]
  );

  const handleDismissWritingCorrection = React.useCallback(
    async (correction: WritingCorrection) => {
      await dismissWritingCorrection(correction.item_id, correction.field_path);
      showSuccess("Writing correction dismissed");
    },
    [dismissWritingCorrection, showSuccess]
  );

  // fieldCorrectionProps/helpers only; descriptionCorrection comes from generationsList below
  useFieldCorrections(
    itemId,
    writingCorrections,
    [{ fieldName: formFieldName }],
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    formFieldName
  );

  const descriptionCorrection =
    generationsList.length > 0 && currentGenerationIndex < generationsList.length
      ? issueToDescriptionCorrection(
          generationsList[currentGenerationIndex],
          formFieldName
        )
      : null;

  const onRetryCallback = React.useCallback(async () => {
    if (!cvId || !currentAnalysisId || !fieldPath) return;
    setRetrying(true);
    try {
      const response = await aiService.requestFieldRetry(
        cvId,
        currentAnalysisId,
        fieldPath,
        itemId || undefined
      );
      setFieldDraftHistory(cvId, fieldPath, response.list_for_field);
      setCurrentGenerationIndex(0);
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
    fieldPath,
    itemId,
    setFieldDraftHistory,
    showSuccess,
    showError,
  ]);

  const onBack = React.useCallback(() => {
    setCurrentGenerationIndex((i) =>
      Math.min(i + 1, Math.max(0, generationsList.length - 1))
    );
  }, [generationsList.length]);

  const onForward = React.useCallback(() => {
    setCurrentGenerationIndex((i) => Math.max(0, i - 1));
  }, []);

  const isCoaching = qualityAnalysis?.correction_mode === "coaching";
  const nav = useDraftHistoryNavigation({
    generationsListLength: generationsList.length,
    currentIndex: currentGenerationIndex,
    isCoaching,
    onBack,
    onForward,
  });

  return {
    descriptionCorrection,
    emailCorrection: null,
    locationCorrection: null,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    createWritingCorrectionHandler,
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
