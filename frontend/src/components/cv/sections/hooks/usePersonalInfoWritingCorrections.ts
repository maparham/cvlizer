/**
 * Personal-info-specific writing corrections: wraps useSingleSectionWritingCorrections
 * and adds email/location field corrections derived from quality analysis issues.
 * Use only for the Personal Info section.
 */

import React from "react";
import { useValidatedQualityAnalysis } from "../../../../stores/cvQualityStore";
import { issueToDescriptionCorrection } from "../../ai/descriptionCorrectionUtils";
import {
  useSingleSectionWritingCorrections,
  UseSingleSectionWritingCorrectionsResult,
} from "./useSingleSectionWritingCorrections";

const PERSONAL_INFO_ITEM_TYPE = "personal_info";

export interface UsePersonalInfoWritingCorrectionsParams {
  cvId: string | undefined;
  getValueFromCV: (cv: { parsed_data?: Record<string, unknown> }) => string;
  getValueFromCVByField: (
    cv: { parsed_data?: Record<string, unknown> },
    fieldName: string
  ) => string;
}

/**
 * Writing corrections for the Personal Info section: description plus email and location.
 * Delegates to useSingleSectionWritingCorrections and adds emailCorrection/locationCorrection
 * from quality analysis issues.
 */
export function usePersonalInfoWritingCorrections(
  params: UsePersonalInfoWritingCorrectionsParams
): UseSingleSectionWritingCorrectionsResult {
  const { cvId, getValueFromCV, getValueFromCVByField } = params;

  const base = useSingleSectionWritingCorrections({
    cvId,
    sectionKeys: ["personal_info", "personal_info.description"],
    getValueFromCV,
    formFieldName: "description",
    getValueFromCVByField,
  });

  const qualityAnalysis = useValidatedQualityAnalysis(cvId ?? "");

  const buildFieldCorrection = React.useCallback(
    (fieldPath: string, fieldName: string) => {
      const issue = qualityAnalysis?.issues?.find(
        (i) =>
          i.field_path === fieldPath &&
          i.html_diff &&
          (!i.item_type || i.item_type === PERSONAL_INFO_ITEM_TYPE)
      );
      return issue ? issueToDescriptionCorrection(issue, fieldName) : null;
    },
    [qualityAnalysis?.issues]
  );

  const emailCorrection = React.useMemo(
    () => buildFieldCorrection("personal_info.email", "email"),
    [buildFieldCorrection]
  );

  const locationCorrection = React.useMemo(
    () => buildFieldCorrection("personal_info.location", "location"),
    [buildFieldCorrection]
  );

  return {
    ...base,
    emailCorrection,
    locationCorrection,
  };
}
