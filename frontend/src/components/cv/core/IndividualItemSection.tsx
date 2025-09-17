import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Typography, IconButton, Tooltip, MenuItem, Menu } from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, KeyboardArrowUp as ArrowUpIcon, KeyboardArrowDown as ArrowDownIcon, DragIndicator as DragIcon, Sort as SortIcon } from '@mui/icons-material'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import BaseSection from './BaseSection'

interface SortOption<T> {
  field: keyof T
  label: string
}

interface IndividualItemSectionProps<T> {
  data: T[]
  onUpdate: (data: T[]) => void
  onSave: (data: T[], message?: string) => Promise<void>
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  onUnsavedChanges?: (sectionId: string, hasChanges: boolean) => void
  title: string
  emptyMessage: string
  createNewItem: () => T
  requiredFields: (keyof T)[]
  renderItemForm: (item: T, index: number, updateItem: (field: keyof T, value: any) => void) => React.ReactNode
  renderItemDisplay: (item: T, index: number) => React.ReactNode
  autoSaveMessage: string
  registerIndividualItemEditing?: (sectionId: string, itemIndex: number, onCancel: () => void, onStartEdit?: () => void) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing?: () => void
  requestIndividualItemCancel?: (sectionId: string, onCancel: () => void) => void
  isAnotherItemBeingEdited?: boolean
  sortOptions?: SortOption<T>[]
}

/**
 * Section component where each item can be edited independently
 * Each item has its own edit button and form state
 */
function IndividualItemSection<T>({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title,
  emptyMessage,
  createNewItem,
  requiredFields,
  renderItemForm,
  renderItemDisplay,
  autoSaveMessage,
  registerIndividualItemEditing,
  unregisterIndividualItemEditing,
  requestIndividualItemCancel,
  isAnotherItemBeingEdited = false,
  sortOptions = []
}: IndividualItemSectionProps<T>) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<T | null>(null)
  const [itemsData, setItemsData] = useState<T[]>((data as T[]) || [])
  const editingItemIndexRef = useRef<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  // Initialize sort state from localStorage or defaults
  const getSectionId = useCallback((title: string): string => {
    const sectionIdMap: Record<string, string> = {
      'Awards & Recognition': 'awards',
      'Certifications': 'certifications',
      'Education': 'education',
      'Projects': 'projects',
      'Publications': 'publications',
      'Volunteer Experience': 'volunteer_experience',
      'Work Experience': 'work_experience'
    }
    return sectionIdMap[title] || title.toLowerCase().replace(/\s+/g, '_')
  }, [])

  const sectionId = getSectionId(title)
  
  const [sortField, setSortField] = useState<keyof T | ''>(() => {
    const saved = localStorage.getItem(`cv_sort_${sectionId}_field`)
    return (saved as keyof T) || ''
  })
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem(`cv_sort_${sectionId}_direction`)
    return (saved as 'asc' | 'desc') || 'desc'
  })
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)

  useEffect(() => {
    // Only sync with parent data if we're not currently reordering manually
    if (!isReordering) {
      let newData = (data as T[]) || []
      
      // Apply persisted sort if it exists
      if (sortField && newData.length > 0) {
        newData = [...newData].sort((a, b) => {
          const dateA = parseDate(String(a[sortField] || ''))
          const dateB = parseDate(String(b[sortField] || ''))
          
          const comparison = dateA.getTime() - dateB.getTime()
          return sortDirection === 'asc' ? comparison : -comparison
        })
      }
      
      setItemsData(newData)
    }
  }, [data, sortField, sortDirection, isReordering])

  const handleEditItem = (index: number) => {
    const sectionId = getSectionId(title)
    
    // Register with global editing state for escape key handling first
    if (registerIndividualItemEditing) {
      
      // Create a callback to start editing this specific item
      const onStartEdit = () => {
        setEditingItemIndex(index)
        editingItemIndexRef.current = index
        setEditData({ ...itemsData[index] })
        onEdit()
      }
      
      // Try to register - this might show a dialog if there are unsaved changes
      const registrationResult = registerIndividualItemEditing(sectionId, index, handleCancelEdit, onStartEdit)
      
      // Only set local state if registration was successful (no dialog shown)
      // If a dialog is shown, onStartEdit will be called when user clicks "Discard Changes"
      if (registrationResult !== 'dialog_shown') {
        setEditingItemIndex(index)
        editingItemIndexRef.current = index
        setEditData({ ...itemsData[index] })
        onEdit()
      }
    } else {
      // Fallback if registerIndividualItemEditing is not available
      setEditingItemIndex(index)
      editingItemIndexRef.current = index
      setEditData({ ...itemsData[index] })
      onEdit()
    }
  }

  const handleSaveItem = () => {
    if (editingItemIndex !== null && editData) {
      let newData = [...itemsData]
      
      // Check if we're adding a new item (editingItemIndex >= current array length)
      if (editingItemIndex >= itemsData.length) {
        // Adding a new item
        newData.push(editData) // Add to end first
        
        // If there's an active sort, re-sort the data to place the new item correctly
        if (sortField) {
          newData = newData.sort((a, b) => {
            const dateA = parseDate(String(a[sortField] || ''))
            const dateB = parseDate(String(b[sortField] || ''))
            
            const comparison = dateA.getTime() - dateB.getTime()
            return sortDirection === 'asc' ? comparison : -comparison
          })
        }
      } else {
        // Editing an existing item - update at the index
        newData[editingItemIndex] = editData
        
        // If there's an active sort, re-sort the data in case the edited field affects sort order
        if (sortField) {
          newData = newData.sort((a, b) => {
            const dateA = parseDate(String(a[sortField] || ''))
            const dateB = parseDate(String(b[sortField] || ''))
            
            const comparison = dateA.getTime() - dateB.getTime()
            return sortDirection === 'asc' ? comparison : -comparison
          })
        }
      }
      
      setItemsData(newData)
      onUpdate(newData)
      onSave(newData, editingItemIndex >= itemsData.length ? `${autoSaveMessage} added` : `${autoSaveMessage} updated`)
    }
    handleCancelEdit(true) // Pass true to indicate this is a save operation
  }

  const handleCancelEdit = useCallback((isSave = false) => {
    const sectionId = getSectionId(title)
    
    setEditingItemIndex(null)
    editingItemIndexRef.current = null
    setEditData(null)
    
    // Clear unsaved changes
    if (onUnsavedChanges) {
      onUnsavedChanges(sectionId, false)
    }
    
    // Unregister from global editing state
    if (unregisterIndividualItemEditing) {
      unregisterIndividualItemEditing()
    }
    
    // Only call onClose if this is not a save operation
    // During save, we don't want to trigger the unsaved changes dialog
    if (!isSave) {
      onClose()
    }
  }, [onUnsavedChanges, unregisterIndividualItemEditing, onClose, title, getSectionId])


  const handleDeleteItem = (index: number) => {
    const newData = itemsData.filter((_, i) => i !== index)
    setItemsData(newData)
    onUpdate(newData)
    onSave(newData, `${autoSaveMessage} deleted`)
  }

  const handleAddItem = () => {
    const newItem = createNewItem()
    const newIndex = itemsData.length  // This will be >= itemsData.length, indicating a new item
    // Don't add to itemsData yet - only add when saved
    setEditingItemIndex(newIndex)
    setEditData(newItem)
    onEdit()
    
    // Register with global editing state for escape key handling
    if (registerIndividualItemEditing) {
      const sectionId = getSectionId(title)
      
      // Create a callback to start editing this specific item
      const onStartEdit = () => {
        setEditingItemIndex(newIndex)
        editingItemIndexRef.current = newIndex
        setEditData(newItem)
        onEdit()
      }
      
      registerIndividualItemEditing(sectionId, newIndex, handleCancelEdit, onStartEdit)
    }
  }

  const handleUpdateItem = (field: keyof T, value: any) => {
    if (editData) {
      const sectionId = getSectionId(title)
      const newEditData = { ...editData, [field]: value }
      
      // Track unsaved changes BEFORE setting state
      if (onUnsavedChanges) {
        let hasChanges: boolean
        
        if (editingItemIndex !== null && editingItemIndex >= itemsData.length) {
          // For new items, check if the form has any non-empty values
          hasChanges = Object.values(newEditData).some(value => 
            value !== undefined && value !== null && value !== ''
          )
        } else {
          // For existing items, compare with original data
          hasChanges = JSON.stringify(newEditData) !== JSON.stringify(itemsData[editingItemIndex!])
        }
        
        onUnsavedChanges(sectionId, hasChanges)
      }
      
      setEditData(newEditData)
    }
  }

  // Helper function to convert plural titles to singular
  const getSingularTitle = (pluralTitle: string): string => {
    const titleMap: Record<string, string> = {
      'Work Experience': 'Work Experience',
      'Education': 'Education',
      'Projects': 'Project',
      'Awards': 'Award',
      'Certifications': 'Certification',
      'Publications': 'Publication',
      'Volunteer Experience': 'Volunteer Experience',
      'Skills': 'Skill'
    }
    
    return titleMap[pluralTitle] || pluralTitle.slice(0, -1)
  }

  // Validate if current edit form is valid
  const isEditFormValid = (): boolean => {
    if (!editData) return false
    return requiredFields.every(field => {
      const value = editData[field]
      return value !== undefined && value !== null && value !== ''
    })
  }

  // Handle drag start
  const handleDragStart = () => {
    setIsReordering(true)
  }

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      setIsReordering(false)
      return
    }

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) {
      setIsReordering(false)
      return
    }

    // Clear any active sorting to switch to manual mode
    if (sortField) {
      setSortField('')
      localStorage.removeItem(`cv_sort_${sectionId}_field`)
      localStorage.removeItem(`cv_sort_${sectionId}_direction`)
    }

    // Immediately update the data without transitions
    const newData = [...itemsData]
    const [reorderedItem] = newData.splice(sourceIndex, 1)
    newData.splice(destinationIndex, 0, reorderedItem)

    setItemsData(newData)
    onUpdate(newData)
    onSave(newData, `${autoSaveMessage} reordered`)
    
    // Small delay before enabling transitions to prevent snapback
    setTimeout(() => setIsReordering(false), 50)
  }

  // Handle manual reordering with up/down arrows
  const handleMoveUp = (index: number) => {
    if (index === 0) return // Already at top
    
    // Clear any active sorting to switch to manual mode
    if (sortField) {
      setSortField('')
      localStorage.removeItem(`cv_sort_${sectionId}_field`)
      localStorage.removeItem(`cv_sort_${sectionId}_direction`)
    }
    
    // Disable transitions for instant movement
    setIsReordering(true)
    
    const newData = [...itemsData]
    const [item] = newData.splice(index, 1)
    newData.splice(index - 1, 0, item)

    setItemsData(newData)
    onUpdate(newData)
    onSave(newData, `${autoSaveMessage} moved up`)
    
    // Keep transitions disabled for arrow movements
    setTimeout(() => setIsReordering(false), 10)
  }

  const handleMoveDown = (index: number) => {
    if (index === itemsData.length - 1) return // Already at bottom
    
    // Clear any active sorting to switch to manual mode
    if (sortField) {
      setSortField('')
      localStorage.removeItem(`cv_sort_${sectionId}_field`)
      localStorage.removeItem(`cv_sort_${sectionId}_direction`)
    }
    
    // Disable transitions for instant movement
    setIsReordering(true)
    
    const newData = [...itemsData]
    const [item] = newData.splice(index, 1)
    newData.splice(index + 1, 0, item)

    setItemsData(newData)
    onUpdate(newData)
    onSave(newData, `${autoSaveMessage} moved down`)
    
    // Keep transitions disabled for arrow movements
    setTimeout(() => setIsReordering(false), 10)
  }

  // Parse date string to Date object for comparison
  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(0) // Treat empty dates as oldest
    
    // Handle various date formats (YYYY-MM-DD, YYYY-MM, YYYY)
    const cleanDate = dateStr.replace(/[^\d-]/g, '') // Remove non-date characters
    
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(cleanDate)
    } else if (cleanDate.match(/^\d{4}-\d{2}$/)) {
      return new Date(`${cleanDate}-01`)
    } else if (cleanDate.match(/^\d{4}$/)) {
      return new Date(`${cleanDate}-01-01`)
    }
    
    return new Date(cleanDate) || new Date(0)
  }

  // Sort items by selected date field
  const handleSort = (field: keyof T, direction: 'asc' | 'desc') => {
    const sortedData = [...itemsData].sort((a, b) => {
      const dateA = parseDate(String(a[field] || ''))
      const dateB = parseDate(String(b[field] || ''))
      
      const comparison = dateA.getTime() - dateB.getTime()
      return direction === 'asc' ? comparison : -comparison
    })

    setItemsData(sortedData)
    onUpdate(sortedData)
    onSave(sortedData, `${autoSaveMessage} sorted by ${String(field)}`)
    setSortField(field)
    setSortDirection(direction)
    
    // Save sort preferences to localStorage
    localStorage.setItem(`cv_sort_${sectionId}_field`, String(field))
    localStorage.setItem(`cv_sort_${sectionId}_direction`, direction)
  }


  return (
    <BaseSection
      title={title}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onSave={undefined}
      onCancel={undefined}
      isValid={true}
      headerActions={
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {/* Sort controls - only show if there are sort options and multiple items */}
          {sortOptions.length > 0 && itemsData.length > 1 && editingItemIndex === null && (
            <>
              <Tooltip title={
                sortField 
                  ? `Sorted by ${sortOptions.find(opt => opt.field === sortField)?.label} (${sortDirection === 'desc' ? 'newest first' : 'oldest first'}). Click for options.`
                  : "Sort options"
              }>
                <IconButton
                  onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                  sx={{
                    bgcolor: sortField ? '#e3f2fd' : 'white',
                    boxShadow: 1, 
                    transition: 'all 0.2s ease',
                    color: sortField ? '#1976d2' : 'inherit',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 2,
                      bgcolor: sortField ? '#bbdefb' : '#f5f5f5'
                    }
                  }}
                  size="small"
                >
                  <SortIcon 
                    fontSize="small" 
                    sx={{ 
                      transform: sortField && sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={sortMenuAnchor}
                open={Boolean(sortMenuAnchor)}
                onClose={() => setSortMenuAnchor(null)}
                PaperProps={{
                  sx: { mt: 1, minWidth: 200 }
                }}
              >
                <MenuItem
                  onClick={() => {
                    setSortField('')
                    setSortDirection('desc')
                    setItemsData([...data as T[]])
                    onUpdate(data as T[])
                    setSortMenuAnchor(null)
                    // Clear persisted sort state
                    localStorage.removeItem(`cv_sort_${sectionId}_field`)
                    localStorage.removeItem(`cv_sort_${sectionId}_direction`)
                  }}
                  selected={!sortField}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DragIcon fontSize="small" />
                    Manual order
                  </Box>
                </MenuItem>
                
                {sortOptions.map((option) => (
                  <Box key={String(option.field)}>
                    <MenuItem
                      onClick={() => {
                        handleSort(option.field, 'desc')
                        setSortMenuAnchor(null)
                      }}
                      selected={sortField === option.field && sortDirection === 'desc'}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SortIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                        {option.label} (Newest first)
                      </Box>
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleSort(option.field, 'asc')
                        setSortMenuAnchor(null)
                      }}
                      selected={sortField === option.field && sortDirection === 'asc'}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SortIcon fontSize="small" />
                        {option.label} (Oldest first)
                      </Box>
                    </MenuItem>
                  </Box>
                ))}
              </Menu>
            </>
          )}
          
          {/* Add button - always show when not editing an item */}
          {editingItemIndex === null && (
            <Tooltip title={isAnotherItemBeingEdited ? "Finish editing the current item first" : `Add new ${getSingularTitle(title).toLowerCase()}`}>
              <span>
                <IconButton
                  onClick={handleAddItem}
                  disabled={isAnotherItemBeingEdited}
                  sx={{
                    opacity: isAnotherItemBeingEdited ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                    bgcolor: 'white',
                    boxShadow: 1
                  }}
                  size="small"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      }
      editButton={
        editingItemIndex !== null ? (
          <Tooltip title="Cancel editing">
            <span style={{ position: 'absolute', top: 0, right: 0 }}>
              <IconButton
                onClick={() => {
                  const sectionId = getSectionId(title)
                  if (typeof requestIndividualItemCancel === 'function') {
                    requestIndividualItemCancel(sectionId, handleCancelEdit)
                  } else {
                    handleCancelEdit()
                  }
                }}
                sx={{
                  opacity: 1,
                  transition: 'opacity 0.2s',
                  bgcolor: 'white',
                  boxShadow: 1
                }}
                size="small"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          // Return empty span to prevent BaseSection from showing default edit button
          <span style={{ display: 'none' }} />
        )
      }
    >
      {itemsData.length === 0 && editingItemIndex === null ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* Handle new item form - when editingItemIndex >= itemsData.length - Show at TOP */}
          {editingItemIndex !== null && editingItemIndex >= itemsData.length && editData && (
            <Box
              sx={{
                position: 'relative',
                mb: 0.25,
                p: 1,
                border: '1px solid #e0e0e0',
                borderRadius: 1
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -8, right: -8, display: 'flex', gap: 0.5, zIndex: 1 }}>
                  <Tooltip title="Save changes">
                    <span>
                      <IconButton
                        onClick={handleSaveItem}
                        disabled={!isEditFormValid()}
                        sx={{
                          bgcolor: 'white',
                          boxShadow: 1,
                          '&:disabled': {
                            opacity: 0.5
                          }
                        }}
                        size="small"
                      >
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Cancel editing">
                    <IconButton
                      onClick={() => {
                        const sectionId = getSectionId(title)
                        if (typeof requestIndividualItemCancel === 'function') {
                          requestIndividualItemCancel(sectionId, handleCancelEdit)
                        } else {
                          handleCancelEdit()
                        }
                      }}
                      sx={{
                        bgcolor: 'white',
                        boxShadow: 1
                      }}
                      size="small"
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {renderItemForm(editData, editingItemIndex, handleUpdateItem)}
              </Box>
            </Box>
          )}

          {/* Drag and Drop Context for reordering existing items */}
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Droppable droppableId="items">
              {(provided) => (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {itemsData.map((item, index) => (
                    <Draggable
                      key={`item-${index}`}
                      draggableId={`item-${index}`}
                      index={index}
                      isDragDisabled={editingItemIndex !== null}
                    >
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="individual-item-container"
                          sx={{
                            position: 'relative',
                            mb: 0.25,
                            p: 1,
                            border: snapshot.isDragging ? '1px solid #1976d2' : '1px solid transparent',
                            borderRadius: 1,
                            transition: isReordering ? 'none' : 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                            transform: snapshot.isDragging ? 'scale(1.02) rotate(1deg)' : 'scale(1) rotate(0deg)',
                            backgroundColor: snapshot.isDragging ? '#f5f5f5' : 'transparent',
                            boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                            zIndex: snapshot.isDragging ? 1000 : 'auto',
                            '&:hover': {
                              border: editingItemIndex === null ? '1px solid #e0e0e0' : '1px solid transparent',
                              transform: editingItemIndex === null && !snapshot.isDragging ? 'translateY(-1px)' : 'scale(1) rotate(0deg)',
                              boxShadow: editingItemIndex === null && !snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : undefined,
                              '& .reorder-control': { opacity: 1, visibility: 'visible' },
                              '& .item-action-button': { opacity: 1 }
                            },
                            '& .reorder-control': {
                              opacity: 0,
                              visibility: 'hidden',
                              transition: 'opacity 0.2s ease, visibility 0.2s ease'
                            }
                          }}
                        >
                          {editingItemIndex === index && editData ? (
                            // Show edit form for this item
                            <Box>
                              <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 0.5, zIndex: 1 }}>
                                <Tooltip title="Save changes">
                                  <span>
                                    <IconButton
                                      onClick={handleSaveItem}
                                      disabled={!isEditFormValid()}
                                      sx={{
                                        bgcolor: 'white',
                                        boxShadow: 1,
                                        '&:disabled': {
                                          opacity: 0.5
                                        }
                                      }}
                                      size="small"
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Cancel editing">
                                  <IconButton
                                    onClick={() => {
                                      const sectionId = getSectionId(title)
                                      if (typeof requestIndividualItemCancel === 'function') {
                                        requestIndividualItemCancel(sectionId, handleCancelEdit)
                                      } else {
                                        handleCancelEdit()
                                      }
                                    }}
                                    sx={{
                                      bgcolor: 'white',
                                      boxShadow: 1
                                    }}
                                    size="small"
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              {renderItemForm(editData, index, handleUpdateItem)}
                            </Box>
                          ) : (
                            // Show display view for this item
                            <Box>
                              {/* Action buttons - always in top right */}
                              <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 0.5, zIndex: 1 }}>
                                <Tooltip title={`Delete this ${getSingularTitle(title).toLowerCase()}`}>
                                  <IconButton
                                    onClick={() => handleDeleteItem(index)}
                                    className="item-action-button"
                                    sx={{ 
                                      color: 'text.secondary',
                                      bgcolor: 'transparent',
                                      opacity: 0.3,
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        color: 'error.main',
                                        bgcolor: 'rgba(255, 235, 238, 0.5)',
                                        opacity: 1
                                      }
                                    }}
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={isAnotherItemBeingEdited ? "Finish editing the current item first" : `Edit this ${getSingularTitle(title).toLowerCase()}`}>
                                  <span>
                                    <IconButton
                                      onClick={() => handleEditItem(index)}
                                      disabled={isAnotherItemBeingEdited}
                                      className="item-action-button"
                                      sx={{
                                        opacity: isAnotherItemBeingEdited ? 0.5 : 0.3,
                                        color: 'text.secondary',
                                        bgcolor: 'transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover:not(:disabled)': {
                                          color: 'primary.main',
                                          bgcolor: 'rgba(227, 242, 253, 0.5)',
                                          opacity: 1
                                        }
                                      }}
                                      size="small"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>

                              {/* Reordering controls - vertically aligned on left edge */}
                              {itemsData.length > 1 && editingItemIndex === null && (
                                <>
                                  {/* Up arrow - upper left corner */}
                                  <IconButton
                                    className="reorder-control"
                                    onClick={() => handleMoveUp(index)}
                                    disabled={index === 0}
                                    sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      bgcolor: 'white',
                                      boxShadow: 1,
                                      opacity: index === 0 ? 0.3 : 'inherit',
                                      transition: 'all 0.2s ease',
                                      zIndex: 2,
                                      '&:hover:not(:disabled)': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: 2
                                      }
                                    }}
                                    size="small"
                                  >
                                    <ArrowUpIcon fontSize="small" />
                                  </IconButton>

                                  {/* Drag handle - middle left edge */}
                                  <Box
                                    {...provided.dragHandleProps}
                                    className="reorder-control"
                                    sx={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: 0,
                                      transform: 'translateY(-50%)',
                                      zIndex: 2,
                                      cursor: 'grab',
                                      '&:active': {
                                        cursor: 'grabbing'
                                      }
                                    }}
                                  >
                                    <Tooltip title="Drag to reorder">
                                      <IconButton
                                        sx={{
                                          bgcolor: 'white',
                                          boxShadow: 1,
                                          color: '#666',
                                          transition: 'all 0.2s ease',
                                          cursor: 'grab',
                                          '&:hover': {
                                            transform: 'scale(1.1)',
                                            boxShadow: 2,
                                            bgcolor: '#f5f5f5',
                                            color: '#333'
                                          },
                                          '&:active': {
                                            cursor: 'grabbing',
                                            transform: 'scale(0.95)'
                                          }
                                        }}
                                        size="small"
                                      >
                                        <DragIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>

                                  {/* Down arrow - lower left corner */}
                                  <IconButton
                                    className="reorder-control"
                                    onClick={() => handleMoveDown(index)}
                                    disabled={index === itemsData.length - 1}
                                    sx={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      bgcolor: 'white',
                                      boxShadow: 1,
                                      opacity: index === itemsData.length - 1 ? 0.3 : 'inherit',
                                      transition: 'all 0.2s ease',
                                      zIndex: 2,
                                      '&:hover:not(:disabled)': {
                                        transform: 'translateY(1px)',
                                        boxShadow: 2
                                      }
                                    }}
                                    size="small"
                                  >
                                    <ArrowDownIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                              
                              <Box sx={{ 
                                pl: itemsData.length > 1 && editingItemIndex === null ? 5 : 0,
                                transition: 'padding-left 0.3s ease'
                              }}>
                                {renderItemDisplay(item, index)}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      )}
    </BaseSection>
  )
}

export default IndividualItemSection
