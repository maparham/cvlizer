/**
 * Timeline Gap Warning Component
 *
 * Displays warning for detected timeline gaps (≥3 months) in work experience or education.
 * Shown inline between CV items where gaps exist.
 */

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { TimelineGap } from '../../../types/ai';

interface TimelineGapWarningProps {
  gap: TimelineGap;
}

/**
 * Format gap duration for display
 */
const formatGapDuration = (months: number): string => {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
  }
  return `${months} ${months === 1 ? 'month' : 'months'}`;
};

/**
 * Format date for display
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + '-01');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

/**
 * Get gap type label
 */
const getGapTypeLabel = (gapType: string): string => {
  if (gapType === 'work_experience') return 'Work Experience Gap';
  if (gapType === 'education') return 'Education Gap';
  return 'Timeline Gap';
};

export const TimelineGapWarning: React.FC<TimelineGapWarningProps> = ({ gap }) => {
  return (
    <Box
      sx={{
        my: 2,
        mx: 2,
        p: 2,
        border: '2px dashed',
        borderColor: 'warning.main',
        borderRadius: 2,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(255, 152, 0, 0.1)'
            : 'rgba(255, 152, 0, 0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <EventBusyIcon sx={{ color: 'warning.main', mt: 0.5 }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" color="warning.dark" sx={{ fontWeight: 600 }}>
              {getGapTypeLabel(gap.gap_type)}
            </Typography>
            <Chip
              label={formatGapDuration(gap.gap_duration_months)}
              size="small"
              color="warning"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Gap detected from{' '}
            <strong>{formatDate(gap.start_date)}</strong> to{' '}
            <strong>{formatDate(gap.end_date)}</strong>
          </Typography>

          {gap.item_before && gap.item_after && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Between:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • {gap.item_before.title}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary">
                • {gap.item_after.title}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
            Consider adding information about this period or be prepared to explain it during interviews.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
