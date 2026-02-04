/**
 * CV Quality Panel Component
 *
 * Displays quality score badge and "Improve my CV" button.
 * Shown in the AI suggestions sidebar.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useCVQualityStore } from '../../../stores/cvQualityStore';
import { useAITaskPollingContext } from '../../../contexts/AITaskPollingContext';
import type { CorrectionMode } from '../../../services/ai';

// Scoped selector: Only return values if they belong to the current CV
const useScopedQualityState = (cvId: string) => {
  return useCVQualityStore((state) => {
    // Only return state if it belongs to the current CV
    if (state.currentCvId === cvId) {
      return {
        overallScore: state.overallScore,
        analysisLoading: state.analysisLoading,
        analysisError: state.analysisError,
      };
    }
    // Return null/empty state if CV doesn't match
    return {
      overallScore: null,
      analysisLoading: false,
      analysisError: null,
    };
  });
};

interface CVQualityPanelProps {
  cvId: string;
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

export const CVQualityPanel: React.FC<CVQualityPanelProps> = ({ cvId }) => {
  // Use scoped state that only shows data for the current CV
  const { overallScore, analysisLoading, analysisError } = useScopedQualityState(cvId);

  const {
    generateQualityAnalysis,
    clearAnalysisError,
    dismissAllQualitySuggestions,
  } = useCVQualityStore();

  const { addTask } = useAITaskPollingContext();
  const isMountedRef = useRef(true);

  // Menu state for correction mode selection
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleAnalyze = async (correctionMode: CorrectionMode) => {
    handleMenuClose();

    try {
      const analysisId = await generateQualityAnalysis(cvId, correctionMode);

      // Only proceed if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (analysisId) {
        // Add to polling only after successful API response
        addTask({
          id: analysisId,
          type: 'cv_quality_analysis',
          cvId,
          isGenerating: true,
        });
      }
    } catch (error) {
      // Error already handled in store with proper UI feedback
      // No need to add task to polling if creation failed
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Quality Score Badge */}
      {overallScore !== null && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            CV Quality Score
          </Typography>
          <Chip
            icon={<AssessmentIcon />}
            label={`${overallScore}/100 - ${getScoreLabel(overallScore)}`}
            color={getScoreColor(overallScore)}
            size="medium"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}

      {/* Analyze Button */}
      <Button
        variant={overallScore === null ? 'contained' : 'outlined'}
        color="primary"
        fullWidth
        startIcon={
          analysisLoading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />
        }
        onClick={handleButtonClick}
        disabled={analysisLoading}
        aria-controls={menuOpen ? 'correction-mode-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? 'true' : undefined}
        sx={{
          py: 1.5,
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        {analysisLoading
          ? 'Improving CV...'
          : overallScore === null
          ? 'Improve my CV'
          : 'Improve my CV again'}
      </Button>

      {/* Correction Mode Menu */}
      <Menu
        id="correction-mode-menu"
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: { minWidth: 280 },
          },
        }}
      >
        <MenuItem onClick={() => handleAnalyze('writing_only')}>
          <ListItemIcon>
            <SpellcheckIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Fix spelling and grammar"
            secondary="Correct typos, grammar, and punctuation only"
          />
        </MenuItem>
        <MenuItem onClick={() => handleAnalyze('writing_and_content')}>
          <ListItemIcon>
            <EditNoteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Fix writing and unprofessional content"
            secondary="Also reword unprofessional language"
          />
        </MenuItem>
      </Menu>

      {/* Clear All Suggestions Button */}
      {overallScore !== null && (
        <Button
          variant="text"
          color="inherit"
          fullWidth
          size="small"
          startIcon={<ClearAllIcon />}
          onClick={dismissAllQualitySuggestions}
          disabled={analysisLoading}
          sx={{
            mt: 1,
            textTransform: 'none',
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          Clear all suggestions
        </Button>
      )}

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

      {/* Info Message */}
      {!analysisLoading && overallScore === null && !analysisError && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Get AI-powered coaching to improve your CV's clarity, professionalism, and impact.
        </Typography>
      )}
    </Box>
  );
};
