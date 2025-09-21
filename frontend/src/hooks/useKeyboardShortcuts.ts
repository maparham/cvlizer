import { useEffect, useCallback } from 'react'
import { EditingIndividualItem } from '../types'

interface KeyboardShortcutsHook {
  // This hook doesn't expose any values, it just handles keyboard events
}

interface UseKeyboardShortcutsProps {
  editingSection: string | null
  editingIndividualItem: EditingIndividualItem | null
  pendingChanges: Map<string, unknown>
  onRequestSectionCancel: () => void
  onIndividualItemCancel: () => void
  showUnsavedChangesDialog: boolean
  onShowUnsavedChangesDialog: (show: boolean) => void
  onSetPendingNavigation: (navigation: (() => void) | null) => void
  onUnsavedChangesDialogClose: () => void
}

export const useKeyboardShortcuts = ({
  editingSection,
  editingIndividualItem,
  pendingChanges,
  onRequestSectionCancel,
  onIndividualItemCancel,
  showUnsavedChangesDialog,
  onShowUnsavedChangesDialog,
  onSetPendingNavigation,
  onUnsavedChangesDialogClose
}: UseKeyboardShortcutsProps): KeyboardShortcutsHook => {

  const handleEscapeKey = useCallback(() => {
    // If dialog is open, Escape should trigger "Stay" (close dialog without discarding)
    if (showUnsavedChangesDialog) {
      onUnsavedChangesDialogClose()
      return
    }

    // Handle IndividualItemSection editing (priority over section editing)
    if (editingIndividualItem) {
      const hasCurrentSectionChanges = pendingChanges.has(editingIndividualItem.sectionId)
      
      if (hasCurrentSectionChanges) {
        // Show unsaved changes dialog
        onShowUnsavedChangesDialog(true)
        onSetPendingNavigation(() => () => {
          onIndividualItemCancel()
        })
      } else {
        // No changes, close immediately
        onIndividualItemCancel()
      }
    }
    // Handle regular section editing (only when no individual item is being edited)
    else if (editingSection) {
      const hasCurrentSectionChanges = pendingChanges.has(editingSection)
      
      if (hasCurrentSectionChanges) {
        // Show unsaved changes dialog
        onShowUnsavedChangesDialog(true)
        onSetPendingNavigation(() => () => {
          onRequestSectionCancel()
        })
      } else {
        // No changes, close immediately
        onRequestSectionCancel()
      }
    }
    // Fallback: Look for cancel buttons in forms that are NOT managed by global state
    else {
      // Only look for cancel buttons in specific components that we know are NOT managed by global state
      // This includes Personal Information, Professional Summary, and other simple form sections
      const cancelButtons = document.querySelectorAll(
        'button[aria-label*="Cancel"], button[title*="Cancel"], button[aria-label*="cancel"], button[title*="cancel"]'
      )
      
      // Filter to only buttons that are in simple form sections (not IndividualItemSection)
      const simpleFormCancelButtons = Array.from(cancelButtons).filter(button => {
        const htmlButton = button as HTMLButtonElement
        
        // Check if this button is in a simple form section (Personal Info, Professional Summary, etc.)
        // These sections typically have different structure than IndividualItemSection
        const isInSimpleForm = htmlButton.closest('.simple-form-section, [data-section-type="simple"], .form-section:not(.individual-item)')
        
        return !htmlButton.disabled && 
               htmlButton.offsetParent !== null && // Element is visible
               htmlButton.getBoundingClientRect().width > 0 && // Element has dimensions
               isInSimpleForm // Only in simple form sections
      })
      
      if (simpleFormCancelButtons.length > 0) {
        const cancelButton = simpleFormCancelButtons[0] as HTMLButtonElement
        cancelButton.click()
        return
      }
      
      // Fallback: look for close buttons in simple form sections
      const closeButtons = document.querySelectorAll(
        'button[aria-label*="Close"], button[title*="Close"], button[aria-label*="close"], button[title*="close"]'
      )
      
      const simpleFormCloseButtons = Array.from(closeButtons).filter(button => {
        const htmlButton = button as HTMLButtonElement
        const isInSimpleForm = htmlButton.closest('.simple-form-section, [data-section-type="simple"], .form-section:not(.individual-item)')
        
        return !htmlButton.disabled && 
               htmlButton.offsetParent !== null &&
               htmlButton.getBoundingClientRect().width > 0 &&
               isInSimpleForm
      })
      
      if (simpleFormCloseButtons.length > 0) {
        const closeButton = simpleFormCloseButtons[0] as HTMLButtonElement
        closeButton.click()
        return
      }
    }
  }, [
    editingSection, 
    editingIndividualItem, 
    pendingChanges, 
    showUnsavedChangesDialog,
    onRequestSectionCancel,
    onIndividualItemCancel,
    onShowUnsavedChangesDialog,
    onSetPendingNavigation
  ])

  const handleSaveShortcut = useCallback((event: KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      
      // Find save buttons and click them
      const saveButtons = document.querySelectorAll('[aria-label="Save changes"], [title="Save changes"]')
      if (saveButtons.length > 0) {
        const saveButton = saveButtons[0] as HTMLButtonElement
        if (!saveButton.disabled) {
          saveButton.click()
        }
      }
    }
  }, [])

  // Handle escape key to close edit forms
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleEscapeKey()
      }
      
      // Handle save shortcut
      handleSaveShortcut(event)
    }

    // Use capture phase to catch events before other handlers
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleEscapeKey, handleSaveShortcut])

  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingChanges.size > 0) {
        event.preventDefault()
        event.returnValue = 'You have unsaved changes that will be lost if you leave this page.'
        return 'You have unsaved changes that will be lost if you leave this page.'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pendingChanges])

  return {
    // This hook doesn't expose any values
  }
}
