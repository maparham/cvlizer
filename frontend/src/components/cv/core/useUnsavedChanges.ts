import { useState, useCallback, useEffect } from 'react'

interface UnsavedChangesState {
  hasUnsavedChanges: boolean
  editingSections: Set<string>
  pendingChanges: Map<string, any>
}

export const useUnsavedChanges = () => {
  const [state, setState] = useState<UnsavedChangesState>(() => {
    return {
      hasUnsavedChanges: false,
      editingSections: new Set(),
      pendingChanges: new Map()
    }
  })

  // Track when a section starts editing
  const startEditing = useCallback((sectionId: string) => {
    setState(prev => ({
      ...prev,
      editingSections: new Set([...prev.editingSections, sectionId])
    }))
  }, [])

  // Track when a section stops editing
  const stopEditing = useCallback((sectionId: string) => {
    setState(prev => {
      const newEditingSections = new Set(prev.editingSections)
      newEditingSections.delete(sectionId)
      
      const newPendingChanges = new Map(prev.pendingChanges)
      newPendingChanges.delete(sectionId)
      
      return {
        ...prev,
        editingSections: newEditingSections,
        pendingChanges: newPendingChanges,
        // Only consider actual pending changes as unsaved changes
        hasUnsavedChanges: newPendingChanges.size > 0
      }
    })
  }, [])

  // Track pending changes in a section
  const updatePendingChanges = useCallback((sectionId: string, changes: any) => {
    setState(prev => {
      const newPendingChanges = new Map(prev.pendingChanges)
      if (changes && Object.keys(changes).length > 0) {
        newPendingChanges.set(sectionId, changes)
      } else {
        newPendingChanges.delete(sectionId)
      }
      
      return {
        ...prev,
        pendingChanges: newPendingChanges,
        // Only consider actual pending changes as unsaved changes
        hasUnsavedChanges: newPendingChanges.size > 0
      }
    })
  }, [])

  // Clear all unsaved changes (e.g., after successful save)
  const clearUnsavedChanges = useCallback(() => {
    setState({
      hasUnsavedChanges: false,
      editingSections: new Set(),
      pendingChanges: new Map()
    })
  }, [])

  // Check if a specific section has unsaved changes
  const hasSectionUnsavedChanges = useCallback((sectionId: string) => {
    return state.editingSections.has(sectionId) || state.pendingChanges.has(sectionId)
  }, [state.editingSections, state.pendingChanges])

  return {
    hasUnsavedChanges: state.hasUnsavedChanges,
    editingSections: state.editingSections,
    pendingChanges: state.pendingChanges,
    startEditing,
    stopEditing,
    updatePendingChanges,
    clearUnsavedChanges,
    hasSectionUnsavedChanges
  }
}
