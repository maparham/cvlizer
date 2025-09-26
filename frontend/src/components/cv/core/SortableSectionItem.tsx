import React from 'react'
import { ListItem, ListItemIcon, ListItemText, IconButton, Box, Tooltip, Badge } from '@mui/material'
import { DragIndicator as DragIcon, Visibility as ViewIcon, VisibilityOff as HideIcon, Warning as WarningIcon } from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableSectionItemProps } from '../../../types'
import { useCVEditor } from '../../../contexts/CVEditorContext'
import { hasSectionErrors, getSectionErrorCount } from '../../../utils/validationUtils'

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({ 
  id, 
  title, 
  visible, 
  section, 
  onToggleVisibility, 
  isOverlay = false 
}) => {
  const { validationErrors } = useCVEditor()
  
  // Use individual props if provided, otherwise fall back to section object
  const sectionId = id || section?.id || ''
  const sectionTitle = title || section?.title || ''
  const sectionVisible = visible !== undefined ? visible : (section?.visible ?? false)
  
  const hasErrors = sectionId ? hasSectionErrors(validationErrors, sectionId) : false
  const errorCount = sectionId ? getSectionErrorCount(validationErrors, sectionId) : 0
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sectionId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        mb: 1,
        bgcolor: sectionVisible ? 'white' : '#f5f5f5',
        cursor: isOverlay ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transform: 'translateY(-1px)'
        },
        ...(isDragging && {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        })
      }}
    >
      <ListItemIcon sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' }, minWidth: '32px' }}>
        <Tooltip title="Drag to reorder sections">
          <DragIcon 
            {...attributes} 
            {...listeners}
            fontSize="small"
            sx={{ 
              color: '#666',
              '&:hover': { color: '#1976d2' }
            }}
          />
        </Tooltip>
      </ListItemIcon>
      <ListItemText 
        primary={sectionTitle}
        sx={{ 
          flexGrow: 1,
          minWidth: 0,
          '& .MuiListItemText-primary': { 
            fontWeight: sectionVisible ? 600 : 400,
            fontSize: '0.85rem',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: hasErrors ? '#d32f2f' : 'inherit'
          }
        }}
      />
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        {hasErrors && (
          <Tooltip title={`${errorCount} validation error${errorCount > 1 ? 's' : ''} in this section`}>
            <Badge badgeContent={errorCount} color="error" sx={{ mr: 0.5 }}>
              <WarningIcon fontSize="small" sx={{ color: '#d32f2f' }} />
            </Badge>
          </Tooltip>
        )}
        <Tooltip title={sectionVisible ? "Hide this section" : "Show this section"}>
          <IconButton
            onClick={() => sectionId && onToggleVisibility?.(sectionId)}
            color={sectionVisible ? 'primary' : 'default'}
            size="small"
            sx={{ 
              '&:hover': { 
                bgcolor: sectionVisible ? 'primary.light' : 'action.hover',
                color: sectionVisible ? 'primary.contrastText' : 'text.primary'
              }
            }}
          >
            {sectionVisible ? <ViewIcon /> : <HideIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </ListItem>
  )
}

export default SortableSectionItem
