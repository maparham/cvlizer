/**
 * Single-Section Writing Corrections Hook
 *
 * Encapsulates the single-section writing-correction flow for Personal Info and
 * Professional Summary. Provides description correction, apply/dismiss handlers,
 * and a factory for the edit-mode handler so the form can update local state on apply.
 */

import React from "react";
import { WritingCorrection, FieldCorrection } from "../../../../types/ai";
import {
  useValidatedQualityAnalysis,
  useCVQualityStore,
} from "../../../../stores/cvQualityStore";
import { useCVStore } from "../../../../stores/cv";
import { useNotifications } from "../../../../packages/notifications";
import { aiService } from "../../../../services/ai";
import { useFieldCorrections } from "./useFieldCorrections";

export interface UseSingleSectionWritingCorrectionsParams {
  cvId: string | undefined;
  /** Section key(s) to filter writing corrections (e.g. ["personal_info", "personal_info.description"] or ["professional_summary"]) */
  sectionKeys: string[];
  /** Get the new value from the updated CV after apply (e.g. c => c.parsed_data?.personal_info?.description ?? "") */
  getValueFromCV: (cv: { parsed_data?: Record<string, unknown> }) => string;
  /** Form field name for edit-mode apply (e.g. "description" or "content") */
  formFieldName: string;
}

export interface UseSingleSectionWritingCorrectionsResult {
  descriptionCorrection: { html_diff: string; correction: WritingCorrection } | null;
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
}

/**
 * Hook for single-section writing corrections (Personal Info, Professional Summary).
 * Filters corrections by section, derives itemId, and wires apply/dismiss with optional edit-mode form update.
 */
export function useSingleSectionWritingCorrections(
  params: UseSingleSectionWritingCorrectionsParams
): UseSingleSectionWritingCorrectionsResult {
  const { cvId, sectionKeys, getValueFromCV, formFieldName } = params;
  const qualityAnalysis = useValidatedQualityAnalysis(cvId || "");
  const { dismissWritingCorrection, currentAnalysisId } = useCVQualityStore();
  const setCurrentCV = useCVStore((s) => s.setCurrentCV);
  const updateCVInList = useCVStore((s) => s.updateCVInList);
  const { showSuccess, showError } = useNotifications();

  const writingCorrections = React.useMemo(() => {
    return (
      qualityAnalysis?.writing_corrections?.filter((c) =>
        sectionKeys.includes(c.section)
      ) ?? []
    );
  }, [qualityAnalysis?.writing_corrections, sectionKeys]);

  const itemId =
    writingCorrections.length > 0
      ? writingCorrections[0].item_id
      : sectionKeys[0]?.replace(".description", "") ?? "";

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
        try {
          const updatedCV = await aiService.applyWritingCorrection(
            cvId,
            currentAnalysisId,
            parentCorrection.item_id
          );
          setCurrentCV(updatedCV);
          updateCVInList(updatedCV);
          if (
            mode === "edit" &&
            updateData &&
            onSaveCallback &&
            editData !== undefined
          ) {
            const newValue =
              getValueFromCV({
                parsed_data: updatedCV.parsed_data as
                  | Record<string, unknown>
                  | undefined,
              }) ??
              (editData[formFieldName] as string) ??
              "";
            updateData(formFieldName, newValue);
            const updatedEditData = { ...editData, [formFieldName]: newValue };
            await onSaveCallback(updatedEditData);
          }
          await dismissWritingCorrection(
            parentCorrection.item_id,
            parentCorrection.section
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
      getValueFromCV,
      formFieldName,
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
      await dismissWritingCorrection(correction.item_id, correction.section);
      showSuccess("Writing correction dismissed");
    },
    [dismissWritingCorrection, showSuccess]
  );

  const { descriptionCorrection } = useFieldCorrections(
    itemId,
    writingCorrections,
    [{ fieldName: formFieldName }],
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    formFieldName
  );

  return {
    descriptionCorrection,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    createWritingCorrectionHandler,
  };
}
