import React, { useEffect, useRef } from 'react'
import { Box, Typography, IconButton, Divider, Tooltip } from '@mui/material'
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'
import { BaseSectionProps } from '../types'

const BaseSection: React.FC<BaseSectionProps> = ({ 
  title, 
  onEdit, 
  onSave,
  onCancel,
  children, 
  editButton,
  isEditing,
  isValid = true
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)

  // Auto-focus first input when entering edit mode
  useEffect(() => {
    if (isEditing && sectionRef.current) {
      const firstInput = sectionRef.current.querySelector('input, textarea') as HTMLInputElement
      if (firstInput) {
        // Small delay to ensure the input is rendered
        setTimeout(() => firstInput.focus(), 100)
      }
    }
  }, [isEditing])

  return (
    <Box 
      ref={sectionRef}
      sx={{ 
        position: 'relative'
      }}
    >
      {isEditing && onCancel ? (
        // Show save and cancel icon buttons in edit mode (save button only if onSave is provided)
        <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 0.5 }}>
          {onSave && (
            <Tooltip title="Save changes">
              <IconButton
                onClick={onSave}
                disabled={!isValid}
                sx={{
                  opacity: 1,
                  transition: 'opacity 0.2s',
                  bgcolor: 'white',
                  boxShadow: 1,
                  '&:disabled': {
                    opacity: 0.5
                  }
                }}
                size="small"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Cancel editing">
            <IconButton
              onClick={onCancel}
              sx={{
                opacity: 1,
                transition: 'opacity 0.2s',
                bgcolor: 'white',
                boxShadow: 1
              }}
              size="small"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        // Show edit button or custom editButton in view mode
        editButton !== null ? editButton : (
          <Tooltip title="Edit this section">
            <IconButton
              className="edit-button"
              onClick={onEdit}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                opacity: 1,
                transition: 'opacity 0.2s',
                bgcolor: 'white',
                boxShadow: 1
              }}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )
      )}

      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
        {title}
      </Typography>
      
      {children}
      <Divider sx={{ my: 2 }} />
    </Box>
  )
}

export default BaseSection
