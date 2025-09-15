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
  useCVEditorState,
  useCVEditor
} from '../../contexts/CVEditorContext'

const PDFCVEditor: React.FC = () => {
  // Use context instead of props
  const { cvData } = useCVEditor()
  
  // Use consolidated context hooks
  const { sections, dragDrop, reset } = useCVEditorControls()
  const { editing, changes } = useCVEditorState()

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Section Manager Sidebar */}
        <SectionManagerSidebar
          sections={sections.items}
          activeId={dragDrop.activeId}
          isDefaultOrder={sections.isDefaultOrder}
          availableSectionsToAdd={sections.availableToAdd}
          onToggleVisibility={sections.toggleVisibility}
          onResetClick={reset.onResetClick}
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
      </Box>
    </LocalizationProvider>
  )
}

export default PDFCVEditor