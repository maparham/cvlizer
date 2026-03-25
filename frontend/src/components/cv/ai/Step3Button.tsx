/**
 * Enhance CV for this Job button with loading state (AIEnhancementLoadingState)
 * and tooltip/disabled logic.
 */

import React from 'react';
import Button from '@mui/material/Button';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AIEnhancementLoadingState from './AIEnhancementLoadingState';
import { SHARED_STEP_BUTTON_SX } from './StepButton';

const LABEL_ENHANCE = 'Enhance CV for this Job';

export function getStep3TooltipTitle(
  hasActiveJob: boolean,
  completeness: { isComplete: boolean; missing: string[] } | null
): string {
  if (!hasActiveJob) {
    return 'Select a job description to enable this.';
  }
  if (completeness && !completeness.isComplete) {
    return `CV needs more content: ${completeness.missing.join(', ')}`;
  }
  return 'Generates personalized suggestions to tailor your CV for the selected job.';
}

export function isStep3Disabled(
  hasActiveJob: boolean,
  completeness: { isComplete: boolean; missing: string[] } | null,
  anyStepLoading: boolean,
  isParsing: boolean,
  countdownSeconds: number | null
): boolean {
  return (
    !hasActiveJob ||
    (completeness !== null && !completeness.isComplete) ||
    anyStepLoading ||
    isParsing ||
    (countdownSeconds != null && countdownSeconds > 0)
  );
}

export interface Step3ButtonProps {
  hasActiveJob: boolean;
  completeness: { isComplete: boolean; missing: string[] } | null;
  anyStepLoading: boolean;
  isParsing?: boolean;
  countdownSeconds: number | null;
  suggestionsLoading: boolean;
  onGenerate: () => void;
}

export const Step3Button: React.FC<Step3ButtonProps> = ({
  hasActiveJob,
  completeness,
  anyStepLoading,
  isParsing = false,
  countdownSeconds,
  suggestionsLoading,
  onGenerate,
}) => {
  if (suggestionsLoading) {
    return <AIEnhancementLoadingState />;
  }

  const disabled = isStep3Disabled(
    hasActiveJob,
    completeness,
    anyStepLoading,
    isParsing,
    countdownSeconds
  );

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<AutoAwesomeIcon sx={{ fontSize: 28 }} />}
      onClick={onGenerate}
      disabled={disabled}
      sx={SHARED_STEP_BUTTON_SX}
    >
      {LABEL_ENHANCE}
    </Button>
  );
};
