/**
 * Section Manager Sidebar Component
 * 
 * This module provides the sidebar interface for CV section management including:
 * - Section visibility toggles (show/hide sections)
 * - Drag and drop reordering of CV sections
 * - Add new sections functionality
 * - Reset to default order option
 * - Visual indicators for section states and order changes
 */
import React from 'react'
import {
  Paper,
  Typography,
  Button,
  Tooltip,
  Card,
  CardContent,
  Box,
  List
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CVSection } from '../../../types'
import SortableSectionItem from './SortableSectionItem'
import { AVAILABLE_SECTIONS } from '../constants'
import { EditableTitle } from '../EditableTitle'

interface SectionManagerSidebarProps {
  sections: CVSection[]
  activeId: string | null
  isDefaultOrder: boolean
  availableSectionsToAdd: any[]
  title: string
  onTitleSave: (newTitle: string) => Promise<void>
  onToggleVisibility: (sectionId: string) => void
  onAddNewSection: (sectionId: string) => void
  onDragStart: (event: any) => void
  onDragEnd: (event: any) => void
}

const SectionManagerSidebar: React.FC<SectionManagerSidebarProps> = ({
  sections,
  activeId,
  availableSectionsToAdd,
  title,
  onTitleSave,
  onToggleVisibility,
  onAddNewSection,
  onDragStart,
  onDragEnd
}) => {
  return (
    <Paper sx={{ 
      width: 350, 
      p: 2, 
      overflow: 'auto',
      border: 'none',
      boxShadow: 'none',
      borderRight: '1px solid #e0e0e0'
    }}>
      {/* CV Title - At the top */}
      <Box sx={{ mb: 2 }}>
        <EditableTitle
          title={title}
          onSave={onTitleSave}
          variant="h6"
          sx={{
            width: '100%',
            '& .MuiTypography-root': {
              color: '#333',
              fontSize: '1.1rem',
              fontWeight: 500
            }
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: '#666', mb: 2, fontStyle: 'italic' }}>
        Drag sections to reorder them
      </Typography>
      
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <List>
            {sections
              .filter(section => section.visible)
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SortableSectionItem
                  key={section.id}
                  section={section}
                  onToggleVisibility={onToggleVisibility}
                />
              ))}
          </List>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <SortableSectionItem
              section={sections.find(s => s.id === activeId)!}
              onToggleVisibility={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Hidden Sections */}
      {sections.filter(section => !section.visible).length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 3, mb: 2, color: '#666' }}>
            Hidden Sections
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sections
              .filter(section => !section.visible)
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <Card 
                  key={section.id}
                  sx={{ 
                    border: '1px solid #e0e0e0',
                    bgcolor: '#f5f5f5',
                    '&:hover': {
                      borderColor: '#1976d2',
                      boxShadow: 1
                    }
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ mr: 1.5, flexShrink: 0 }}>
                          {AVAILABLE_SECTIONS.find(s => s.id === section.id)?.icon || '📄'}
                        </Typography>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.8rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {section.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Content preserved
                          </Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Restore this section">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onAddNewSection(section.id)}
                          sx={{ ml: 1.5, minWidth: 'auto', px: 0.5, flexShrink: 0 }}
                        >
                          <AddIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              ))}
          </Box>
        </>
      )}

      {/* Available Sections */}
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 3, mb: 2, color: '#666' }}>
        Available Sections ({availableSectionsToAdd.length})
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {availableSectionsToAdd.length > 0 ? availableSectionsToAdd.map((section) => (
          <Card 
            key={section.id}
            sx={{ 
              border: '1px solid #e0e0e0',
              '&:hover': {
                borderColor: '#1976d2',
                boxShadow: 1
              }
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ mr: 1.5, flexShrink: 0 }}>
                    {section.icon}
                  </Typography>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {section.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {section.description}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Add this section to your CV">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onAddNewSection(section.id)}
                    sx={{ ml: 1.5, minWidth: 'auto', px: 0.5, flexShrink: 0 }}
                  >
                    <AddIcon fontSize="small" />
                  </Button>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        )) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
            No available sections to add (all sections already present)
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

export default SectionManagerSidebar
