/**
 * Shared utilities for mapping between Issue (quality analysis) and the
 * descriptionCorrection shape used by InlineFieldCorrection / CompactSuggestionCard.
 * Used by useSingleSectionWritingCorrections and useItemDescriptionDraftHistory.
 */

import type { Issue, IssueItemType, WritingCorrection } from "../../../types/ai";

export interface DescriptionCorrectionShape {
  html_diff: string;
  correction: WritingCorrection;
}

/**
 * Map an Issue to the descriptionCorrection shape used by InlineFieldCorrection.
 */
export function issueToDescriptionCorrection(
  issue: Issue,
  formFieldName: string
): DescriptionCorrectionShape {
  const htmlDiff = issue.html_diff ?? "";
  return {
    html_diff: htmlDiff,
    correction: {
      item_id: issue.item_id ?? "",
      field_path: issue.field_path,
      importance:
        issue.issue_severity === "critical" ? "highly_recommended" : "standard",
      field_corrections: [
        {
          field_name: formFieldName,
          html_diff: htmlDiff,
          reasoning: issue.reasoning,
          original_value: issue.original ?? "",
          corrected_value: issue.suggested ?? "",
        },
      ],
    },
  };
}

/**
 * Convert a descriptionCorrection (from issues / useFieldCorrections) to an
 * Issue-like object for the draft history list. Pass itemType when the section
 * is known (e.g. "education") so the returned issue has the correct item_type.
 */
export function descriptionCorrectionToIssue(
  dc: DescriptionCorrectionShape,
  itemType?: IssueItemType
): Issue {
  const c = dc.correction;
  const fc = c.field_corrections?.[0];
  return {
    item_type: itemType ?? "work_experience",
    item_id: c.item_id,
    field_path: c.field_path,
    issue_severity: c.importance === "highly_recommended" ? "critical" : "major",
    issue_category: "grammar_errors",
    quality_score: null,
    reasoning: fc?.reasoning ?? "",
    html_diff: dc.html_diff,
    coaching: null,
    original: fc?.original_value,
    suggested: fc?.corrected_value,
  };
}
