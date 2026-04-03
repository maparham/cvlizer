/**
 * CV Quality Panel Component
 *
 * Displays one of three AI actions per sub-tab: Fix spelling and grammar (with quality score),
 * Improve writing style, or Enhance CV for this Job. Shown in the AI Tools sidebar.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useCVQualityStore } from '../../../stores/cvQualityStore';
import { useAITaskPollingContext } from '../../../contexts/AITaskPollingContext';
import { calculateCVCompleteness } from '../../../utils/cvCompleteness';
import { StepButton } from './StepButton';
import { Step3Button, getStep3TooltipTitle } from './Step3Button';
import { useTypewriterMessages } from '../../../hooks/useTypewriterMessages';
import { useLoadingStep } from '../../../hooks/useLoadingStep';
import type { CorrectionMode, RewordingMode } from '../../../services/ai';

const PROOFREAD_LOADING_MESSAGES = [
  'Checking spelling',
  'Checking grammar',
  'Checking punctuation',
  'May take a minute...',
];

const COACHING_LOADING_MESSAGES = [
  'Analyzing style',
  'Improving clarity',
  'Enhancing impact',
  'May take a minute...',
];

const LABEL_PROOFREAD = 'Fix spelling and grammar';
const LABEL_COACHING = 'Improve writing style';

const DESC_PROOFREAD = 'Correct typos, grammar, and punctuation only.';
const DESC_COACHING = 'Minimal: light edits. Deep: stronger tone and impact.';

const PROOFREAD_MIN_WIDTH_CH = Math.max(
  LABEL_PROOFREAD.length,
  ...PROOFREAD_LOADING_MESSAGES.map((m) => m.length),
);
const COACHING_MIN_WIDTH_CH = Math.max(
  LABEL_COACHING.length,
  ...COACHING_LOADING_MESSAGES.map((m) => m.length),
);

const useScopedQualityState = (cvId: string) => {
  return useCVQualityStore((state) => {
    if (state.currentCvId === cvId) {
      return {
        overallScore: state.overallScore,
        analysisLoading: state.analysisLoading,
        analysisError: state.analysisError,
        currentCorrectionMode: state.currentCorrectionMode,
      };
    }
    return {
      overallScore: null,
      analysisLoading: false,
      analysisError: null,
      currentCorrectionMode: null,
    };
  });
};

interface CVQualityPanelProps {
  cvId: string;
  /** Which sub-tab is active: 0 = proofread, 1 = coaching, 2 = enhance for job */
  subTabIndex: 0 | 1 | 2;
  /** Props for Enhance CV for this Job. When provided, that action is available in sub-tab 2. */
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
  subTabIndex,
  step3Props,
}) => {
  const { overallScore, analysisLoading, analysisError, currentCorrectionMode } =
    useScopedQualityState(cvId);

  const { generateQualityAnalysis, clearAnalysisError, rewordingMode, setRewordingMode } =
    useCVQualityStore();
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
  const anyStepLoading = analysisLoading || suggestionsLoading;

  const proofreadLoadingText = useTypewriterMessages(PROOFREAD_LOADING_MESSAGES, {
    isActive: analysisLoading && loadingStep === 1,
    pauseAfterCompleteMs: 6000,
  });
  const coachingLoadingText = useTypewriterMessages(COACHING_LOADING_MESSAGES, {
    isActive: analysisLoading && loadingStep === 2,
    pauseAfterCompleteMs: 6000,
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleRewordingChange = (event: SelectChangeEvent<RewordingMode>) => {
    setRewordingMode(event.target.value as RewordingMode);
  };

  const handleAnalyze = async (correctionMode: CorrectionMode) => {
    try {
      const analysisId = await generateQualityAnalysis(
        cvId,
        correctionMode,
        correctionMode === 'coaching' ? rewordingMode : undefined
      );
      if (!isMountedRef.current) return;
      if (analysisId) {
        addTask({
          id: analysisId,
          type: 'cv_quality_analysis',
          cvId,
          isGenerating: true,
          data: {
            correctionMode,
            ...(correctionMode === 'coaching' ? { rewordingMode } : {}),
          },
        });
      }
    } catch {
      // Error handled in store
    }
  };

  const subTabDescriptions: Record<0 | 1 | 2, string> = {
    0: DESC_PROOFREAD,
    1: DESC_COACHING,
    2: getStep3TooltipTitle(hasActiveJob, completeness),
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center', display: 'block' }}>
        {subTabDescriptions[subTabIndex]}
      </Typography>

      {subTabIndex === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <StepButton
              label={LABEL_PROOFREAD}
              loadingText={proofreadLoadingText}
              isLoading={analysisLoading && loadingStep === 1}
              disabled={anyStepLoading}
              onClick={() => handleAnalyze('proofread')}
              icon={<SpellcheckIcon />}
              minWidthCh={PROOFREAD_MIN_WIDTH_CH}
            />
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Chip
              icon={<AssessmentIcon />}
              label={
                overallScore !== null
                  ? `${overallScore}/100 - ${getScoreLabel(overallScore)}`
                  : 'Run to get your score'
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
        </>
      )}

      {subTabIndex === 1 && (
        <>
          <Box sx={{ maxWidth: 320, mx: 'auto', mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id={`cv-quality-rewording-label-${cvId}`}>Rewording style</InputLabel>
              <Select<RewordingMode>
                labelId={`cv-quality-rewording-label-${cvId}`}
                label="Rewording style"
                value={rewordingMode}
                onChange={handleRewordingChange}
                disabled={anyStepLoading}
              >
                <MenuItem value="minimal">
                  <Tooltip
                    title="Improves grammar, clarity, and structure without reinterpreting your tone or intent. Best for an honest resume in your own words."
                    placement="left"
                    enterDelay={400}
                  >
                    <span style={{ display: 'block', width: '100%' }}>Minimal rewording</span>
                  </Tooltip>
                </MenuItem>
                <MenuItem value="deep">
                  <Tooltip
                    title="Stronger edits: tone, impact, and coaching-style suggestions—similar to the previous default behavior."
                    placement="left"
                    enterDelay={400}
                  >
                    <span style={{ display: 'block', width: '100%' }}>Deep rewording</span>
                  </Tooltip>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <StepButton
              label={LABEL_COACHING}
              loadingText={coachingLoadingText}
              isLoading={analysisLoading && loadingStep === 2}
              disabled={anyStepLoading}
              onClick={() => handleAnalyze('coaching')}
              icon={<EditNoteIcon />}
              minWidthCh={COACHING_MIN_WIDTH_CH}
            />
          </Box>
        </>
      )}

      {subTabIndex === 2 && showStep3 && step3Props && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Step3Button
            hasActiveJob={hasActiveJob}
            completeness={completeness}
            anyStepLoading={anyStepLoading}
            isParsing={step3Props.activeJobDescription?.is_parsing}
            countdownSeconds={step3Props.countdownSeconds}
            suggestionsLoading={step3Props.suggestionsLoading}
            onGenerate={step3Props.onGenerateSuggestions}
          />
        </Box>
      )}

      {analysisError && (subTabIndex === 0 || subTabIndex === 1) && (
        <Alert severity="error" onClose={clearAnalysisError} sx={{ mt: 2 }}>
          {analysisError}
        </Alert>
      )}
    </Box>
  );
};
