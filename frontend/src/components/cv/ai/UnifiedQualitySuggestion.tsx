/**
 * Unified Quality Suggestion Component
 *
 * Compact quality suggestion card with inline reasoning and icon-only action buttons.
 * Coaching questions are shown in a tooltip for space efficiency.
 * Uses CompactSuggestionCard for consistent UI.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { LowQualityItem, WritingCorrection, ProfessionalSummaryQualitySuggestion, CoachingQuestion } from '../../../types/ai';
import { CompactSuggestionCard } from './CompactSuggestionCard';
import { normalizeQualitySuggestion } from './utils/qualitySuggestionNormalizer';

/**
 * Tooltip content for coaching questions
 */
const CoachingQuestionsTooltipContent: React.FC<{ questions: CoachingQuestion[] }> = ({ questions }) => (
  <Box sx={{ p: 0.5 }}>
    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
      Consider these questions:
    </Typography>
    {questions.map((q, idx) => (
      <Typography key={idx} variant="caption" sx={{ display: 'block', mt: 0.5 }}>
        • {q.question}
      </Typography>
    ))}
  </Box>
);

interface UnifiedQualitySuggestionProps {
  itemId: string;
  section: 'work_experience' | 'education' | 'professional_summary';
  qualitySuggestion?: LowQualityItem | ProfessionalSummaryQualitySuggestion;
  writingCorrections?: WritingCorrection[];
  onApplyQuality?: (suggested: string) => void | Promise<void>;
  onDismissQuality?: () => void | Promise<void>;
  onApplyWritingCorrection?: (correction: WritingCorrection) => void | Promise<void>;
  onDismissWritingCorrection?: (correction: WritingCorrection) => void | Promise<void>;
  onApplyAll?: (itemId: string, qualitySuggested?: string, writingCorrections?: WritingCorrection[]) => void | Promise<void>;
}

export const UnifiedQualitySuggestion: React.FC<UnifiedQualitySuggestionProps> = ({
  itemId,
  section: _section,
  qualitySuggestion,
  writingCorrections = [],
  onApplyQuality,
  onDismissQuality,
  onApplyWritingCorrection,
  onDismissWritingCorrection,
  onApplyAll,
}) => {
  const hasQualitySuggestion = !!qualitySuggestion;

  // Only render if there's a quality suggestion (writing corrections are shown inline)
  if (!hasQualitySuggestion || !qualitySuggestion) {
    return null;
  }

  // Normalize quality suggestion data for consistent rendering
  const normalized = normalizeQualitySuggestion(qualitySuggestion);

  // Build importance label for tooltip
  const importanceLabel = normalized.qualityScore !== undefined
    ? `Quality Score: ${normalized.qualityScore}/100`
    : 'Quality Suggestion';

  // Get coaching questions if available
  const coachingQuestions = normalized.coachingQuestions || [];

  // Build reasoning text (prioritize reasoning, fallback to keyChanges)
  const reasoningText = normalized.reasoning ||
    (normalized.keyChanges && normalized.keyChanges.length > 0
      ? normalized.keyChanges.join(' • ')
      : undefined);

  /**
   * Handle Apply All - applies both quality suggestion and all writing corrections
   * Uses atomic apply if available, otherwise falls back to sequential applies
   */
  const handleApplyAll = async () => {
    if (onApplyAll) {
      await onApplyAll(
        itemId,
        normalized.suggested,
        writingCorrections.length > 0 ? writingCorrections : undefined
      );
      return;
    }

    // Fallback to sequential applies
    if (onApplyQuality) {
      await onApplyQuality(normalized.suggested);
    }

    if (writingCorrections.length > 0 && onApplyWritingCorrection) {
      await Promise.all(
        writingCorrections.map((correction) =>
          onApplyWritingCorrection(correction)
        )
      );
    }
  };

  /**
   * Handle Dismiss All - dismisses both quality suggestion and all writing corrections
   */
  const handleDismissAll = async () => {
    if (onDismissQuality) {
      await onDismissQuality();
    }

    if (writingCorrections.length > 0 && onDismissWritingCorrection) {
      await Promise.all(
        writingCorrections.map((correction) =>
          onDismissWritingCorrection(correction)
        )
      );
    }
  };

  return (
    <CompactSuggestionCard
      htmlDiff={normalized.htmlDiff}
      reasoning={reasoningText}
      infoTooltip={importanceLabel}
      infoIconColor={normalized.qualityScore !== undefined && normalized.qualityScore < 50 ? 'error' : 'warning'}
      helpTooltipContent={coachingQuestions.length > 0 ? <CoachingQuestionsTooltipContent questions={coachingQuestions} /> : undefined}
      onApply={handleApplyAll}
      onDismiss={handleDismissAll}
      dismissDialogTitle="Dismiss Suggestion?"
      variant="default"
    />
  );
};
