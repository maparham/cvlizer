/**
 * Editing State Management Hook
 * 
 * This module provides comprehensive editing state management for CV sections and individual items.
 * It handles editing modes, unsaved changes detection, and navigation protection.
 * 
 * Key responsibilities:
 * - Manage section-level editing state and transitions
 * - Handle individual item editing with conflict resolution
 * - Detect and prevent navigation with unsaved changes
 * - Provide dialog management for unsaved changes warnings
 * - Coordinate between different editing modes
 * 
 * Usage:
 * - Use in CV editor components for state management
 * - Provides editing state and handlers for UI components
 * - Integrates with unsaved changes detection system
 * - Handles complex editing state transitions and conflicts
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { EditingIndividualItem } from '../types'
import { useUnsavedChanges } from '../components/cv/core/useUnsavedChanges'

interface EditingStateHook {
  // Section editing
  editingSection: string | null
  handleSectionEdit: (sectionType: string) => void
  handleSectionClose: () => void
  requestSectionCancel: () => void

  // Individual item editing
  editingIndividualItem: EditingIndividualItem | null
  registerIndividualItemEditing: (
    sectionId: string, 
    itemIndex: number, 
    onCancel: () => void, 
    onStartEdit?: () => void,
    skipDialog?: boolean
  ) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing: (sectionId: string, itemIndex: number) => void
  cancelIndividualItemEditing: () => void
  requestIndividualItemCancel: (sectionId: string, onCancel: () => void) => void

  // Dialog state
  showUnsavedChangesDialog: boolean
  pendingNavigation: (() => void) | null
  handleUnsavedChangesDialogClose: () => void
  handleUnsavedChangesDialogConfirm: () => void

  // Unsaved changes integration
  onUnsavedChanges: (sectionId: string, hasChanges: boolean) => void
  hasUnsavedChanges: boolean
  editingSections: Set<string>
  pendingChanges: Map<string, unknown>
  clearUnsavedChanges: () => void
  clearEditingState: () => void
}

interface UseEditingStateProps {
  // No props needed - this is a pure state management hook
}

export const useEditingState = (_props?: UseEditingStateProps): EditingStateHook => {
  // Unsaved changes tracking
  const {
    hasUnsavedChanges,
    editingSections,
    pendingChanges,
    startEditing,
    stopEditing,
    updatePendingChanges,
    clearUnsavedChanges
  } = useUnsavedChanges()

  // State ref to hold latest values for callbacks, preventing stale closures
  const stateRef = useRef({
    editingIndividualItem: null as EditingIndividualItem | null,
    onCancel: (() => {}) as () => void
  })

  // Section editing state
  const [editingSection, setEditingSection] = useState<string | null>(null)
  
  // Individual item editing state
  const [editingIndividualItem, setEditingIndividualItem] = useState<EditingIndividualItem | null>(null)
  const [pendingIndividualItemRegistration, setPendingIndividualItemRegistration] = useState<{
    sectionId: string
    itemIndex: number
    onCancel: () => void
    onStartEdit: () => void
  } | null>(null)

  // Dialog state
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  
  // Flag to prevent cascading dialog triggers during cleanup
  const [isDiscardingChanges, setIsDiscardingChanges] = useState(false)
  const isDiscardingChangesRef = useRef(false)
  
  // Update ref when state changes
  useEffect(() => {
    isDiscardingChangesRef.current = isDiscardingChanges
  }, [isDiscardingChanges])

  // Update stateRef with latest values to prevent stale closures
  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      editingIndividualItem
    }
  }, [editingIndividualItem])

  // Single callback that works for any section
  const onUnsavedChanges = useCallback((sectionId: string, hasChanges: boolean) => {
    updatePendingChanges(sectionId, hasChanges ? { hasChanges: true } : null)
  }, [updatePendingChanges])

  // Section editing functions
  const handleSectionEdit = useCallback((sectionType: string) => {
    setEditingSection(sectionType)
    startEditing(sectionType)
  }, [startEditing])

  const handleSectionClose = useCallback(() => {
    if (editingSection) {
      stopEditing(editingSection)
    }
    setEditingSection(null)
  }, [editingSection, stopEditing])

  const requestSectionCancel = useCallback(() => {
    // Don't show dialog if we're in the middle of discarding changes
    if (isDiscardingChangesRef.current) {
      handleSectionClose()
      return
    }
    
    if (!editingSection) {
      handleSectionClose()
      return
    }

    // Use current pendingChanges state
    const hasCurrentSectionChanges = pendingChanges.has(editingSection)

    if (hasCurrentSectionChanges) {
      setShowUnsavedChangesDialog(true)
      setPendingNavigation(() => handleSectionClose)
    } else {
      handleSectionClose()
    }
  }, [editingSection, pendingChanges, handleSectionClose])

  // Individual item editing functions
  const registerIndividualItemEditing = useCallback((
    sectionId: string, 
    itemIndex: number, 
    onCancel: () => void, 
    onStartEdit?: () => void, 
    skipDialog = false
  ): 'success' | 'dialog_shown' => {
    const currentEditingItem = stateRef.current.editingIndividualItem
    
    // If another item is already being edited, cancel it first
    if (currentEditingItem) {
      // Check if there are actual data changes in the current edit
      const hasRealDataChanges = pendingChanges.has(currentEditingItem.sectionId)
      
      if (hasRealDataChanges && !skipDialog) {
        // Show dialog to confirm canceling current edit
        setPendingIndividualItemRegistration({ 
          sectionId, 
          itemIndex, 
          onCancel, 
          onStartEdit: onStartEdit || (() => {}) 
        })
        setShowUnsavedChangesDialog(true)
        const onCancelToCall = stateRef.current.onCancel
        setPendingNavigation(() => () => {
          // Cancel current edit
          onCancelToCall()
        })
        return 'dialog_shown'
      } else {
        // No real data changes, so just cancel the current edit silently.
        stateRef.current.onCancel()
      }
    }
    
    // Register the new edit
    setEditingIndividualItem({ 
      id: `${sectionId}-${itemIndex}`, 
      section: sectionId, 
      sectionId, 
      data: null 
    })
    stateRef.current.onCancel = onCancel
    return 'success'
  }, [pendingChanges])

  const unregisterIndividualItemEditing = useCallback((_sectionId: string, _itemIndex: number) => {
    setEditingIndividualItem(null)
    stateRef.current.onCancel = () => {}
  }, [])
  
  // Function to cancel individual item editing by calling the registered callback
  const cancelIndividualItemEditing = useCallback(() => {
    const currentEditingItem = stateRef.current.editingIndividualItem
    if (currentEditingItem) {
      // Store the callback before clearing state
      const onCancelCallback = stateRef.current.onCancel
      
      // Clear the global state first to prevent cascading dialogs
      setEditingIndividualItem(null)
      stateRef.current.onCancel = () => {}
      
      // Then call the registered cancel function
      onCancelCallback()
    }
  }, [])

  const requestIndividualItemCancel = useCallback((sectionId: string, onCancel: () => void) => {
    // Don't show dialog if we're in the middle of discarding changes
    if (isDiscardingChangesRef.current) {
      onCancel()
      return
    }
    
    const currentEditingItem = stateRef.current.editingIndividualItem
    
    // Since only one item can be edited at a time, check if this is the current edit
    if (currentEditingItem && currentEditingItem.sectionId === sectionId) {
      // Check if there are actually unsaved data changes for this section
      const hasCurrentSectionChanges = pendingChanges.has(sectionId)
      
      if (hasCurrentSectionChanges) {
        // Show confirmation dialog only if there are unsaved changes
        setShowUnsavedChangesDialog(true)
        setPendingNavigation(() => onCancel)
      } else {
        // No changes, proceed with cancel immediately
        onCancel()
      }
    } else {
      // This shouldn't happen, but if it does, just cancel
      onCancel()
    }
  }, [pendingChanges])

  // Dialog handling functions
  const handleUnsavedChangesDialogClose = useCallback(() => {
    setShowUnsavedChangesDialog(false)
    setPendingNavigation(null)
    setPendingIndividualItemRegistration(null)
  }, [])

  const handleUnsavedChangesDialogConfirm = useCallback(() => {
    // Set flag to prevent cascading dialog triggers
    setIsDiscardingChanges(true)
    isDiscardingChangesRef.current = true  // Update ref immediately
    setShowUnsavedChangesDialog(false)
    
    // Clear pending changes for the section being discarded
    const currentEditingItem = stateRef.current.editingIndividualItem
    
    // Call the registered cancel function BEFORE clearing state
    if (currentEditingItem && stateRef.current.onCancel) {
      stateRef.current.onCancel()
    }
    
    // Always clear pending changes for the current editing item when discarding
    if (currentEditingItem) {
      // Force clear the pending changes immediately
      stopEditing(currentEditingItem.sectionId)
    }
    
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
    
    // Register the pending individual item if there is one
    if (pendingIndividualItemRegistration) {
      setEditingIndividualItem({ 
        id: `${pendingIndividualItemRegistration.sectionId}-${pendingIndividualItemRegistration.itemIndex}`,
        section: pendingIndividualItemRegistration.sectionId, 
        sectionId: pendingIndividualItemRegistration.sectionId, 
        data: null 
      })
      stateRef.current.onCancel = pendingIndividualItemRegistration.onCancel
      // Call onStartEdit to trigger the local edit mode
      if (pendingIndividualItemRegistration.onStartEdit) {
        pendingIndividualItemRegistration.onStartEdit()
      }
      setPendingIndividualItemRegistration(null)
    }
    
    // Clear the discarding flag after a short delay to allow cleanup to complete
    setTimeout(() => {
      setIsDiscardingChanges(false)
      isDiscardingChangesRef.current = false  // Update ref immediately
    }, 100)
  }, [pendingNavigation, pendingIndividualItemRegistration, stopEditing])

  // Clear all editing state (e.g., after successful save)
  const clearEditingState = useCallback(() => {
    setEditingSection(null)
    setEditingIndividualItem(null)
    setPendingIndividualItemRegistration(null)
    stateRef.current.onCancel = () => {}
  }, [])

  // Listen for editing state clear events
  useEffect(() => {
    const handleEditingStateClear = () => {
      clearEditingState()
    }

    window.addEventListener('cv-editing-state-clear', handleEditingStateClear)
    
    return () => {
      window.removeEventListener('cv-editing-state-clear', handleEditingStateClear)
    }
  }, [clearEditingState])

  return {
    // Section editing
    editingSection,
    handleSectionEdit,
    handleSectionClose,
    requestSectionCancel,

    // Individual item editing
    editingIndividualItem,
    registerIndividualItemEditing,
    unregisterIndividualItemEditing,
    cancelIndividualItemEditing,
    requestIndividualItemCancel,

    // Dialog state
    showUnsavedChangesDialog,
    pendingNavigation,
    handleUnsavedChangesDialogClose,
    handleUnsavedChangesDialogConfirm,

    // Unsaved changes integration
    onUnsavedChanges,
    hasUnsavedChanges,
    editingSections,
    pendingChanges,
    clearUnsavedChanges,
    clearEditingState
  }
}
