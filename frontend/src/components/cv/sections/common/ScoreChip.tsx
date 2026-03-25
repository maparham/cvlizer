/**
 * Score Chip Component
 *
 * Reusable component for displaying quality scores with color coding.
 */

import React from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { getContentScoreColor } from '../utils/correctionHelpers';

interface ScoreChipProps {
  score: number;
}

/**
 * Score chip component with tooltip
 * @param score - Quality score (0-100)
 */
export const ScoreChip: React.FC<ScoreChipProps> = ({ score }) => {
  return (
    <Tooltip
      title="Quality score (0-100) based on how well the story is told and confidence of presentation"
    >
      <Chip
        label={`${score}/100`}
        color={getContentScoreColor(score)}
        size="small"
        variant="filled"
      />
    </Tooltip>
  );
};
