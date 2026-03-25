/**
 * Suggestion Action Buttons Component
 *
 * Reusable component for Apply/Dismiss buttons used across CV suggestion components.
 * Supports multiple variants: standard, compact, and "all" (for Apply All/Dismiss All).
 */

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface SuggestionActionButtonsProps {
  onApply: () => void;
  onDismiss: () => void;
  variant?: 'standard' | 'compact' | 'all';
  applyLabel?: string;
  dismissLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  direction?: 'row' | 'column' | { xs?: 'row' | 'column'; sm?: 'row' | 'column'; md?: 'row' | 'column' };
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | { xs?: 'flex-start' | 'flex-end' | 'center'; sm?: 'flex-start' | 'flex-end' | 'center' };
  containerSx?: object;
}

export const SuggestionActionButtons: React.FC<SuggestionActionButtonsProps> = ({
  onApply,
  onDismiss,
  variant = 'standard',
  applyLabel,
  dismissLabel,
  disabled = false,
  loading = false,
  direction = 'row',
  justifyContent = 'flex-end',
  containerSx = {},
}) => {
  // Determine labels based on variant
  const getApplyLabel = () => {
    if (applyLabel) return applyLabel;
    return variant === 'all' ? 'Apply All' : 'Apply';
  };

  const getDismissLabel = () => {
    if (dismissLabel) return dismissLabel;
    return variant === 'all' ? 'Dismiss All' : 'Dismiss';
  };

  // Get button styles based on variant
  const getButtonStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          minWidth: 80,
          fontSize: '0.7rem',
          height: 28,
          px: 1,
          py: 0.25,
        };
      case 'standard':
      case 'all':
      default:
        return {};
    }
  };

  const buttonStyles = getButtonStyles();
  const iconSize = variant === 'compact' ? { fontSize: 14 } : undefined;

  // Handle responsive direction - sx prop supports responsive values directly
  const flexDirectionSx = typeof direction === 'object'
    ? { flexDirection: direction }
    : { flexDirection: direction };

  // Handle responsive justifyContent
  const justifyContentSx = typeof justifyContent === 'object'
    ? { justifyContent }
    : { justifyContent };

  return (
    <Box
      sx={{
        display: 'flex',
        ...flexDirectionSx,
        gap: variant === 'compact' ? 0.5 : 1,
        ...justifyContentSx,
        ...containerSx,
      }}
    >
      <Button
        variant="outlined"
        size="small"
        startIcon={<CloseIcon sx={iconSize} />}
        onClick={onDismiss}
        disabled={disabled || loading}
        sx={buttonStyles}
      >
        {getDismissLabel()}
      </Button>
      <Button
        variant="contained"
        size="small"
        startIcon={<CheckIcon sx={iconSize} />}
        onClick={onApply}
        disabled={disabled || loading}
        sx={buttonStyles}
      >
        {getApplyLabel()}
      </Button>
    </Box>
  );
};
