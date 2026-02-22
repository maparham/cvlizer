/**
 * Step 3 Button Component
 *
 * "Enhance CV for this Job" button with loading state (AIEnhancementLoadingState)
 * and tooltip/disabled logic. Extracted from CVQualityPanel for consistency with Steps 1–2.
 */

import React from 'react';
import { Button, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AIEnhancementLoadingState from './AIEnhancementLoadingState';
import { SHARED_STEP_BUTTON_SX } from './StepButton';

export function getStep3TooltipTitle(
  proofreadGateActive: boolean,
  hasActiveJob: boolean,
  completeness: { isComplete: boolean; missing: string[] } | null
): string {
  if (proofreadGateActive) {
    return 'Generates personalized suggestions to tailor your CV for the selected job. Run Step 1 to activate this.';
  }
  if (!hasActiveJob) {
    return 'Select a job description to enable this step';
  }
  if (completeness && !completeness.isComplete) {
    return `CV needs more content: ${completeness.missing.join(', ')}`;
  }
  return 'Generates personalized suggestions to tailor your CV for the selected job.';
}

export function isStep3Disabled(
  proofreadGateActive: boolean,
  overallScore: number | null,
  hasActiveJob: boolean,
  completeness: { isComplete: boolean; missing: string[] } | null,
  anyStepLoading: boolean,
  isParsing: boolean,
  countdownSeconds: number | null
): boolean {
  return (
    proofreadGateActive ||
    overallScore === null ||
    !hasActiveJob ||
    (completeness !== null && !completeness.isComplete) ||
    anyStepLoading ||
    isParsing ||
    (countdownSeconds != null && countdownSeconds > 0)
  );
}

export interface Step3ButtonProps {
  proofreadGateActive: boolean;
  overallScore: number | null;
  hasActiveJob: boolean;
  completeness: { isComplete: boolean; missing: string[] } | null;
  anyStepLoading: boolean;
  isParsing?: boolean;
  countdownSeconds: number | null;
  suggestionsLoading: boolean;
  onGenerate: () => void;
}

export const Step3Button: React.FC<Step3ButtonProps> = ({
  proofreadGateActive,
  overallScore,
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

  const tooltipTitle = getStep3TooltipTitle(
    proofreadGateActive,
    hasActiveJob,
    completeness
  );
  const disabled = isStep3Disabled(
    proofreadGateActive,
    overallScore,
    hasActiveJob,
    completeness,
    anyStepLoading,
    isParsing,
    countdownSeconds
  );

  return (
    <Button
      variant="outlined"
      color="inherit"
      fullWidth
      startIcon={<AutoAwesomeIcon />}
      endIcon={
        <Tooltip title={tooltipTitle} arrow>
          <span
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              cursor: 'help',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <HelpOutlineIcon fontSize="small" />
          </span>
        </Tooltip>
      }
      onClick={onGenerate}
      disabled={disabled}
      sx={SHARED_STEP_BUTTON_SX}
    >
      Step 3: Enhance CV for this Job
    </Button>
  );
};
