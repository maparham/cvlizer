/**
 * Step Button Component
 *
 * Reusable button for proofread and coaching actions in CVQualityPanel.
 * Exports SHARED_STEP_BUTTON_SX used by Step3Button for consistent styling.
 */

import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
    sx={(theme) => {
      const primaryMain = theme.palette.primary.main;
      return {
        ...SHARED_STEP_BUTTON_SX,
        // Keyframes defined unconditionally so the animation name is always in the stylesheet
        // and reliably applies when animation is set during loading (avoids CSS-in-JS ordering issues).
        '@keyframes loadingPulse': {
          '0%, 100%': {
            boxShadow: 'none',
            opacity: 1,
          },
          '50%': {
            boxShadow: `0 0 20px 4px ${alpha(primaryMain, 0.4)}`,
            opacity: 0.92,
          },
        },
        ...(isLoading && {
          animation: 'loadingPulse 2s ease-in-out infinite',
          '&.Mui-disabled': {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            opacity: 1,
          },
        }),
        ...extraSx,
      };
    }}
  >
    <Box
      component="span"
      sx={{
        minWidth: `${minWidthCh}ch`,
        minHeight: '1.5em',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        textAlign: 'left',
      }}
    >
      {isLoading ? (
        <>
          <Typography component="span" variant="body2" fontWeight={600}>
            {label}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            sx={{ opacity: 0.9, fontWeight: 500, mt: 0.25 }}
          >
            {loadingText || '\u00A0'}
          </Typography>
        </>
      ) : (
        label
      )}
    </Box>
  </Button>
);
