import { createTheme, ThemeOptions } from '@mui/material/styles'

/**
 * Theme utilities for CV components with high contrast mode support
 */

export const createCVTheme = (highContrast: boolean = false): ThemeOptions => {
  const baseTheme = {
    palette: {
      primary: {
        main: highContrast ? '#000000' : '#1976d2',
        contrastText: highContrast ? '#ffffff' : '#ffffff'
      },
      secondary: {
        main: highContrast ? '#ffffff' : '#dc004e',
        contrastText: highContrast ? '#000000' : '#ffffff'
      },
      error: {
        main: highContrast ? '#ff0000' : '#d32f2f',
        contrastText: highContrast ? '#ffffff' : '#ffffff'
      },
      success: {
        main: highContrast ? '#00ff00' : '#2e7d32',
        contrastText: highContrast ? '#000000' : '#ffffff'
      },
      warning: {
        main: highContrast ? '#ffff00' : '#ed6c02',
        contrastText: highContrast ? '#000000' : '#ffffff'
      },
      background: {
        default: highContrast ? '#ffffff' : '#ffffff',
        paper: highContrast ? '#ffffff' : '#ffffff'
      },
      text: {
        primary: highContrast ? '#000000' : '#000000',
        secondary: highContrast ? '#000000' : '#666666'
      }
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-input': {
              '&:focus': {
                outline: highContrast ? '3px solid #000000' : '2px solid #1976d2',
                outlineOffset: '2px'
              }
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderWidth: highContrast ? '2px' : '1px',
            '&:focus': {
              outline: highContrast ? '3px solid #000000' : '2px solid #1976d2',
              outlineOffset: '2px'
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:focus': {
              outline: highContrast ? '3px solid #000000' : '2px solid #1976d2',
              outlineOffset: '2px'
            }
          }
        }
      },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-input': {
              '&:focus': {
                outline: highContrast ? '3px solid #000000' : '2px solid #1976d2',
                outlineOffset: '2px'
              }
            }
          }
        }
      }
    }
  }

  return baseTheme
}

/**
 * Hook to detect high contrast mode preference
 */
export const useHighContrastMode = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // Check for system preference
  const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
  
  // Check for user preference stored in localStorage
  const storedPreference = localStorage.getItem('cv-high-contrast')
  if (storedPreference !== null) {
    return storedPreference === 'true'
  }
  
  return prefersHighContrast
}

/**
 * Utility to toggle high contrast mode
 */
export const toggleHighContrastMode = (): boolean => {
  const currentMode = useHighContrastMode()
  const newMode = !currentMode
  localStorage.setItem('cv-high-contrast', newMode.toString())
  return newMode
}
