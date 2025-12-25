/**
 * Suggestion Paper Component
 *
 * Reusable Paper wrapper with consistent styling for AI suggestion components.
 * Provides standardized appearance across all suggestion cards.
 */

import React from 'react';
import { Paper, PaperProps } from '@mui/material';

interface SuggestionPaperProps extends Omit<PaperProps, 'elevation'> {
  elevation?: number;
}

/**
 * SuggestionPaper - Standardized Paper component for AI suggestions
 *
 * Provides consistent styling with:
 * - Info-themed border and background
 * - Responsive dark/light mode support
 * - Customizable via sx prop
 *
 * @param children - Content to display inside the paper
 * @param elevation - Paper elevation (default: 2)
 * @param sx - Additional sx styles to merge with defaults
 */
export const SuggestionPaper: React.FC<SuggestionPaperProps> = ({
  children,
  elevation = 2,
  sx = {},
  ...otherProps
}) => {
  return (
    <Paper
      elevation={elevation}
      sx={{
        p: 2,
        my: 2,
        border: '2px solid',
        borderColor: 'info.main',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(33, 150, 243, 0.05)'
            : 'rgba(33, 150, 243, 0.02)',
        ...sx,
      }}
      {...otherProps}
    >
      {children}
    </Paper>
  );
};
