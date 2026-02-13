/**
 * Compact Suggestion Card Component
 *
 * Canonical card for single-diff quality and writing correction suggestions;
 * used by UnifiedQualitySuggestion, InlineFieldCorrection, SkillsQualitySuggestions.
 *
 * Unified component for displaying AI suggestions with diff view.
 * Supports two variants:
 * - default: Uses SuggestionPaper with neutral styling
 * - importance: Uses colored border based on importance level
 *
 * Features:
 * - Compact info header with icon and reasoning
 * - Action icons (Apply, Dismiss, optional Help)
 * - SemanticDiff for change visualization
 * - Dismiss confirmation dialog
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { SemanticDiff } from './SemanticDiff';
import { SuggestionPaper } from './SuggestionPaper';
import { ContentDisplayBox } from './ContentDisplayBox';
import { getImportanceColor } from './utils/suggestionUtils';

export interface CompactSuggestionCardProps {
  /** HTML diff string for SemanticDiff display */
  htmlDiff: string;
  /** Optional reasoning text shown next to info icon */
  reasoning?: string;
  /** Tooltip text for the info icon */
  infoTooltip: string;
  /** Color for the info icon */
  infoIconColor?: 'error' | 'warning';
  /** Optional help tooltip content (e.g., coaching questions) */
  helpTooltipContent?: React.ReactNode;
  /** Callback when apply is clicked */
  onApply: () => void | Promise<void>;
  /** Callback when dismiss is confirmed */
  onDismiss: () => void | Promise<void>;
  /** Title for dismiss confirmation dialog */
  dismissDialogTitle?: string;
  /** Variant: 'default' uses SuggestionPaper, 'importance' uses colored border */
  variant?: 'default' | 'importance';
  /** Importance level (only used with 'importance' variant) */
  importance?: 'highly_recommended' | 'standard';
  /** Whether to wrap content in ContentDisplayBox (default: true for 'default' variant) */
  showContentBox?: boolean;
}

/**
 * CompactSuggestionCard - Unified suggestion card with compact layout
 *
 * Provides consistent UI for both quality suggestions and field corrections:
 * - Absolutely positioned action icons in top-right
 * - Info icon with tooltip and optional reasoning
 * - SemanticDiff for change visualization
 * - Dismiss confirmation dialog
 */
export const CompactSuggestionCard: React.FC<CompactSuggestionCardProps> = ({
  htmlDiff,
  reasoning,
  infoTooltip,
  infoIconColor = 'warning',
  helpTooltipContent,
  onApply,
  onDismiss,
  dismissDialogTitle = 'Dismiss Suggestion?',
  variant = 'default',
  importance = 'standard',
  showContentBox,
}) => {
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);

  // Default showContentBox based on variant
  const shouldShowContentBox = showContentBox ?? (variant === 'default');

  const handleDismissClick = () => {
    setDismissDialogOpen(true);
  };

  const handleDismissConfirm = () => {
    setDismissDialogOpen(false);
    onDismiss();
  };

  const handleDismissCancel = () => {
    setDismissDialogOpen(false);
  };

  // Action icons component (shared between variants)
  const ActionIcons = (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'flex',
        gap: 0.25,
        zIndex: 1,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        pl: 0.5,
      }}
    >
      {/* Help icon (if tooltip content provided) */}
      {helpTooltipContent && (
        <Tooltip title={helpTooltipContent}>
          <IconButton
            size="small"
            sx={{
              p: 0.25,
              color: 'info.main',
            }}
          >
            <HelpOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Apply">
        <IconButton
          size="small"
          onClick={() => onApply()}
          sx={{
            p: 0.25,
            color: 'success.main',
            '&:hover': {
              backgroundColor: 'success.light',
              color: 'success.dark',
            },
          }}
        >
          <CheckIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Dismiss">
        <IconButton
          size="small"
          onClick={handleDismissClick}
          sx={{
            p: 0.25,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.dark',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Content component (shared between variants)
  const Content = (
    <Box>
      {/* Info header with icon and reasoning */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5, pr: helpTooltipContent ? 6 : 5 }}>
        <Tooltip title={infoTooltip}>
          <IconButton
            size="small"
            sx={{
              p: 0,
              mt: 0.25,
              color: `${infoIconColor}.main`,
            }}
          >
            <InfoIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        {reasoning && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.7rem', flex: 1 }}
          >
            {reasoning}
          </Typography>
        )}
      </Box>

      {/* Diff content */}
      {shouldShowContentBox ? (
        <ContentDisplayBox>
          <SemanticDiff htmlDiff={htmlDiff} />
        </ContentDisplayBox>
      ) : (
        <Box sx={{ mb: 0 }}>
          <SemanticDiff htmlDiff={htmlDiff} />
        </Box>
      )}
    </Box>
  );

  // Dismiss confirmation dialog (shared)
  const DismissDialog = (
    <Dialog
      open={dismissDialogOpen}
      onClose={handleDismissCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{dismissDialogTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to dismiss this? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDismissCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleDismissConfirm} color="error" variant="contained" autoFocus>
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render based on variant
  if (variant === 'importance') {
    const colorName = getImportanceColor(importance);
    return (
      <Paper
        elevation={0}
        sx={{
          mt: 1,
          p: 1,
          border: '1px solid',
          borderColor: `${colorName}.light`,
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark'
              ? colorName === 'error'
                ? 'rgba(244, 67, 54, 0.05)'
                : 'rgba(255, 152, 0, 0.05)'
              : colorName === 'error'
                ? 'rgba(244, 67, 54, 0.02)'
                : 'rgba(255, 152, 0, 0.02)',
          borderRadius: 1,
        }}
      >
        <Box sx={{ position: 'relative' }}>
          {ActionIcons}
          {Content}
        </Box>
        {DismissDialog}
      </Paper>
    );
  }

  // Default variant uses SuggestionPaper
  return (
    <SuggestionPaper>
      <Box sx={{ position: 'relative' }}>
        {ActionIcons}
        {Content}
      </Box>
      {DismissDialog}
    </SuggestionPaper>
  );
};
