import React from 'react'
import { ListItem, ListItemIcon, ListItemText, IconButton, Box, Tooltip } from '@mui/material'
import { DragIndicator as DragIcon, Visibility as ViewIcon, VisibilityOff as HideIcon, Remove as RemoveIcon } from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableSectionItemProps } from '../types'

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({ section, onToggleVisibility, onRemove, isOverlay = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id })

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
        bgcolor: section.visible ? 'white' : '#f5f5f5',
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
        primary={section.title}
        sx={{ 
          flexGrow: 1,
          minWidth: 0,
          '& .MuiListItemText-primary': { 
            fontWeight: section.visible ? 600 : 400,
            fontSize: '0.85rem',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }}
      />
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={section.visible ? "Hide this section" : "Show this section"}>
          <IconButton
            onClick={() => onToggleVisibility(section.id)}
            color={section.visible ? 'primary' : 'default'}
            size="small"
            sx={{ 
              '&:hover': { 
                bgcolor: section.visible ? 'primary.light' : 'action.hover',
                color: section.visible ? 'primary.contrastText' : 'text.primary'
              }
            }}
          >
            {section.visible ? <ViewIcon /> : <HideIcon />}
          </IconButton>
        </Tooltip>
        {onRemove && (
          <Tooltip title="Remove this section">
            <IconButton
              onClick={() => onRemove(section.id)}
              color="error"
              size="small"
              sx={{ 
                '&:hover': { 
                  bgcolor: 'error.light',
                  color: 'error.contrastText'
                }
              }}
            >
              <RemoveIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </ListItem>
  )
}

export default SortableSectionItem
