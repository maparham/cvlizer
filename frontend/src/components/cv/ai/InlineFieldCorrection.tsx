/**
 * Inline Field Correction Component
 *
 * Displays writing corrections inline next to their target fields.
 * Shows compact correction UI with original/corrected values or markdown diff.
 * Provides apply and dismiss actions.
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
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { FieldCorrection, WritingCorrection } from '../../../types/ai';
import { SemanticDiff } from './SemanticDiff';
import { getImportanceColor, getFieldLabel } from './utils/suggestionUtils';

interface InlineFieldCorrectionProps {
  // For field corrections (structured fields)
  fieldCorrection?: FieldCorrection | null;
  // For HTML diff corrections (description/text fields)
  htmlDiffCorrection?: { html_diff: string; correction: WritingCorrection } | null;
  // Importance level
  importance: 'highly_recommended' | 'standard';
  // Optional reasoning
  reasoning?: string;
  // Callbacks
  onApply: () => void;
  onDismiss: () => void;
}

export const InlineFieldCorrection: React.FC<InlineFieldCorrectionProps> = ({
  fieldCorrection,
  htmlDiffCorrection,
  importance,
  reasoning,
  onApply,
  onDismiss,
}) => {
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);

  // Determine which type of correction we have
  const hasFieldCorrection = !!fieldCorrection;
  const hasHtmlDiff = !!htmlDiffCorrection;

  if (!hasFieldCorrection && !hasHtmlDiff) {
    return null;
  }

  // Build tooltip title
  const importanceLabel = importance === 'highly_recommended' ? 'Highly Recommended' : 'Standard';
  const fieldLabel = hasFieldCorrection
    ? getFieldLabel(fieldCorrection.field_name)
    : 'Description';
  const tooltipTitle = `${importanceLabel} - ${fieldLabel} correction`;

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

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1,
        p: 1,
        border: '1px solid',
        borderColor: getImportanceColor(importance) === 'error' ? 'error.light' : 'warning.light',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? getImportanceColor(importance) === 'error'
              ? 'rgba(244, 67, 54, 0.05)'
              : 'rgba(255, 152, 0, 0.05)'
            : getImportanceColor(importance) === 'error'
              ? 'rgba(244, 67, 54, 0.02)'
              : 'rgba(255, 152, 0, 0.02)',
        borderRadius: 1,
      }}
    >
      {/* Horizontal Layout: Content + Actions */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          alignItems: 'flex-start',
        }}
      >
        {/* Left Column: Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Reasoning (if provided) with importance icon */}
          {reasoning && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
              <Tooltip title={importanceLabel}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0,
                    mt: 0.25,
                    color: getImportanceColor(importance) === 'error' ? 'error.main' : 'warning.main',
                  }}
                >
                  <InfoIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem', flex: 1 }}
              >
                {reasoning}
              </Typography>
            </Box>
          )}

          {/* Importance icon when no reasoning (show at start of content) */}
          {!reasoning && (
            <Box sx={{ mb: 0.5 }}>
              <Tooltip title={tooltipTitle}>
                <IconButton
                  size="small"
                  sx={{
                    p: 0,
                    color: getImportanceColor(importance) === 'error' ? 'error.main' : 'warning.main',
                  }}
                >
                  <InfoIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Field Correction Display */}
          {hasFieldCorrection && fieldCorrection && (
            <Box sx={{ mb: 0 }}>
              <SemanticDiff htmlDiff={fieldCorrection.html_diff} />
            </Box>
          )}

          {/* HTML Diff Display */}
          {hasHtmlDiff && htmlDiffCorrection && (
            <Box sx={{ mb: 0 }}>
              <SemanticDiff htmlDiff={htmlDiffCorrection.html_diff} />
            </Box>
          )}
        </Box>

        {/* Right Column: Actions - Icon buttons for space efficiency */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            flexShrink: 0,
            alignItems: 'flex-start',
          }}
        >
          <Tooltip title="Apply">
            <IconButton
              size="small"
              onClick={onApply}
              sx={{
                p: 0.5,
                color: 'success.main',
                '&:hover': {
                  backgroundColor: 'success.light',
                  color: 'success.dark',
                },
              }}
            >
              <CheckIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dismiss">
            <IconButton
              size="small"
              onClick={handleDismissClick}
              sx={{
                p: 0.5,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.light',
                  color: 'error.dark',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Dismiss Confirmation Dialog */}
      <Dialog
        open={dismissDialogOpen}
        onClose={handleDismissCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Dismiss Correction?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to dismiss this correction? This action cannot be undone.
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
    </Paper>
  );
};
