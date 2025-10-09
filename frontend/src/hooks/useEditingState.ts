/**
 * Editing State Management Hook with State Machine
 * 
 * This module provides type-safe editing state management for CV sections and individual items
 * using a discriminated union state machine pattern.
 * 
 * Architecture:
 * - **State Machine**: Uses `useReducer` with discriminated union types (`EditingState`)
 * - **Type Safety**: TypeScript prevents invalid state combinations at compile time
 * - **No Stale Closures**: All state transitions via reducer actions, eliminating closure bugs
 * - **Self-Documenting**: State machine makes transitions explicit and easy to understand
 * 
 * Key Features:
 * - **Mutual Exclusivity**: Can't edit section AND item simultaneously (enforced by types)
 * - **Unsaved Changes Detection**: Integrates with `useUnsavedChanges` hook
 * - **Dialog Management**: Confirms discarding unsaved changes before navigation
 * - **Auto-save Support**: Handles both manual-save and auto-save sections
 * 
 * State Machine Modes:
 * - `idle`: No active editing
 * - `editing_section`: Editing a non-array section (e.g., Personal Info)
 * - `editing_item`: Editing an array item (e.g., Work Experience entry)
 * - `discarding`: (Not actively used) Transitioning after confirming discard
 * 
 * Usage Example:
 * ```tsx
 * const editing = useEditingState()
 * 
 * // Start editing a section
 * editing.handleSectionEdit('personal_info')
 * 
 * // Register individual item editing
 * editing.registerIndividualItemEditing('education', 0, () => setIsEditing(false))
 * 
 * // Track unsaved changes
 * editing.onUnsavedChanges('education', true)
 * ```
 * 
 * Benefits for AI Coding:
 * - TypeScript prevents common mistakes (e.g., editing two things at once)
 * - Explicit state transitions make code easier to understand and modify
 * - Reducer pattern eliminates stale closure bugs that plagued previous implementation
 * - Type guards provide intellisense and autocomplete for state-specific properties
 */
import { useState, useCallback, useRef, useEffect, useReducer } from 'react'
import { EditingIndividualItem } from '../types'
import { useUnsavedChanges } from '../components/cv/core/useUnsavedChanges'
import { EditingState, EditingAction, isIdle, isEditingSection, isEditingItem, isDiscarding } from '../types/editingState'

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

/**
 * Editing State Machine Reducer
 * 
 * Central state transition logic. All editing state changes flow through this reducer.
 * 
 * Benefits vs Scattered setState:
 * 1. **Single Source of Truth**: All transitions in one place
 * 2. **Type Safety**: TypeScript ensures exhaustive action handling
 * 3. **No Stale Closures**: Reducer always has current state
 * 4. **Testability**: Easy to test transitions in isolation
 * 5. **Debuggability**: Can log all state changes in one place
 * 
 * State Transition Rules:
 * - `START_SECTION_EDIT` & `START_ITEM_EDIT` always replace current state (mutual exclusivity)
 * - `UPDATE_CHANGES` only works in editing states (not idle or discarding)
 * - `CLOSE` always returns to idle
 * - `RESET` is a force-reset (e.g., after successful save)
 * 
 * @param state Current editing state
 * @param action Action to perform
 * @returns New editing state
 */
function editingStateReducer(state: EditingState, action: EditingAction): EditingState {
  console.log('🔄 [STATE MACHINE] Action:', action.type, {
    currentState: state.mode,
    action,
    timestamp: new Date().toISOString().split('T')[1]
  })

  let newState: EditingState
  
  switch (action.type) {
    case 'START_SECTION_EDIT':
      // Starting section edit always replaces current state
      // Can't have section AND item editing simultaneously (enforced by type)
      newState = { 
        mode: 'editing_section', 
        section: action.section, 
        hasChanges: false 
      }
      console.log('✅ [STATE MACHINE] Started editing section:', action.section)
      return newState
    
    case 'START_ITEM_EDIT':
      // Starting item edit always replaces current state
      // Store onCancel callback in state (no closure issues)
      newState = {
        mode: 'editing_item',
        section: action.section,
        itemIndex: action.itemIndex,
        itemId: action.itemId,
        hasChanges: false,
        onCancel: action.onCancel
      }
      console.log('✅ [STATE MACHINE] Started editing item:', { section: action.section, index: action.itemIndex })
      return newState
    
    case 'UPDATE_CHANGES':
      // Only update hasChanges if we're actively editing (not idle or discarding)
      if (isIdle(state) || isDiscarding(state)) {
        console.log('⚠️ [STATE MACHINE] Ignoring UPDATE_CHANGES (state is idle or discarding)')
        return state
      }
      // Update hasChanges for current editing state (section or item)
      newState = { ...state, hasChanges: action.hasChanges }
      console.log('📝 [STATE MACHINE] Updated hasChanges:', action.hasChanges)
      return newState
    
    case 'REQUEST_DISCARD':
      // Enter discarding mode, storing where to go after discard
      newState = {
        mode: 'discarding',
        pendingChanges: action.pendingChanges,
        targetState: action.targetState
      }
      console.log('⚠️ [STATE MACHINE] Requesting discard:', {
        sectionsToDiscard: action.pendingChanges,
        targetMode: action.targetState.mode
      })
      return newState
    
    case 'CONFIRM_DISCARD':
      // After confirming discard, transition to target state
      if (isDiscarding(state)) {
        console.log('✅ [STATE MACHINE] Discard confirmed, transitioning to:', state.targetState.mode)
        return state.targetState
      }
      // If not discarding, just go to idle
      console.log('⚠️ [STATE MACHINE] CONFIRM_DISCARD called but not in discarding mode')
      return { mode: 'idle' }
    
    case 'CANCEL_DISCARD':
      // Cancel discard and return to previous state
      if (isDiscarding(state)) {
        console.log('❌ [STATE MACHINE] Discard cancelled')
        // Extract previous state from the discard state
        // Since we don't store previous state, we go back to idle
        return { mode: 'idle' }
      }
      return state
    
    case 'CLOSE':
      // Close any editing and return to idle
      console.log('🚪 [STATE MACHINE] Closing, returning to idle')
      return { mode: 'idle' }
    
    case 'RESET':
      // Force reset to idle (for cleanup scenarios)
      console.log('🔄 [STATE MACHINE] Force reset to idle')
      return { mode: 'idle' }
    
    default:
      // TypeScript ensures we handle all cases
      return state
  }
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

  // State machine - single source of truth for editing state
  const [editingState, dispatch] = useReducer(editingStateReducer, { mode: 'idle' })
  
  // Dialog state (will be simplified in Phase 6)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingIndividualItemRegistration, setPendingIndividualItemRegistration] = useState<{
    sectionId: string
    itemIndex: number
    onCancel: () => void
    onStartEdit: () => void
  } | null>(null)
  const [pendingDiscardState, setPendingDiscardState] = useState<{
    sectionsToClose: string[]
    targetState: EditingState
  } | null>(null)
  
  // Refs to avoid stale closures in child component callbacks
  const pendingChangesRef = useRef(pendingChanges)
  const editingStateRef = useRef(editingState)
  
  // Update refs when values change
  useEffect(() => {
    pendingChangesRef.current = pendingChanges
  }, [pendingChanges])
  
  useEffect(() => {
    editingStateRef.current = editingState
  }, [editingState])

  /**
   * Callback for components to notify about unsaved changes
   * 
   * This is called by section components (e.g., SimpleFormSection, IndividualItemSection)
   * whenever data changes. It updates both:
   * 1. The useUnsavedChanges hook (for global tracking)
   * 2. The state machine's hasChanges flag (for this specific editing session)
   * 
   * @param sectionId Section identifier (e.g., 'education', 'personal_info')
   * @param hasChanges Whether the section has unsaved changes
   */
  const onUnsavedChanges = useCallback((sectionId: string, hasChanges: boolean) => {
    updatePendingChanges(sectionId, hasChanges ? { hasChanges: true } : null)
    // Update state machine hasChanges flag
    dispatch({ type: 'UPDATE_CHANGES', hasChanges })
  }, [updatePendingChanges])

  /**
   * Close the currently editing section
   * 
   * Used by auto-save sections (e.g., Skills, Professional Summary) that don't
   * need unsaved changes confirmation. For manual-save sections, use `requestSectionCancel`
   * instead, which will show a dialog if there are unsaved changes.
   */
  const handleSectionClose = useCallback(() => {
    // Use ref to get the LATEST state (avoid stale closure)
    const currentState = editingStateRef.current
    
    // Close section and clean up unsaved changes
    if (isEditingSection(currentState)) {
      stopEditing(currentState.section)
    }
    dispatch({ type: 'CLOSE' })
  }, [stopEditing])

  /**
   * Start editing a section
   * 
   * If another section/item is being edited with unsaved changes, shows a dialog.
   * Otherwise, immediately starts editing the requested section.
   * 
   * No-op if already editing an item in the same section (item editing takes precedence).
   * 
   * @param sectionType Section identifier (e.g., 'personal_info', 'education')
   */
  const handleSectionEdit = useCallback((sectionType: string) => {
    // Use refs to get the LATEST values (avoid stale closures)
    const currentPendingChanges = pendingChangesRef.current
    const currentState = editingStateRef.current
    
    console.log('🎯 [SECTION EDIT] handleSectionEdit called:', {
      requestedSection: sectionType,
      currentState: currentState.mode,
      currentSection: isEditingSection(currentState) ? currentState.section : isEditingItem(currentState) ? currentState.section : 'none'
    })
    
    console.log('📊 [SECTION EDIT] Pending changes:', Array.from(currentPendingChanges.keys()))
    
    // If we're editing an item in the same section, this is a no-op
    // Individual item editing already handles the section's editing state
    if (isEditingItem(currentState) && currentState.section === sectionType) {
      console.log('⏭️ [SECTION EDIT] No-op: already editing item in this section')
      return
    }
    
    // Check if there are ANY pending changes
    if (currentPendingChanges.size > 0) {
      console.log('⚠️ [SECTION EDIT] Has pending changes, showing dialog')
      // Show dialog to confirm discarding changes
      setPendingIndividualItemRegistration(null)
      setShowUnsavedChangesDialog(true)
      
      const sectionsToClose = Array.from(currentPendingChanges.keys())
      
      // Store the discard operation details (don't transition state yet)
      setPendingDiscardState({
        sectionsToClose,
        targetState: { mode: 'editing_section', section: sectionType, hasChanges: false }
      })
      return
    }
    
    console.log('✅ [SECTION EDIT] No pending changes, proceeding')
    
    // No pending changes - close any current editing and proceed
    if (isEditingItem(currentState)) {
      console.log('🔄 [SECTION EDIT] Canceling current item')
      // Cancel current item editing
      currentState.onCancel()
    }
    if (isEditingSection(currentState)) {
      console.log('🔄 [SECTION EDIT] Stopping current section edit')
      stopEditing(currentState.section)
    }
    
    // Start new section edit
    dispatch({ type: 'START_SECTION_EDIT', section: sectionType })
    startEditing(sectionType)
  }, [startEditing, stopEditing])

  /**
   * Request to cancel/close the currently editing section
   * 
   * Unlike `handleSectionClose`, this function checks for unsaved changes and
   * shows a confirmation dialog if any exist. Used by manual-save sections
   * (e.g., Personal Info, Why Good Fit).
   * 
   * Handles edge case: Auto-save sections that close UI but keep pending changes.
   */
  const requestSectionCancel = useCallback(() => {
    // Use refs to get the LATEST values (avoid stale closures)
    const currentPendingChanges = pendingChangesRef.current
    const currentState = editingStateRef.current
    
    console.log('🚨 [SECTION CANCEL] requestSectionCancel called:', {
      currentState: currentState.mode,
      hasChangesInState: isEditingSection(currentState) ? currentState.hasChanges : 'N/A',
      pendingChangesSize: currentPendingChanges.size
    })
    
    // Check if there are ANY pending changes (even if not editing section UI)
    // This handles auto-save sections that may have closed but still have pending changes
    if (!isEditingSection(currentState) && currentPendingChanges.size > 0) {
      const sectionsToClose = Array.from(currentPendingChanges.keys())
      console.log('📋 [SECTION CANCEL] Auto-save sections with changes:', sectionsToClose)
      setShowUnsavedChangesDialog(true)
      
      setPendingDiscardState({
        sectionsToClose,
        targetState: { mode: 'idle' }
      })
      return
    }
    
    if (!isEditingSection(currentState)) {
      console.log('✅ [SECTION CANCEL] Not editing section, closing directly')
      handleSectionClose()
      return
    }

    // Check the STATE MACHINE's hasChanges flag for the current section
    // This prevents race conditions where cleanup code clears pendingChanges before we check
    const hasCurrentSectionChanges = currentState.hasChanges

    console.log('📋 [SECTION CANCEL] Decision:', {
      section: currentState.section,
      hasChanges: hasCurrentSectionChanges,
      willShowDialog: hasCurrentSectionChanges
    })

    if (hasCurrentSectionChanges) {
      setShowUnsavedChangesDialog(true)
      
      setPendingDiscardState({
        sectionsToClose: [currentState.section],
        targetState: { mode: 'idle' }
      })
    } else {
      console.log('✅ [SECTION CANCEL] No changes, closing directly')
      handleSectionClose()
    }
  }, [handleSectionClose, stopEditing])

  /**
   * Register an individual item for editing (e.g., a Work Experience entry)
   * 
   * Flow:
   * 1. Check if another section/item has unsaved changes
   * 2. If yes and !skipDialog, show dialog and return 'dialog_shown'
   * 3. If no, immediately start editing and return 'success'
   * 
   * @param sectionId Section identifier (e.g., 'education', 'work_experience')
   * @param itemIndex Index of item in the array
   * @param onCancel Callback to call when canceling edit (e.g., setIsEditing(false))
   * @param onStartEdit Optional callback to call when edit starts (e.g., to set local edit state)
   * @param skipDialog If true, don't show dialog even if there are changes (used after confirming discard)
   * @returns 'success' if editing started, 'dialog_shown' if waiting for user confirmation
   */
  const registerIndividualItemEditing = useCallback((
    sectionId: string, 
    itemIndex: number, 
    onCancel: () => void, 
    onStartEdit?: () => void, 
    skipDialog = false
  ): 'success' | 'dialog_shown' => {
    // Use refs to get the LATEST values (avoid stale closures)
    const currentPendingChanges = pendingChangesRef.current
    const currentState = editingStateRef.current
    
    console.log('🎯 [ITEM EDIT] registerIndividualItemEditing called:', {
      section: sectionId,
      index: itemIndex,
      currentState: currentState.mode,
      skipDialog
    })
    
    console.log('📊 [ITEM EDIT] Pending changes:', Array.from(currentPendingChanges.keys()))
    
    // Check if ANY section has unsaved changes
    // Skip this check if we're explicitly skipping dialog
    if (!isEditingItem(currentState) && currentPendingChanges.size > 0 && !skipDialog) {
      console.log('⚠️ [ITEM EDIT] Has pending changes (not editing item), showing dialog')
      // Show dialog to confirm discarding changes from the section(s)
      setPendingIndividualItemRegistration({ 
        sectionId, 
        itemIndex, 
        onCancel, 
        onStartEdit: onStartEdit || (() => {}) 
      })
      setShowUnsavedChangesDialog(true)
      
      const sectionsToClose = Array.from(currentPendingChanges.keys())
      setPendingDiscardState({
        sectionsToClose,
        targetState: { 
          mode: 'editing_item', 
          section: sectionId, 
          itemIndex, 
          itemId: `${sectionId}-${itemIndex}`,
          hasChanges: false,
          onCancel
        }
      })
      return 'dialog_shown'
    }
    
    // If another item is already being edited, check for changes
    if (isEditingItem(currentState)) {
      console.log('🔄 [ITEM EDIT] Already editing another item:', {
        currentSection: currentState.section,
        currentIndex: currentState.itemIndex
      })
      
      const hasRealDataChanges = currentPendingChanges.has(currentState.section)
      console.log('📝 [ITEM EDIT] Has real data changes?', hasRealDataChanges)
      
      // Skip dialog if we're explicitly skipping dialog
      if (hasRealDataChanges && !skipDialog) {
        console.log('⚠️ [ITEM EDIT] Has changes, showing dialog')
        // Show dialog to confirm canceling current edit
        setPendingIndividualItemRegistration({ 
          sectionId, 
          itemIndex, 
          onCancel, 
          onStartEdit: onStartEdit || (() => {}) 
        })
        setShowUnsavedChangesDialog(true)
        
        setPendingDiscardState({
          sectionsToClose: [currentState.section],
          targetState: { 
            mode: 'editing_item', 
            section: sectionId, 
            itemIndex, 
            itemId: `${sectionId}-${itemIndex}`,
            hasChanges: false,
            onCancel
          }
        })
        return 'dialog_shown'
      } else {
        // No real data changes, cancel current edit silently
        console.log('✅ [ITEM EDIT] No changes, canceling current item silently')
        currentState.onCancel()
      }
    }
    
    // Close any open section editing when registering an item
    if (isEditingSection(currentState) && currentState.section !== sectionId) {
      console.log('🔄 [ITEM EDIT] Closing section edit:', currentState.section)
      stopEditing(currentState.section)
    }
    
    // Register the new edit
    const itemId = `${sectionId}-${itemIndex}`
    console.log('✅ [ITEM EDIT] Registering new item edit')
    dispatch({ 
      type: 'START_ITEM_EDIT', 
      section: sectionId, 
      itemIndex, 
      itemId,
      onCancel 
    })
    
    return 'success'
  }, [stopEditing])

  const unregisterIndividualItemEditing = useCallback((_sectionId: string, _itemIndex: number) => {
    dispatch({ type: 'CLOSE' })
  }, [])
  
  // Function to cancel individual item editing by calling the registered callback
  const cancelIndividualItemEditing = useCallback(() => {
    // Use ref to get the LATEST state (avoid stale closure)
    const currentState = editingStateRef.current
    
    if (isEditingItem(currentState)) {
      // Store the callback before clearing state
      const onCancelCallback = currentState.onCancel
      
      // Clear the global state first to prevent cascading dialogs
      dispatch({ type: 'CLOSE' })
      
      // Then call the registered cancel function
      onCancelCallback()
    }
  }, [])

  const requestIndividualItemCancel = useCallback((sectionId: string, onCancel: () => void) => {
    // Use ref to get the LATEST state (avoid stale closure)
    const currentState = editingStateRef.current
    
    console.log('🚨 [CANCEL REQUEST] requestIndividualItemCancel called:', {
      sectionId,
      currentState: currentState.mode,
      currentSection: isEditingItem(currentState) ? currentState.section : 'N/A',
      hasChangesInState: isEditingItem(currentState) ? currentState.hasChanges : 'N/A',
      isEditingItemCheck: isEditingItem(currentState),
      sectionMatchCheck: isEditingItem(currentState) ? (currentState.section === sectionId) : 'N/A'
    })
    
    // Since only one item can be edited at a time, check if this is the current edit
    if (isEditingItem(currentState) && currentState.section === sectionId) {
      // Check the STATE MACHINE's hasChanges flag, not pendingChanges
      // This prevents race conditions where cleanup code clears pendingChanges before we check
      const hasCurrentSectionChanges = currentState.hasChanges
      
      console.log('📋 [CANCEL REQUEST] Decision:', {
        hasChanges: hasCurrentSectionChanges,
        willShowDialog: hasCurrentSectionChanges
      })
      
      if (hasCurrentSectionChanges) {
        // Show confirmation dialog only if there are unsaved changes
        setShowUnsavedChangesDialog(true)
        
        setPendingDiscardState({
          sectionsToClose: [sectionId],
          targetState: { mode: 'idle' }
        })
      } else {
        // No changes, proceed with cancel immediately
        console.log('✅ [CANCEL REQUEST] No changes, cancelling directly')
        onCancel()
      }
    } else {
      // This shouldn't happen, but if it does, just cancel
      console.log('⚠️ [CANCEL REQUEST] State mismatch, cancelling directly', {
        isEditingItem: isEditingItem(currentState),
        expectedSection: sectionId,
        actualSection: isEditingItem(currentState) ? currentState.section : currentState.mode,
        fullState: currentState
      })
      onCancel()
    }
  }, [])

  // Dialog handling functions
  const handleUnsavedChangesDialogClose = useCallback(() => {
    setShowUnsavedChangesDialog(false)
    setPendingIndividualItemRegistration(null)
    setPendingDiscardState(null)
  }, [])

  const handleUnsavedChangesDialogConfirm = useCallback(() => {
    console.log('🗑️ [DIALOG] User confirmed discard')
    
    if (!pendingDiscardState) {
      console.log('⚠️ [DIALOG] No pending discard state!')
      return
    }
    
    console.log('📋 [DIALOG] Discard state:', {
      sectionsToClose: pendingDiscardState.sectionsToClose,
      targetMode: pendingDiscardState.targetState.mode
    })
    
    // Dispatch event to notify auto-save hooks that changes are being discarded
    window.dispatchEvent(new CustomEvent('is-discarding-changes', { 
      detail: { isDiscarding: true } 
    }))
    
    setShowUnsavedChangesDialog(false)
    
    // Clear pending changes for all sections being discarded
    pendingDiscardState.sectionsToClose.forEach(section => {
      stopEditing(section)
    })
    
    // Call the registered cancel function if we're editing an item
    if (isEditingItem(editingState)) {
      editingState.onCancel()
    }
    
    // Transition to target state
    if (pendingDiscardState.targetState.mode === 'idle') {
      dispatch({ type: 'CLOSE' })
    } else if (pendingDiscardState.targetState.mode === 'editing_section') {
      dispatch({ type: 'START_SECTION_EDIT', section: pendingDiscardState.targetState.section })
      startEditing(pendingDiscardState.targetState.section)
    } else if (pendingDiscardState.targetState.mode === 'editing_item') {
      dispatch({ 
        type: 'START_ITEM_EDIT', 
        section: pendingDiscardState.targetState.section,
        itemIndex: pendingDiscardState.targetState.itemIndex,
        itemId: pendingDiscardState.targetState.itemId,
        onCancel: pendingDiscardState.targetState.onCancel
      })
    }
    
    setPendingDiscardState(null)
    
    // Register the pending individual item if there is one
    if (pendingIndividualItemRegistration) {
      // Call onStartEdit to trigger the local edit mode
      if (pendingIndividualItemRegistration.onStartEdit) {
        pendingIndividualItemRegistration.onStartEdit()
      }
      setPendingIndividualItemRegistration(null)
    }
    
    // Clear the discarding event after a short delay to allow cleanup to complete
    setTimeout(() => {
      // Dispatch event to notify auto-save hooks that discarding is complete
      window.dispatchEvent(new CustomEvent('is-discarding-changes', { 
        detail: { isDiscarding: false } 
      }))
    }, 100)
  }, [pendingDiscardState, editingState, pendingIndividualItemRegistration, stopEditing, startEditing])

  // Clear all editing state (e.g., after successful save)
  const clearEditingState = useCallback(() => {
    dispatch({ type: 'RESET' })
    setPendingIndividualItemRegistration(null)
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

  // Extract values from state machine for compatibility with existing components
  const editingSection = isEditingSection(editingState) ? editingState.section : null
  const editingIndividualItem = isEditingItem(editingState) 
    ? { 
        id: editingState.itemId, 
        section: editingState.section, 
        sectionId: editingState.section, 
        data: null 
      } as EditingIndividualItem
    : null

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
    pendingNavigation: null, // No longer used - handled by state machine
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
