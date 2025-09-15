import { useState, useEffect, useCallback, useRef } from 'react'
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { CVSection, PDFCVEditorProps } from '../types'
import { AVAILABLE_SECTIONS, getSectionsInDisplayOrder } from '../constants'
import { useUnsavedChanges } from './useUnsavedChanges'

interface EditingIndividualItem {
  sectionId: string
  itemIndex: number
}

export const usePDFCVEditor = ({ cvData, onUpdateCV, onSave }: PDFCVEditorProps) => {
  // Unsaved changes tracking
  const {
    hasUnsavedChanges,
    editingSections,
    pendingChanges,
    startEditing,
    stopEditing,
    updatePendingChanges
  } = useUnsavedChanges()

  // State ref to hold latest values for callbacks, preventing stale closures
  const stateRef = useRef({
    editingIndividualItem: null as EditingIndividualItem | null,
    onCancel: (() => {}) as () => void
  })

  // Single callback that works for any section
  const onUnsavedChanges = useCallback((sectionId: string, hasChanges: boolean) => {
    updatePendingChanges(sectionId, hasChanges ? { hasChanges: true } : null)
  }, [updatePendingChanges])

  // Function to create sections dynamically based on CV data
  const createSectionsFromCVData = (cvData: any): CVSection[] => {
    if (!cvData) return []
    
    const sections: CVSection[] = []
    let order = 0
    
    // Get sections that have data in the CV
    const sectionsWithData = getSectionsInDisplayOrder(
      AVAILABLE_SECTIONS.filter(section => {
        const data = cvData[section.id]
        return data && (
          (Array.isArray(data) && data.length > 0) ||
          (typeof data === 'object' && Object.keys(data).length > 0)
        )
      }).map(s => s.id)
    )
    
    sectionsWithData.forEach(sectionDef => {
      sections.push({
        id: sectionDef.id,
        type: sectionDef.id as CVSection['type'],
        title: sectionDef.name,
        visible: true,
        order: order++
      })
    })
    
    return sections
  }

  // Initialize sections from CV data or use defaults
  const [sections, setSections] = useState<CVSection[]>(() => {
    if (cvData?.section_config?.sections) {
      return cvData.section_config.sections
    }
    return createSectionsFromCVData(cvData)
  })
  
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [editingIndividualItem, setEditingIndividualItem] = useState<EditingIndividualItem | null>(null)
  const [pendingIndividualItemRegistration, setPendingIndividualItemRegistration] = useState<{ sectionId: string; itemIndex: number; onCancel: () => void; onStartEdit: () => void } | null>(null)
  
  // Update stateRef with latest values to prevent stale closures
  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      editingIndividualItem
    }
  }, [editingIndividualItem])
  

  // Update sections when cvData changes
  useEffect(() => {
    if (cvData?.section_config?.sections) {
      setSections(cvData.section_config.sections)
    } else if (cvData) {
      // If no section config, create sections from CV data
      const newSections = createSectionsFromCVData(cvData)
      setSections(newSections)
      // Save the section configuration
      if (newSections.length > 0) {
        saveSectionConfig(newSections)
      }
    }
  }, [cvData])

  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Handle escape key to close edit forms
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (editingSection || editingIndividualItem)) {
        event.preventDefault()
        
        // Handle IndividualItemSection editing
        if (editingIndividualItem) {
          const hasCurrentSectionChanges = pendingChanges.has(editingIndividualItem.sectionId)
          
          if (hasCurrentSectionChanges) {
            // Show unsaved changes dialog
            setShowUnsavedChangesDialog(true)
            setPendingNavigation(() => () => {
              stateRef.current.onCancel()
              setEditingIndividualItem(null)
            })
          } else {
            // No changes, close immediately
            stateRef.current.onCancel()
            setEditingIndividualItem(null)
          }
        }
        // Handle regular section editing
        else if (editingSection) {
          const hasCurrentSectionChanges = pendingChanges.has(editingSection)
          
          if (hasCurrentSectionChanges) {
            // Show unsaved changes dialog
            setShowUnsavedChangesDialog(true)
            setPendingNavigation(() => () => {
              handleSectionClose()
            })
          } else {
            // No changes, close immediately
            handleSectionClose()
          }
        }
      }
    }

    // Use capture phase to catch events before other handlers
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editingSection, editingIndividualItem, pendingChanges])

  // Function to save section configuration
  const saveSectionConfig = (updatedSections: CVSection[], message?: string) => {
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: updatedSections
      }
    }
    onUpdateCV(updatedCvData)
    onSave(updatedCvData, message)
  }

  // Function to handle section editing - closes other sections
  const handleSectionEdit = (sectionType: string) => {
    setEditingSection(sectionType)
    startEditing(sectionType)
  }

  // Function to handle section close
  const handleSectionClose = () => {
    if (editingSection) {
      stopEditing(editingSection)
    }
    setEditingSection(null)
  }

  // Request to cancel editing a section (from UI cancel button). If there are
  // unsaved changes in the current section, show the dialog first.
  const requestSectionCancel = useCallback(() => {
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
  }, [editingSection])

  // Handle unsaved changes dialog
  const handleUnsavedChangesDialogClose = () => {
    setShowUnsavedChangesDialog(false)
    setPendingNavigation(null)
    setPendingIndividualItemRegistration(null)
  }

  const handleUnsavedChangesDialogConfirm = () => {
    setShowUnsavedChangesDialog(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
    // Register the pending individual item if there is one
    if (pendingIndividualItemRegistration) {
      setEditingIndividualItem({ sectionId: pendingIndividualItemRegistration.sectionId, itemIndex: pendingIndividualItemRegistration.itemIndex })
      stateRef.current.onCancel = pendingIndividualItemRegistration.onCancel
      // Call onStartEdit to trigger the local edit mode
      if (pendingIndividualItemRegistration.onStartEdit) {
        pendingIndividualItemRegistration.onStartEdit()
      }
      setPendingIndividualItemRegistration(null)
    }
  }

  // Functions to manage IndividualItemSection editing state
  const registerIndividualItemEditing = useCallback((sectionId: string, itemIndex: number, onCancel: () => void, onStartEdit?: () => void, skipDialog = false): 'success' | 'dialog_shown' => {
    const currentEditingItem = stateRef.current.editingIndividualItem
    
    // If another item is already being edited, cancel it first
    if (currentEditingItem) {
      // Check if there are actual data changes in the current edit
      const hasRealDataChanges = pendingChanges.has(currentEditingItem.sectionId)
      
      if (hasRealDataChanges && !skipDialog) {
        // Show dialog to confirm canceling current edit
        setPendingIndividualItemRegistration({ sectionId, itemIndex, onCancel, onStartEdit: onStartEdit || (() => {}) })
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
    setEditingIndividualItem({ sectionId, itemIndex })
    stateRef.current.onCancel = onCancel
    return 'success'
  }, [pendingChanges])

  const unregisterIndividualItemEditing = useCallback(() => {
    setEditingIndividualItem(null)
    stateRef.current.onCancel = () => {}
  }, [])

  // Request cancel for an individual item edit within a section
  const requestIndividualItemCancel = useCallback((sectionId: string, onCancel: () => void) => {
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        
        const newSections = arrayMove(items, oldIndex, newIndex)
        // Update order property
        const updatedSections = newSections.map((section, index) => ({
          ...section,
          order: index
        }))
        
        // Save section configuration
        saveSectionConfig(updatedSections, 'Section order updated')
        
        return updatedSections
      })
    }

    setActiveId(null)
  }

  const toggleSectionVisibility = (sectionId: string) => {
    const updatedSections = sections.map(section => 
      section.id === sectionId 
        ? { ...section, visible: !section.visible }
        : section
    )
    setSections(updatedSections)
    saveSectionConfig(updatedSections, 'Section visibility updated')
  }

  const resetToDefaultOrder = () => {
    const defaultSections = createSectionsFromCVData(cvData)
    setSections(defaultSections)
    setShowResetDialog(false)
    saveSectionConfig(defaultSections, 'Section order reset to default')
  }

  const handleResetClick = () => {
    setShowResetDialog(true)
  }

  const addNewSection = (sectionId: string) => {
    const sectionDef = AVAILABLE_SECTIONS.find(s => s.id === sectionId)
    if (!sectionDef) return

    const newSection: CVSection = {
      id: sectionId,
      type: sectionId as CVSection['type'],
      title: sectionDef.name,
      visible: true,
      order: sections.length
    }

    const updatedSections = [...sections, newSection]
    setSections(updatedSections)
    saveSectionConfig(updatedSections, `${sectionDef.name} section added`)
  }

  const removeSection = (sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId)
    // Update order property
    const reorderedSections = updatedSections.map((section, index) => ({
      ...section,
      order: index
    }))
    setSections(reorderedSections)
    saveSectionConfig(reorderedSections, 'Section removed')
  }

  const getAvailableSectionsToAdd = () => {
    const existingSectionIds = sections.map(s => s.id)
    return AVAILABLE_SECTIONS.filter(section => !existingSectionIds.includes(section.id))
  }

  const isDefaultOrder = () => {
    const defaultSections = createSectionsFromCVData(cvData)
    return sections.every((section, index) => 
      defaultSections[index] && section.id === defaultSections[index].id && section.order === index
    )
  }

  return {
    // State
    sections,
    activeId,
    showResetDialog,
    editingSection,
    showUnsavedChangesDialog,
    hasUnsavedChanges,
    editingSections,
    pendingChanges,
    onUnsavedChanges,
    editingIndividualItem,
    
    // Actions
    handleSectionEdit,
    handleSectionClose,
    requestSectionCancel,
    handleDragStart,
    handleDragEnd,
    toggleSectionVisibility,
    resetToDefaultOrder,
    handleResetClick,
    addNewSection,
    removeSection,
    handleUnsavedChangesDialogClose,
    handleUnsavedChangesDialogConfirm,
    setShowResetDialog,
    registerIndividualItemEditing,
    unregisterIndividualItemEditing,
    requestIndividualItemCancel,
    
    // Computed values
    getAvailableSectionsToAdd,
    isDefaultOrder
  }
}
