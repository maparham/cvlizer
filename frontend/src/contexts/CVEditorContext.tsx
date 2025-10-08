/**
 * CV Editor Context
 * 
 * This module provides comprehensive state management for the CV editor including:
 * - CV data management and updates
 * - Section visibility and ordering controls
 * - Drag and drop functionality for section reordering
 * - Editing state management (section and individual item editing)
 * - Unsaved changes detection and confirmation dialogs
 * - Reset functionality with confirmation
 * 
 * Note: This is a large context that coordinates multiple editor features.
 * Consider breaking into smaller contexts if complexity grows further.
 */
import React, { createContext, useContext, ReactNode } from 'react'
import { CVData, CVSection, EditingIndividualItem } from '../types'
import { usePDFCVEditor } from '../hooks/usePDFCVEditor'
import { ValidationError } from '../utils/validationUtils'

// Context type definition
interface CVEditorContextType {
  // CV Data
  cvData: CVData
  onUpdateCV: (data: CVData) => void
  onSave: (data?: CVData, message?: string) => Promise<void>

  // Section management
  sections: CVSection[]
  toggleSectionVisibility: (sectionId: string) => void
  addNewSection: (sectionId: string) => void
  removeSection: (sectionId: string) => void
  resetToDefaultOrder: () => void
  isDefaultOrder: () => boolean
  getAvailableSectionsToAdd: () => Array<{id: string; name: string}>
  updateSectionTitle: (sectionId: string, newTitle: string) => void

  // Drag and drop
  activeId: string | null
  handleDragStart: (event: any) => void
  handleDragEnd: (event: any) => void

  // Editing state
  editingSection: string | null
  handleSectionEdit: (sectionType: string) => void
  handleSectionClose: () => void
  requestSectionCancel: () => void
  editingIndividualItem: EditingIndividualItem | null
  registerIndividualItemEditing: (
    sectionId: string, 
    itemIndex: number, 
    onCancel: () => void, 
    onStartEdit?: () => void
  ) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing: (sectionId: string, itemIndex: number) => void
  requestIndividualItemCancel: (sectionId: string, onCancel: () => void) => void

  // Unsaved changes
  onUnsavedChanges: (sectionId: string, hasChanges: boolean) => void
  hasUnsavedChanges: boolean
  editingSections: Set<string>
  pendingChanges: Map<string, unknown>
  clearUnsavedChanges: () => void
  clearEditingState: () => void

  // Dialog state
  showUnsavedChangesDialog: boolean
  handleUnsavedChangesDialogClose: () => void
  handleUnsavedChangesDialogConfirm: () => void
  showResetDialog: boolean
  handleResetClick: () => void
  setShowResetDialog: (show: boolean) => void

  // Validation errors
  validationErrors: ValidationError[]
  setValidationErrors: (errors: ValidationError[]) => void
  clearValidationErrors: () => void
}

// Create context
const CVEditorContext = createContext<CVEditorContextType | undefined>(undefined)

// Provider props
interface CVEditorProviderProps {
  children: ReactNode
  cvData: CVData
  onUpdateCV: (data: CVData) => void
  onSave: (data?: CVData, message?: string) => Promise<void>
}

// Provider component
export const CVEditorProvider: React.FC<CVEditorProviderProps> = ({
  children,
  cvData,
  onUpdateCV,
  onSave
}) => {
  
  const editorState = usePDFCVEditor({
    cvData,
    onUpdateCV,
    onSave
  })

  const contextValue: CVEditorContextType = {
    // Pass through the original props
    cvData,
    onUpdateCV,
    onSave,
    
    // Spread all the editor state
    ...editorState
  }

  return (
    <CVEditorContext.Provider value={contextValue}>
      {children}
    </CVEditorContext.Provider>
  )
}

// Hook to use the context
export const useCVEditor = (): CVEditorContextType => {
  const context = useContext(CVEditorContext)
  if (context === undefined) {
    throw new Error('useCVEditor must be used within a CVEditorProvider')
  }
  return context
}

// Simplified convenience hooks - consolidated from 4 to 2 focused hooks
export const useCVEditorControls = () => {
  const context = useCVEditor()
  
  return {
    // Section management
    sections: {
      items: context.sections,
      toggleVisibility: context.toggleSectionVisibility,
      add: context.addNewSection,
      remove: context.removeSection,
      resetToDefault: context.resetToDefaultOrder,
      isDefaultOrder: context.isDefaultOrder,
      availableToAdd: context.getAvailableSectionsToAdd(),
      updateTitle: context.updateSectionTitle,
    },
    
    // Drag and drop
    dragDrop: {
      activeId: context.activeId,
      onDragStart: context.handleDragStart,
      onDragEnd: context.handleDragEnd,
    },
    
    // Reset functionality  
    reset: {
      showDialog: context.showResetDialog,
      onResetClick: context.handleResetClick,
      onCloseDialog: () => context.setShowResetDialog(false),
      onConfirmReset: context.resetToDefaultOrder,
    }
  }
}

export const useCVEditorState = () => {
  const context = useCVEditor()
  
  return {
    // Editing state
    editing: {
      section: context.editingSection,
      individualItem: context.editingIndividualItem,
      onSectionEdit: context.handleSectionEdit,
      onSectionClose: context.handleSectionClose,
      onRequestSectionCancel: context.requestSectionCancel,
      onRegisterIndividualItem: context.registerIndividualItemEditing,
      onUnregisterIndividualItem: context.unregisterIndividualItemEditing,
      onRequestIndividualCancel: context.requestIndividualItemCancel,
    },
    
    // Unsaved changes
    changes: {
      hasUnsaved: context.hasUnsavedChanges,
      editingSections: context.editingSections,
      pendingChanges: context.pendingChanges,
      onUnsavedChanges: context.onUnsavedChanges,
      showDialog: context.showUnsavedChangesDialog,
      onCloseDialog: context.handleUnsavedChangesDialogClose,
      onConfirmDialog: context.handleUnsavedChangesDialogConfirm,
    }
  }
}
