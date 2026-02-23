/**
 * Step Button Component
 *
 * Reusable button for Step 1 and Step 2 (proofread/coaching) in CVQualityPanel.
 * Exports SHARED_STEP_BUTTON_SX used by Step3Button for consistent styling.
 */

import React from 'react';
import { Box, Button, CircularProgress, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/** Shared button styling for all Step buttons (Steps 1–3) in CVQualityPanel. */
export const SHARED_STEP_BUTTON_SX = {
  py: 1.5,
  px: 2,
  minHeight: 44,
  textTransform: 'none' as const,
  fontWeight: 500,
  justifyContent: 'flex-start' as const,
  borderRadius: '9999px',
  backgroundColor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  color: 'text.primary',
  boxShadow: 'none',
  '&:hover:not(.Mui-disabled)': {
    backgroundColor: 'action.hover',
    borderColor: 'divider',
  },
  '&.Mui-disabled': {
    backgroundColor: 'action.disabledBackground',
    borderColor: 'divider',
    color: 'action.disabled',
  },
  '& .MuiButton-endIcon': {
    marginLeft: 'auto',
  },
};

export interface StepButtonProps {
  label: string;
  /** Fixed prefix shown during loading (e.g. "Step 1: ") */
  stepPrefix: string;
  /** Animated suffix from useTypewriterMessages (only the part after the prefix) */
  loadingSuffix: string;
  tooltipTitle: string;
  isLoading: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  minWidthCh: number;
  extraSx?: SxProps<Theme>;
}

export const StepButton: React.FC<StepButtonProps> = ({
  label,
  stepPrefix,
  loadingSuffix,
  tooltipTitle,
  isLoading,
  disabled,
  onClick,
  icon,
  minWidthCh,
  extraSx,
}) => (
  <Button
    variant="outlined"
    color="inherit"
    fullWidth
    startIcon={
      isLoading ? (
        <CircularProgress size={20} color="primary" />
      ) : (
        icon
      )
    }
    endIcon={
      <Tooltip title={tooltipTitle} arrow>
        <span
          style={{ pointerEvents: 'auto', display: 'inline-flex', cursor: 'help' }}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpOutlineIcon fontSize="small" />
        </span>
      </Tooltip>
    }
    onClick={onClick}
    disabled={disabled}
    sx={{
      ...SHARED_STEP_BUTTON_SX,
      ...(isLoading && {
        '&.Mui-disabled': {
          backgroundColor: 'grey.100',
          color: 'text.primary',
          borderColor: 'divider',
        },
      }),
      ...extraSx,
    }}
  >
    <Box
      component="span"
      sx={{
        minWidth: `${minWidthCh}ch`,
        minHeight: '1.5em',
        display: 'inline-block',
        textAlign: 'left',
      }}
    >
      {isLoading ? stepPrefix + (loadingSuffix || '\u00A0') : label}
    </Box>
  </Button>
);
