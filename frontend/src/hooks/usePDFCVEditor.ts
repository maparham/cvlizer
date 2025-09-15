import { useState, useCallback } from 'react'
import { PDFCVEditorProps, CVSection } from '../types'
import { useSectionManagement } from './useSectionManagement'
import { useEditingState } from './useEditingState'
import { useDragAndDrop } from './useDragAndDrop'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

interface PDFCVEditorHook {
  // Section management
  sections: CVSection[]
  toggleSectionVisibility: (sectionId: string) => void
  addNewSection: (sectionId: string) => void
  removeSection: (sectionId: string) => void
  resetToDefaultOrder: () => void
  isDefaultOrder: () => boolean
  getAvailableSectionsToAdd: () => Array<{id: string; name: string}>

  // Drag and drop
  activeId: string | null
  handleDragStart: (event: any) => void
  handleDragEnd: (event: any) => void

  // Editing state
  editingSection: string | null
  handleSectionEdit: (sectionType: string) => void
  handleSectionClose: () => void
  requestSectionCancel: () => void
  editingIndividualItem: any
  registerIndividualItemEditing: (
    sectionId: string, 
    itemIndex: number, 
    onCancel: () => void, 
    onStartEdit?: () => void
  ) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing: () => void
  requestIndividualItemCancel: (sectionId: string, onCancel: () => void) => void

  // Unsaved changes
  onUnsavedChanges: (sectionId: string, hasChanges: boolean) => void
  hasUnsavedChanges: boolean
  editingSections: Set<string>
  pendingChanges: Map<string, unknown>

  // Dialog state
  showUnsavedChangesDialog: boolean
  handleUnsavedChangesDialogClose: () => void
  handleUnsavedChangesDialogConfirm: () => void

  // Reset dialog
  showResetDialog: boolean
  handleResetClick: () => void
  setShowResetDialog: (show: boolean) => void
}

export const usePDFCVEditor = ({ 
  cvData, 
  onUpdateCV, 
  onSave 
}: PDFCVEditorProps): PDFCVEditorHook => {
  // Reset dialog state (not managed by other hooks)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Wrap onSave to update CV data as well
  const handleSave = useCallback((updatedData = cvData, message?: string) => {
    onUpdateCV(updatedData)
    return onSave(updatedData, message)
  }, [cvData, onUpdateCV, onSave])

  // Section management
  const sectionManagement = useSectionManagement({
    cvData,
    onSave: handleSave
  })

  // Editing state management
  const editingState = useEditingState()

  // Drag and drop
  const dragAndDrop = useDragAndDrop({
    sections: sectionManagement.sections,
    onReorderSections: sectionManagement.reorderSections
  })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    editingSection: editingState.editingSection,
    editingIndividualItem: editingState.editingIndividualItem,
    pendingChanges: editingState.pendingChanges,
    onRequestSectionCancel: editingState.requestSectionCancel,
    onIndividualItemCancel: editingState.cancelIndividualItemEditing,
    showUnsavedChangesDialog: editingState.showUnsavedChangesDialog,
    onShowUnsavedChangesDialog: (show: boolean) => {
      // This is a bit hacky, but needed for the keyboard shortcuts
      // In a real implementation, we might want to refactor this
      if (show) {
        // Trigger the dialog through the editing state
        editingState.requestSectionCancel()
      }
    },
    onSetPendingNavigation: () => {
      // Also hacky, but this shows why we might need a different architecture
      // The keyboard shortcuts hook needs better integration
    }
  })

  // Reset dialog handlers
  const handleResetClick = useCallback(() => {
    setShowResetDialog(true)
  }, [])

  const handleResetConfirm = useCallback(() => {
    sectionManagement.resetToDefaultOrder()
    setShowResetDialog(false)
  }, [sectionManagement])

  return {
    // Section management
    sections: sectionManagement.sections,
    toggleSectionVisibility: sectionManagement.toggleSectionVisibility,
    addNewSection: sectionManagement.addNewSection,
    removeSection: sectionManagement.removeSection,
    resetToDefaultOrder: handleResetConfirm,
    isDefaultOrder: sectionManagement.isDefaultOrder,
    getAvailableSectionsToAdd: sectionManagement.getAvailableSectionsToAdd,

    // Drag and drop
    activeId: dragAndDrop.activeId,
    handleDragStart: dragAndDrop.handleDragStart,
    handleDragEnd: dragAndDrop.handleDragEnd,

    // Editing state
    editingSection: editingState.editingSection,
    handleSectionEdit: editingState.handleSectionEdit,
    handleSectionClose: editingState.handleSectionClose,
    requestSectionCancel: editingState.requestSectionCancel,
    editingIndividualItem: editingState.editingIndividualItem,
    registerIndividualItemEditing: editingState.registerIndividualItemEditing,
    unregisterIndividualItemEditing: editingState.unregisterIndividualItemEditing,
    requestIndividualItemCancel: editingState.requestIndividualItemCancel,

    // Unsaved changes
    onUnsavedChanges: editingState.onUnsavedChanges,
    hasUnsavedChanges: editingState.hasUnsavedChanges,
    editingSections: editingState.editingSections,
    pendingChanges: editingState.pendingChanges,

    // Dialog state
    showUnsavedChangesDialog: editingState.showUnsavedChangesDialog,
    handleUnsavedChangesDialogClose: editingState.handleUnsavedChangesDialogClose,
    handleUnsavedChangesDialogConfirm: editingState.handleUnsavedChangesDialogConfirm,

    // Reset dialog
    showResetDialog,
    handleResetClick,
    setShowResetDialog
  }
}
