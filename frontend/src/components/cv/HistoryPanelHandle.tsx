/**
 * History Panel Handle Component
 * 
 * A persistent handle/tab that's always visible on the right side of the screen
 * to allow users to quickly open the history panel.
 */

import React from 'react'
import {
  Box,
  Tooltip,
  Chip
} from '@mui/material'
import {
  History as HistoryIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material'

interface HistoryPanelHandleProps {
  /** Whether the history panel is currently open */
  isOpen: boolean
  
  /** Callback to open the history panel */
  onOpen: () => void
  
  /** Number of history entries (optional, for badge) */
  entryCount?: number
  
  /** Whether to show the entry count badge */
  showCount?: boolean
}

const HistoryPanelHandle: React.FC<HistoryPanelHandleProps> = ({
  isOpen,
  onOpen,
  entryCount = 0,
  showCount = true
}) => {
  // Don't show handle when panel is open
  if (isOpen) {
    return null
  }

  return (
    <Tooltip title="Open CV Evolution" placement="left">
      <Box
        onClick={onOpen}
        sx={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1200,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          borderRight: 'none',
          borderRadius: '6px 0 0 6px',
          padding: '8px 6px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          minWidth: 36,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: 'primary.main',
            transform: 'translateY(-50%) translateX(-3px)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            borderColor: 'primary.light'
          },
          '&:active': {
            transform: 'translateY(-50%) translateX(-1px)',
            backgroundColor: 'rgba(255, 255, 255, 1)'
          }
        }}
      >
        <HistoryIcon fontSize="small" />
        
        {showCount && entryCount > 0 && (
          <Chip
            size="small"
            label={entryCount}
            sx={{
              height: 16,
              fontSize: '0.6rem',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiChip-label': {
                px: 0.5
              }
            }}
          />
        )}
        
        <ChevronLeftIcon 
          fontSize="small" 
          sx={{ 
            mt: 0.5,
            opacity: 0.7 
          }} 
        />
      </Box>
    </Tooltip>
  )
}

export default HistoryPanelHandle
