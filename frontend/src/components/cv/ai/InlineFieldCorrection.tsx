/**
 * Inline Field Correction Component
 *
 * Displays writing corrections inline next to their target fields.
 * Shows compact correction UI with original/corrected values or markdown diff.
 * Uses CompactSuggestionCard for consistent UI.
 */

import React from 'react';
import { FieldCorrection, WritingCorrection } from '../../../types/ai';
import { CompactSuggestionCard } from './CompactSuggestionCard';
import { getFieldLabel } from './utils/suggestionUtils';

interface InlineFieldCorrectionProps {
  /** For field corrections (structured fields) */
  fieldCorrection?: FieldCorrection | null;
  /** For HTML diff corrections (description/text fields) */
  htmlDiffCorrection?: { html_diff: string; correction: WritingCorrection } | null;
  /** Importance level */
  importance: 'highly_recommended' | 'standard';
  /** Optional reasoning */
  reasoning?: string;
  /** Callback when apply is clicked */
  onApply: () => void;
  /** Callback when dismiss is clicked */
  onDismiss: () => void;
}

export const InlineFieldCorrection: React.FC<InlineFieldCorrectionProps> = ({
  fieldCorrection,
  htmlDiffCorrection,
  importance,
  reasoning,
  onApply,
  onDismiss,
}) => {
  // Determine which type of correction we have
  const hasFieldCorrection = !!fieldCorrection;
  const hasHtmlDiff = !!htmlDiffCorrection;

  if (!hasFieldCorrection && !hasHtmlDiff) {
    return null;
  }

  // Get the HTML diff from whichever correction type we have
  const htmlDiff = fieldCorrection?.html_diff || htmlDiffCorrection?.html_diff || '';

  // Build tooltip title
  const importanceLabel = importance === 'highly_recommended' ? 'Highly Recommended' : 'Standard';
  const fieldLabel = hasFieldCorrection && fieldCorrection
    ? getFieldLabel(fieldCorrection.field_name)
    : 'Description';
  const tooltipTitle = `${importanceLabel} - ${fieldLabel} correction`;

  return (
    <CompactSuggestionCard
      htmlDiff={htmlDiff}
      reasoning={reasoning}
      infoTooltip={tooltipTitle}
      infoIconColor={importance === 'highly_recommended' ? 'error' : 'warning'}
      onApply={onApply}
      onDismiss={onDismiss}
      dismissDialogTitle="Dismiss Correction?"
      variant="importance"
      importance={importance}
      showContentBox={false}
    />
  );
};
