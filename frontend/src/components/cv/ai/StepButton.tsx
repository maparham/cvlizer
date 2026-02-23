/**
 * Step Button Component
 *
 * Reusable button for proofread and coaching actions in CVQualityPanel.
 * Exports SHARED_STEP_BUTTON_SX used by Step3Button for consistent styling.
 */

import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/** Shared button styling for all AI action buttons in CVQualityPanel (primary, prominent). */
export const SHARED_STEP_BUTTON_SX = {
  py: 1.75,
  px: 2.5,
  minHeight: 48,
  textTransform: 'none' as const,
  fontWeight: 600,
  justifyContent: 'center' as const,
  borderRadius: '9999px',
  boxShadow: 'none',
  '&:hover:not(.Mui-disabled)': {
    backgroundColor: 'primary.dark',
  },
  '& .MuiButton-startIcon .MuiSvgIcon-root': {
    fontSize: 28,
  },
};

export interface StepButtonProps {
  label: string;
  /** Animated text from useTypewriterMessages shown during loading */
  loadingText: string;
  isLoading: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  minWidthCh: number;
  extraSx?: SxProps<Theme>;
}

export const StepButton: React.FC<StepButtonProps> = ({
  label,
  loadingText,
  isLoading,
  disabled,
  onClick,
  icon,
  minWidthCh,
  extraSx,
}) => (
  <Button
    variant="contained"
    color="primary"
    startIcon={
      isLoading ? (
        <CircularProgress size={22} sx={{ color: 'inherit' }} />
      ) : (
        icon
      )
    }
    onClick={onClick}
    disabled={disabled}
    sx={{
      ...SHARED_STEP_BUTTON_SX,
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
      {isLoading ? loadingText || '\u00A0' : label}
    </Box>
  </Button>
);
