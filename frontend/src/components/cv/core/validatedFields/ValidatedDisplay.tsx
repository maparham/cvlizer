/**
 * ValidatedDisplay Component
 *
 * This module provides a pure display component for showing field content with
 * validation error indicators. It is designed for performance by avoiding hooks
 * and receiving validation state as props instead.
 *
 * Key responsibilities:
 * - Displays field content with conditional error styling
 * - Shows warning icon and error message when validation fails
 * - Supports customizable styling (variant, colors, alignment)
 * - Pure component (no hooks) to prevent unnecessary re-renders
 * - Replaces legacy ValidatedFieldDisplay with better performance characteristics
 *
 * Performance characteristics:
 * - Does NOT use hooks (prevents re-renders when validation state changes elsewhere)
 * - Receives validation state as props (passed from parent component using useItemValidation)
 * - Memoizable by parent components without affecting validation reactivity
 *
 * Usage context:
 * - Used in CV section display components (AwardDisplay, EducationDisplay, etc.)
 * - Validation state should be obtained via useItemValidation hook in parent component
 * - Should NOT be used in form contexts (use ValidatedFormField/ValidatedDateField instead)
 *
 * Usage example:
 * ```tsx
 * // In display component wrapper (uses hook):
 * const DisplayWrapper = ({ item, index }) => {
 *   const validation = useItemValidation('awards', index, ['name', 'date']);
 *   return (
 *     <ValidatedDisplay
 *       validation={validation.name}
 *       variant="subtitle1"
 *       normalColor="#333"
 *     >
 *       {item.name}
 *     </ValidatedDisplay>
 *   );
 * };
 *
 * // In pure display component (no hooks):
 * const Display = ({ item, validation }) => (
 *   <ValidatedDisplay
 *     validation={validation.name}
 *     variant="subtitle1"
 *   >
 *     {item.name}
 *   </ValidatedDisplay>
 * );
 * ```
 *
 * Design rationale:
 * - Separation of concerns: hooks in parent, pure display component
 * - Performance: display components don't re-render when validation changes in other items
 * - Consistency: identical validation display behavior across all CV sections
 *
 * @module ValidatedDisplay
 */
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import WarningIcon from '@mui/icons-material/Warning';

export interface ValidatedDisplayProps {
  children: React.ReactNode;
  validation: { hasError: boolean; errorMessage?: string };
  variant?: 'subtitle1' | 'body2';
  errorColor?: string;
  normalColor?: string;
  iconSize?: string;
  align?: 'left' | 'right' | 'flex-end';
  sx?: any;
}

export const ValidatedDisplay: React.FC<ValidatedDisplayProps> = ({
  children,
  validation,
  variant = 'subtitle1',
  errorColor = '#d32f2f',
  normalColor,
  iconSize = '1rem',
  align = 'left',
  sx,
}) => {
  const getDefaultColor = () => {
    if (normalColor) return normalColor;
    return variant === 'subtitle1' ? '#333' : '#666';
  };

  const justifyContent = align === 'flex-end' || align === 'right' ? 'flex-end' : 'flex-start';
  const textAlign = align === 'flex-end' || align === 'right' ? 'right' : 'left';

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent, ...sx }}>
        <Typography
          component="div"
          variant={variant}
          sx={{
            color: validation.hasError ? errorColor : getDefaultColor(),
            ...(variant === 'subtitle1' && !normalColor ? { fontWeight: 600 } : {}),
          }}
        >
          {children}
        </Typography>
        {validation.hasError && (
          <WarningIcon sx={{ color: errorColor, fontSize: iconSize }} />
        )}
      </Box>
      {validation.hasError && (
        <Typography
          variant="caption"
          color="error"
          sx={{
            mt: 0.5,
            display: 'block',
            textAlign,
          }}
        >
          {validation.errorMessage}
        </Typography>
      )}
    </>
  );
};
