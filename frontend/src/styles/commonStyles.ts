/**
 * Common Style Constants
 *
 * This module provides shared Material-UI styling constants to eliminate
 * repetitive styling patterns across components and ensure consistent
 * visual design throughout the application.
 *
 * Key responsibilities:
 * - Define common component styling patterns
 * - Provide consistent spacing, colors, and effects
 * - Reduce code duplication in component sx props
 * - Maintain design system consistency
 *
 * Usage:
 * - Import specific style objects for components
 * - Use in sx props: sx={{...commonStyles.dialog}}
 * - Extend or override as needed for specific components
 */

import { SxProps, Theme } from '@mui/material/styles'

// Common border radius values
export const borderRadius = {
  small: 1,
  medium: 2,
  large: 3,
} as const

// Common spacing values
export const spacing = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
} as const

// Common transition effects
export const transitions = {
  standard: 'all 0.2s ease-in-out',
  opacity: 'opacity 0.2s',
  transform: 'transform 0.2s ease-in-out',
} as const

// Dialog styles
export const dialogStyles: SxProps<Theme> = {
  borderRadius: borderRadius.large,
  '& .MuiDialog-paper': {
    borderRadius: borderRadius.large,
  },
}

// Button styles
export const buttonStyles = {
  primary: {
    borderRadius: borderRadius.medium,
    textTransform: 'none' as const,
  },
  secondary: {
    borderRadius: borderRadius.medium,
    textTransform: 'none' as const,
  },
} as const

// Card styles
export const cardStyles = {
  standard: {
    borderRadius: borderRadius.medium,
    transition: transitions.standard,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 4,
    },
  },
  static: {
    borderRadius: borderRadius.medium,
  },
} as const

// Icon button styles
export const iconButtonStyles = {
  subtle: {
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
      backgroundColor: 'action.hover',
    },
    transition: transitions.opacity,
  },
  transparent: {
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.04)',
    },
  },
} as const

// Menu styles
export const menuStyles = {
  standard: {
    minWidth: 160,
    '& .MuiMenuItem-root': {
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    },
  },
} as const

// Form input styles
export const inputStyles = {
  standard: {
    borderRadius: borderRadius.small,
    '& .MuiOutlinedInput-root.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'primary.main',
        borderWidth: 2,
      },
    },
  },
} as const

// Alert styles
export const alertStyles = {
  standard: {
    marginBottom: spacing.sm,
  },
} as const

// Dialog content styles
export const dialogContentStyles = {
  paddingTop: spacing.sm,
  paddingBottom: spacing.md,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
} as const

// Dialog actions styles
export const dialogActionsStyles = {
  padding: spacing.lg,
  paddingTop: spacing.sm,
  gap: spacing.sm,
} as const

// Chip styles
export const chipStyles = {
  small: {
    fontSize: '0.75rem',
  },
  outlined: {
    marginBottom: 0.5,
  },
} as const

// Typography styles
export const typographyStyles = {
  secondary: {
    color: 'text.secondary',
  },
  muted: {
    color: '#666',
    fontSize: '0.875rem',
  },
} as const

// Flexbox utilities
export const flexStyles = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  between: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  start: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
} as const

// Box shadow utilities
export const shadowStyles = {
  light: 1,
  medium: 3,
  heavy: 4,
} as const

// Color utilities
export const colorStyles = {
  success: '#2e7d32',
  error: '#d32f2f',
  warning: '#ed6c02',
  info: '#1976d2',
  muted: '#666',
} as const

// Combined common styles for specific use cases
export const commonStyles = {
  dialog: dialogStyles,
  button: buttonStyles,
  card: cardStyles,
  iconButton: iconButtonStyles,
  menu: menuStyles,
  input: inputStyles,
  alert: alertStyles,
  dialogContent: dialogContentStyles,
  dialogActions: dialogActionsStyles,
  chip: chipStyles,
  typography: typographyStyles,
  flex: flexStyles,
  shadow: shadowStyles,
  color: colorStyles,
  borderRadius,
  spacing,
  transitions,
} as const
