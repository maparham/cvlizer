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
  elevation = 0,
  sx = {},
  ...otherProps
}) => {
  return (
    <Paper
      elevation={elevation}
      sx={{
        p: 1.5,
        my: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'transparent',
        ...sx,
      }}
      {...otherProps}
    >
      {children}
    </Paper>
  );
};
