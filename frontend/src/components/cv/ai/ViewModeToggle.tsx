/**
 * View Mode Toggle Component
 *
 * Reusable toggle button group for switching between diff and raw view modes
 * in CV AI suggestion components.
 */

import React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface ViewModeToggleProps {
  value: 'diff' | 'raw';
  onChange: (event: React.MouseEvent<HTMLElement>, newMode: 'diff' | 'raw' | null) => void;
  variant?: 'default' | 'compare';
  size?: 'small' | 'medium';
  sx?: object;
}

/**
 * ViewModeToggle - Toggle between diff and raw view modes
 *
 * @param value - Current view mode ('diff' | 'raw')
 * @param onChange - Handler for view mode changes
 * @param variant - 'default' uses CodeIcon/VisibilityIcon, 'compare' uses CompareArrowsIcon/CodeIcon
 * @param size - Button size ('small' | 'medium')
 * @param sx - Additional sx styles
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  value,
  onChange,
  variant = 'default',
  size = 'small',
  sx = {},
}) => {
  const isCompareVariant = variant === 'compare';

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={onChange}
      size={size}
      sx={sx}
    >
      <Tooltip title={isCompareVariant ? "Show diff view with highlighted changes" : "Show diff view"}>
        <ToggleButton value="diff" aria-label="diff view">
          {isCompareVariant ? (
            <CompareArrowsIcon fontSize="small" />
          ) : (
            <CodeIcon fontSize="small" />
          )}
        </ToggleButton>
      </Tooltip>
      <Tooltip title={isCompareVariant ? "Show raw suggested content" : "Show raw view"}>
        <ToggleButton value="raw" aria-label="raw view">
          {isCompareVariant ? (
            <CodeIcon fontSize="small" />
          ) : (
            <VisibilityIcon fontSize="small" />
          )}
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
};
