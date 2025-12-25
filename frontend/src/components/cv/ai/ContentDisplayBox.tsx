/**
 * Content Display Box Component
 *
 * Reusable container for displaying diff/raw content in AI suggestion components.
 * Provides consistent styling for content areas.
 */

import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface ContentDisplayBoxProps extends BoxProps {
  children: React.ReactNode;
}

/**
 * ContentDisplayBox - Standardized container for suggestion content
 *
 * Provides consistent styling with:
 * - Background and border for content separation
 * - Standardized padding and spacing
 * - Customizable via sx prop
 *
 * @param children - Content to display (typically SemanticDiff or raw content)
 * @param sx - Additional sx styles to merge with defaults
 */
export const ContentDisplayBox: React.FC<ContentDisplayBoxProps> = ({
  children,
  sx = {},
  ...otherProps
}) => {
  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: 'background.default',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        mb: 2,
        ...sx,
      }}
      {...otherProps}
    >
      {children}
    </Box>
  );
};
