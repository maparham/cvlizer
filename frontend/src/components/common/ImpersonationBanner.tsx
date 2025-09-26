/**
 * Impersonation Banner Component
 * 
 * This component displays a prominent banner when an admin is impersonating a user.
 * It provides clear visual indication of the impersonation state, shows the target
 * user information, displays a countdown timer, and offers a quick way to end the session.
 * 
 * Key responsibilities:
 * - Display impersonation status with high visibility
 * - Show target user information and remaining time
 * - Provide countdown timer with accessibility features
 * - Offer one-click session termination
 * - Handle session expiration gracefully
 * - Ensure keyboard accessibility and ARIA compliance
 * - Use hybrid event-driven status checking for optimal performance
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Typography,
  Snackbar,
  CircularProgress,
  useTheme
} from '@mui/material'
import {
  ExitToApp as ExitIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { impersonationService, ImpersonationError } from '../../services/impersonationService'
import { useImpersonationContext } from '../../contexts/ImpersonationContext'

interface ImpersonationBannerProps {
  /** Callback when impersonation ends */
  onImpersonationEnd?: () => void
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  onImpersonationEnd
}) => {
  const theme = useTheme()
  const { status, loading, endImpersonation: contextEndImpersonation } = useImpersonationContext()
  const [error, setError] = useState<string | null>(null)
  const [isEnding, setIsEnding] = useState(false)
  const hasNotifiedRef = useRef(false)
  const wasActiveRef = useRef(false)

  // End impersonation session
  const handleEndImpersonation = useCallback(async () => {
    if (isEnding) return

    setIsEnding(true)
    setError(null)

    try {
      await contextEndImpersonation()
      
      if (onImpersonationEnd) {
        onImpersonationEnd()
      }
    } catch (error) {
      console.error('Failed to end impersonation:', error)
      if (error instanceof ImpersonationError) {
        setError(error.message)
      } else {
        setError('Failed to end impersonation session')
      }
    } finally {
      setIsEnding(false)
    }
  }, [isEnding, contextEndImpersonation, onImpersonationEnd])

  // Notify parent when impersonation ends (but not during initial loading)
  useEffect(() => {
    // Only proceed if we're not loading and have a valid status
    if (loading) {
      return
    }

    // Track when impersonation was active
    if (status.active) {
      wasActiveRef.current = true
      // Reset the notification flag when impersonation becomes active again
      hasNotifiedRef.current = false
    } else if (wasActiveRef.current && !status.active && onImpersonationEnd && !hasNotifiedRef.current) {
      // Only call onImpersonationEnd if impersonation was previously active and is now inactive
      hasNotifiedRef.current = true
      onImpersonationEnd()
    }
  }, [status.active, loading, onImpersonationEnd])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + E to end impersonation
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
        event.preventDefault()
        if (status.active && !isEnding) {
          handleEndImpersonation()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [status.active, isEnding, handleEndImpersonation])

  // Don't render if not impersonating
  if (!status.active) {
    return null
  }

  const remainingSeconds = status.remaining_seconds || 0
  const isExpiringSoon = impersonationService.isSessionExpiringSoon(remainingSeconds)
  const timeDisplay = impersonationService.formatRemainingTime(remainingSeconds)

  return (
    <>
      <Alert
        severity={isExpiringSoon ? 'warning' : 'info'}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar + 1,
          borderRadius: 0,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        icon={<PersonIcon />}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={handleEndImpersonation}
            disabled={isEnding}
            startIcon={isEnding ? <CircularProgress size={16} /> : <ExitIcon />}
            sx={{ 
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
            aria-label="End impersonation session"
          >
            {isEnding ? 'Ending...' : 'Stop'}
          </Button>
        }
      >
        <AlertTitle sx={{ mb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" component="span" fontWeight="bold">
              Impersonating User
            </Typography>
            {isExpiringSoon && (
              <Chip
                icon={<WarningIcon />}
                label="Expiring Soon"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </AlertTitle>
        
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <PersonIcon fontSize="small" />
            <Typography variant="body2">
              <strong>{status.target_user?.email}</strong>
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <TimeIcon fontSize="small" />
            <Typography 
              variant="body2" 
              component="span"
              sx={{ 
                fontFamily: 'monospace',
                color: isExpiringSoon ? theme.palette.warning.main : 'inherit'
              }}
              aria-live="polite"
              aria-label={`Time remaining: ${timeDisplay}`}
            >
              {timeDisplay}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Press Ctrl+Shift+E to end quickly
          </Typography>
        </Box>
      </Alert>

      {/* Error snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  )
}

export default ImpersonationBanner
