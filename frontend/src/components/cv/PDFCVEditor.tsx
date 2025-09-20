/**
 * PDF-Style CV Editor Component
 * 
 * This module provides the main CV editing interface with PDF-like layout including:
 * - Section management sidebar for reordering and toggling visibility
 * - PDF-style content area with real-time editing
 * - Drag and drop functionality for section reordering
 * - Unsaved changes detection and confirmation dialogs
 * - Integration with CV editor context for state management
 */
import React from 'react'
import { Box } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

// Import extracted components and contexts
import {
  SectionManagerSidebar,
  CVContentArea,
  PDFCVEditorDialogs
} from './core'
import {
  useCVEditorControls,
  useCVEditorState
  // useCVEditor
} from '../../contexts/CVEditorContext'
import { ConnectedHistoryPanel, ConnectedHistoryPanelHandle } from './index'
import { useCVStore } from '../../stores/cvStore'

interface PDFCVEditorProps {
  title?: string
  onTitleSave?: (newTitle: string) => Promise<void>
  cvId?: string
}

const PDFCVEditor: React.FC<PDFCVEditorProps> = ({ title, onTitleSave, cvId }) => {
  // Use context instead of props
  // const { cvData } = useCVEditor()
  
  // Use consolidated context hooks
  const { sections, dragDrop, reset } = useCVEditorControls()
  const { changes } = useCVEditorState()
  
  // Get history store actions  
  const handleHistoryClick = () => {
    const { setHistoryPanelOpen } = useCVStore.getState()
    setHistoryPanelOpen(true)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Section Manager Sidebar */}
        <SectionManagerSidebar
          sections={sections.items}
          activeId={dragDrop.activeId}
          isDefaultOrder={sections.isDefaultOrder()}
          availableSectionsToAdd={sections.availableToAdd}
          title={title || 'Untitled CV'}
          onTitleSave={onTitleSave || (async () => {})}
          onToggleVisibility={sections.toggleVisibility}
          onAddNewSection={sections.add}
          onDragStart={dragDrop.onDragStart}
          onDragEnd={dragDrop.onDragEnd}
        />

      {/* PDF-like CV Content */}
        <CVContentArea />

        {/* Dialogs */}
        <PDFCVEditorDialogs
          showResetDialog={reset.showDialog}
          showUnsavedChangesDialog={changes.showDialog}
          pendingChanges={changes.pendingChanges}
          onCloseResetDialog={reset.onCloseDialog}
          onConfirmReset={reset.onConfirmReset}
          onCloseUnsavedChangesDialog={changes.onCloseDialog}
          onConfirmUnsavedChanges={changes.onConfirmDialog}
        />

        {/* History Panel */}
        {cvId && <ConnectedHistoryPanel cvId={cvId} />}
        
        {/* History Panel Handle - Always visible when panel is closed */}
        {cvId && <ConnectedHistoryPanelHandle cvId={cvId} />}
      </Box>
    </LocalizationProvider>
  )
}

export default PDFCVEditor