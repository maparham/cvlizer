/**
 * Loading State Component
 * 
 * Reusable loading indicator for consistent UX
 */

import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingStateProps {
  message?: string
  size?: number
  variant?: 'centered' | 'inline'
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  size = 24,
  variant = 'centered'
}) => {
  if (variant === 'inline') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={size} />
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2,
        p: 3
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  )
}

export default LoadingState
