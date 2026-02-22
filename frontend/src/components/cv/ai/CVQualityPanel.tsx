/**
 * CV Quality Panel Component
 *
 * Displays quality score badge and step buttons (1–3). Steps run in order:
 * Step 1 (proofread) → Step 2 (coaching) → Step 3 (job-fit suggestions).
 * Shown in the AI suggestions sidebar.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Typography, Chip, Alert, Stack } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useCVQualityStore } from '../../../stores/cvQualityStore';
import { useAITaskPollingContext } from '../../../contexts/AITaskPollingContext';
import { calculateCVCompleteness } from '../../../utils/cvCompleteness';
import { StepButton } from './StepButton';
import { Step3Button } from './Step3Button';
import { useTypewriterMessages } from '../../../hooks/useTypewriterMessages';
import { useLoadingStep } from '../../../hooks/useLoadingStep';
import type { CorrectionMode } from '../../../services/ai';

/** Suffix-only messages; prefix "Step i: " stays fixed during loading. */
const STEP1_LOADING_SUFFIXES = [
  'Checking spelling',
  'Checking grammar',
  'Checking punctuation',
  'May take a minute...',
];

const STEP2_LOADING_SUFFIXES = [
  'Analyzing style',
  'Improving clarity',
  'Enhancing impact',
  'May take a minute...',
];

const STEP1_PREFIX = 'Step 1: ';
const STEP2_PREFIX = 'Step 2: ';

/** minWidth = prefix + longest suffix to prevent button flicker during rotation. */
const STEP1_LOADING_MIN_WIDTH_CH =
  STEP1_PREFIX.length + Math.max(...STEP1_LOADING_SUFFIXES.map((m) => m.length));
const STEP2_LOADING_MIN_WIDTH_CH =
  STEP2_PREFIX.length + Math.max(...STEP2_LOADING_SUFFIXES.map((m) => m.length));

// Scoped selector: Only return values if they belong to the current CV
const useScopedQualityState = (cvId: string) => {
  return useCVQualityStore((state) => {
    // Only return state if it belongs to the current CV
    if (state.currentCvId === cvId) {
      return {
        overallScore: state.overallScore,
        analysisLoading: state.analysisLoading,
        analysisError: state.analysisError,
        proofreadScore: state.proofreadScore,
        currentCorrectionMode: state.currentCorrectionMode,
      };
    }
    // Return null/empty state if CV doesn't match
    return {
      overallScore: null,
      analysisLoading: false,
      analysisError: null,
      proofreadScore: null,
      currentCorrectionMode: null,
    };
  });
};

interface CVQualityPanelProps {
  cvId: string;
  /** When true, disable coaching option until proofread score is at least 80 (file-parsed CVs only). */
  proofreadGateActive?: boolean;
  /** Props for Step 3 (Enhance CV for this Job). When provided and activeJobDescription exists, Step 3 is rendered. */
  step3Props?: {
    onGenerateSuggestions: () => void;
    suggestionsLoading: boolean;
    activeJobDescription: { is_parsing?: boolean } | null;
    countdownSeconds: number | null;
    cvData?: unknown;
  };
}

/**
 * Get color for quality score
 */
const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score >= 70) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
};

/**
 * Get label for quality score
 */
const getScoreLabel = (score: number): string => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Improvement';
};

export const CVQualityPanel: React.FC<CVQualityPanelProps> = ({
  cvId,
  proofreadGateActive = false,
  step3Props,
}) => {
  // Use scoped state that only shows data for the current CV
  const { overallScore, analysisLoading, analysisError, proofreadScore, currentCorrectionMode } =
    useScopedQualityState(cvId);

  const { generateQualityAnalysis, clearAnalysisError } = useCVQualityStore();

  // Show info icon when gate is active and Step 1 not yet done (score < 80)
  const showGateInfoIcon =
    proofreadGateActive && (proofreadScore === null || proofreadScore < 80);

  const { addTask, activeTasks } = useAITaskPollingContext();
  const isMountedRef = useRef(true);

  const loadingStep = useLoadingStep(cvId, activeTasks, analysisLoading, currentCorrectionMode);

  const completeness = useMemo(
    () => (step3Props?.cvData ? calculateCVCompleteness(step3Props.cvData) : null),
    [step3Props?.cvData],
  );
  const showStep3 = !!step3Props;
  const hasActiveJob = step3Props?.activeJobDescription != null;
  const suggestionsLoading = step3Props?.suggestionsLoading ?? false;
  // Disable Step 1 and 2 while any analysis or Step 3 is in progress
  const anyStepLoading = analysisLoading || suggestionsLoading;

  const step1LoadingSuffix = useTypewriterMessages(STEP1_LOADING_SUFFIXES, {
    isActive: analysisLoading && loadingStep === 1,
    pauseAfterCompleteMs: 6000,
  });
  const step2LoadingSuffix = useTypewriterMessages(STEP2_LOADING_SUFFIXES, {
    isActive: analysisLoading && loadingStep === 2,
    pauseAfterCompleteMs: 6000,
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** Starts quality analysis, adds task to polling for completion. */
  const handleAnalyze = async (correctionMode: CorrectionMode) => {
    try {
      const analysisId = await generateQualityAnalysis(cvId, correctionMode);

      // Only proceed if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (analysisId) {
        addTask({
          id: analysisId,
          type: 'cv_quality_analysis',
          cvId,
          isGenerating: true,
          data: { correctionMode },
        });
      }
    } catch (error) {
      // Error already handled in store with proper UI feedback
      // No need to add task to polling if creation failed
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Quality Score Badge - always shown to prevent layout shift */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          CV Quality Score
        </Typography>
        <Chip
          icon={<AssessmentIcon />}
          label={
            overallScore !== null
              ? `${overallScore}/100 - ${getScoreLabel(overallScore)}`
              : 'Run Step 1 to get your score'
          }
          color={overallScore !== null ? getScoreColor(overallScore) : 'default'}
          variant="outlined"
          size="medium"
          sx={{
            fontWeight: 500,
            ...(overallScore === null && {
              borderColor: 'action.disabled',
              color: 'text.secondary',
            }),
          }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Complete steps in order for best results.
      </Typography>

      {/* Steps 2–3 disabled when no score (overallScore === null) or proofreadGateActive or anyStepLoading */}
      <Stack spacing={1}>
        <StepButton
          label="Step 1: Fix spelling and grammar"
          stepPrefix={STEP1_PREFIX}
          loadingSuffix={step1LoadingSuffix}
          tooltipTitle="Correct typos, grammar, and punctuation only."
          isLoading={analysisLoading && loadingStep === 1}
          disabled={anyStepLoading}
          onClick={() => handleAnalyze('proofread')}
          icon={<SpellcheckIcon />}
          minWidthCh={STEP1_LOADING_MIN_WIDTH_CH}
          extraSx={overallScore === null && !anyStepLoading ? { backgroundColor: 'grey.200' } : undefined}
        />
        <StepButton
          label="Step 2: Improve writing style"
          stepPrefix={STEP2_PREFIX}
          loadingSuffix={step2LoadingSuffix}
          tooltipTitle={
            showGateInfoIcon
              ? 'Rewords unprofessional language and improves clarity and impact. Run Step 1 to activate this.'
              : 'Rewords unprofessional language and improves clarity and impact.'
          }
          isLoading={analysisLoading && loadingStep === 2}
          disabled={proofreadGateActive || overallScore === null || anyStepLoading}
          onClick={() => handleAnalyze('coaching')}
          icon={<EditNoteIcon />}
          minWidthCh={STEP2_LOADING_MIN_WIDTH_CH}
        />

        {/* Step 3: Enhance CV for this Job */}
        {showStep3 && step3Props && (
          <Step3Button
            proofreadGateActive={proofreadGateActive}
            overallScore={overallScore}
            hasActiveJob={hasActiveJob}
            completeness={completeness}
            anyStepLoading={anyStepLoading}
            isParsing={step3Props.activeJobDescription?.is_parsing}
            countdownSeconds={step3Props.countdownSeconds}
            suggestionsLoading={step3Props.suggestionsLoading}
            onGenerate={step3Props.onGenerateSuggestions}
          />
        )}
      </Stack>

      {/* Error Display */}
      {analysisError && (
        <Alert
          severity="error"
          onClose={clearAnalysisError}
          sx={{ mt: 2 }}
        >
          {analysisError}
        </Alert>
      )}

    </Box>
  );
};
