/**
 * Section Manager Save Footer
 *
 * Inline save status footer (Saving... / Saved X ago).
 * Extracted from SectionManagerSidebar to reduce its size.
 */

import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export interface SectionManagerSaveFooterProps {
  saving: boolean;
  lastSavedAt: string | null;
  relativeSavedText: string;
}

export const SectionManagerSaveFooter: React.FC<SectionManagerSaveFooterProps> = ({
  saving,
  lastSavedAt,
  relativeSavedText,
}) => (
  <Box
    sx={{
      flexShrink: 0,
      borderTop: 1,
      borderColor: 'divider',
      p: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 1,
      bgcolor: 'background.paper',
    }}
  >
    {saving ? (
      <>
        <CircularProgress size={14} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Saving...
        </Typography>
      </>
    ) : lastSavedAt ? (
      <>
        <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />
        <Typography variant="caption" sx={{ color: 'success.main' }}>
          Saved {relativeSavedText}
        </Typography>
      </>
    ) : null}
  </Box>
);
