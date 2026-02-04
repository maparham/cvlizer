/**
 * DescriptionCorrectionBlock
 *
 * Shared display block for single-section writing corrections (description/content field).
 * Used in display mode by PersonalInfoSection and ProfessionalSummarySection.
 */

import React from "react";
import { Box } from "@mui/material";
import { WritingCorrection, FieldCorrection } from "../../../types/ai";
import { InlineFieldCorrection } from "./InlineFieldCorrection";

/** Find field correction and reasoning: prefer fieldName, fallback to "description". */
function getFieldCorrectionForDisplay(
  correction: WritingCorrection,
  fieldName: "description" | "content"
): { reasoning: string | undefined; fieldCorrection: FieldCorrection | undefined } {
  const fcs = correction.field_corrections ?? [];
  const byField = fcs.find((fc) => fc.field_name === fieldName);
  const byDesc = fcs.find((fc) => fc.field_name === "description");
  const fieldCorrection = byField ?? byDesc;
  return {
    reasoning: fieldCorrection?.reasoning,
    fieldCorrection,
  };
}

export interface DescriptionCorrectionBlockProps {
  descriptionCorrection: { html_diff: string; correction: WritingCorrection } | null;
  handleApplyFieldCorrection: (
    fieldCorrection: FieldCorrection,
    parentCorrection: WritingCorrection
  ) => void | Promise<void>;
  handleDismissWritingCorrection: (correction: WritingCorrection) => void | Promise<void>;
  /** Field name used in API (e.g. "description" for personal_info, "content" or "description" for professional_summary) */
  fieldName: "description" | "content";
}

export const DescriptionCorrectionBlock: React.FC<DescriptionCorrectionBlockProps> = ({
  descriptionCorrection,
  handleApplyFieldCorrection,
  handleDismissWritingCorrection,
  fieldName,
}) => {
  if (!descriptionCorrection) return null;

  const { reasoning, fieldCorrection: fieldCorrectionForApply } =
    getFieldCorrectionForDisplay(descriptionCorrection.correction, fieldName);

  return (
    <Box sx={{ mt: 1.5 }}>
      <InlineFieldCorrection
        htmlDiffCorrection={{
          html_diff: descriptionCorrection.html_diff,
          correction: descriptionCorrection.correction,
        }}
        importance={descriptionCorrection.correction.importance ?? "standard"}
        reasoning={reasoning}
        onApply={() => {
          if (fieldCorrectionForApply) {
            handleApplyFieldCorrection(
              fieldCorrectionForApply,
              descriptionCorrection.correction
            );
          }
        }}
        onDismiss={() =>
          handleDismissWritingCorrection(descriptionCorrection.correction)
        }
      />
    </Box>
  );
};
