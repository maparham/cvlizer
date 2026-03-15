/**
 * Hook that returns a render function for personal info inline field corrections
 * (email, location). Encapsulates overwrite-confirm, apply, dismiss, and clearEdited flow.
 */

import React, { useCallback } from "react";
import { Box } from "@mui/material";
import { FieldCorrection, WritingCorrection } from "../../../../types/ai";
import { InlineFieldCorrection } from "../../ai/InlineFieldCorrection";
import { OVERWRITE_MSG } from "../../../../contexts/OverwriteConfirmContext";
import { buildQualitySuggestionId } from "../../../../utils/qualitySuggestionIds";

export interface PersonalInfoInlineCorrectionConfig {
  fieldKey: string;
}

export type DescriptionCorrectionShape = {
  html_diff: string;
  correction: WritingCorrection;
};

export interface UsePersonalInfoInlineCorrectionParams {
  cvId: string | undefined;
  isEdited: (cvId: string, fieldKey: string) => boolean;
  overwriteConfirm: (message: string) => Promise<boolean>;
  clearEdited: (cvId: string, fieldKey: string) => void;
  handleApplyFieldCorrection: (
    fieldCorrection: FieldCorrection,
    parentCorrection: WritingCorrection
  ) => Promise<void>;
  handleDismissWritingCorrection: (correction: WritingCorrection) => Promise<void>;
}

export type RenderInlineCorrection = (
  config: PersonalInfoInlineCorrectionConfig,
  correction: DescriptionCorrectionShape | null,
  mode: "edit" | "display",
  editApplyHandler?: (
    _fieldCorrection: FieldCorrection,
    parentCorrection: WritingCorrection
  ) => Promise<void>
) => React.ReactNode;

/**
 * Returns a stable render function for personal info inline corrections.
 * Use for email and location InlineFieldCorrection blocks in edit and display modes.
 */
export function usePersonalInfoInlineCorrection(
  params: UsePersonalInfoInlineCorrectionParams
): RenderInlineCorrection {
  const {
    cvId,
    isEdited,
    overwriteConfirm,
    clearEdited,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
  } = params;

  return useCallback<RenderInlineCorrection>(
    (config, correction, mode, editApplyHandler) => {
      if (!correction) return null;
      const applyHandler =
        mode === "edit" && editApplyHandler
          ? editApplyHandler
          : handleApplyFieldCorrection;
      const fieldCorrectionArg =
        mode === "edit"
          ? ({} as FieldCorrection)
          : correction.correction.field_corrections?.[0] ?? ({} as FieldCorrection);
      return (
        <Box sx={{ width: "100%", mt: mode === "edit" ? 0.5 : 1.5 }}>
          <InlineFieldCorrection
            htmlDiffCorrection={correction}
            importance={correction.correction.importance ?? "standard"}
            reasoning={correction.correction.field_corrections?.[0]?.reasoning}
            onApply={async () => {
              if (cvId && isEdited(cvId, config.fieldKey)) {
                const ok = await overwriteConfirm(OVERWRITE_MSG);
                if (!ok) return;
              }
              await applyHandler(fieldCorrectionArg, correction.correction);
              if (cvId) clearEdited(cvId, config.fieldKey);
            }}
            onDismiss={() =>
              handleDismissWritingCorrection(correction.correction)
            }
            {...(mode === "display" && {
              suggestionCardId: buildQualitySuggestionId(
                "personal_info",
                "single",
                config.fieldKey
              ),
            })}
          />
        </Box>
      );
    },
    [
      cvId,
      isEdited,
      overwriteConfirm,
      clearEdited,
      handleApplyFieldCorrection,
      handleDismissWritingCorrection,
    ]
  );
}
