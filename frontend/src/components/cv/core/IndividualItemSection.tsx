import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { SectionProps } from '../types'
import BaseSection from './BaseSection'

interface IndividualItemSectionProps<T> extends SectionProps {
  title: string
  emptyMessage: string
  createNewItem: () => T
  requiredFields: (keyof T)[]
  renderItemForm: (item: T, index: number, updateItem: (field: keyof T, value: any) => void) => React.ReactNode
  renderItemDisplay: (item: T, index: number) => React.ReactNode
  autoSaveMessage: string
  registerIndividualItemEditing?: (sectionId: string, itemIndex: number, onCancel: () => void, onStartEdit?: () => void) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing?: () => void
  isAnotherItemBeingEdited?: boolean
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
  isAnotherItemBeingEdited = false
}: IndividualItemSectionProps<T>) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<T | null>(null)
  const [itemsData, setItemsData] = useState<T[]>((data as T[]) || [])
  const editingItemIndexRef = useRef<number | null>(null)
  
  // Helper function to get section ID from title
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

  useEffect(() => {
    setItemsData((data as T[]) || [])
  }, [data])

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
      const newData = [...itemsData]
      
      // Check if we're adding a new item (editingItemIndex >= current array length)
      if (editingItemIndex >= itemsData.length) {
        // Adding a new item - append to the array
        newData.push(editData)
      } else {
        // Editing an existing item - update at the index
        newData[editingItemIndex] = editData
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

  return (
    <BaseSection
      title={title}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onSave={undefined}
      onCancel={undefined}
      isValid={true}
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
          <Tooltip title={isAnotherItemBeingEdited ? "Finish editing the current item first" : `Add new ${getSingularTitle(title).toLowerCase()}`}>
            <span style={{ position: 'absolute', top: 0, right: 0 }}>
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
          {itemsData.map((item, index) => (
            <Box
              key={index}
              sx={{
                position: 'relative',
                mb: 0.25,
                p: 1,
                border: '1px solid transparent',
                borderRadius: 1,
                transition: 'border-color 0.2s ease',
                '&:hover': {
                  border: '1px solid #e0e0e0'
                }
              }}
            >
              {editingItemIndex === index && editData ? (
                // Show edit form for this item
                <Box>
                  <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 0.5, zIndex: 1 }}>
                    <Tooltip title="Save changes">
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
                  <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 0.5, zIndex: 1 }}>
                    <Tooltip title={`Delete this ${getSingularTitle(title).toLowerCase()}`}>
                      <IconButton
                        className="item-delete-button"
                        onClick={() => handleDeleteItem(index)}
                        sx={{ 
                          color: 'error.main',
                          bgcolor: 'white',
                          boxShadow: 1
                        }}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={isAnotherItemBeingEdited ? "Finish editing the current item first" : `Edit this ${getSingularTitle(title).toLowerCase()}`}>
                      <IconButton
                        className="item-edit-button"
                        onClick={() => handleEditItem(index)}
                        disabled={isAnotherItemBeingEdited}
                        sx={{
                          opacity: isAnotherItemBeingEdited ? 0.5 : 1,
                          transition: 'opacity 0.2s',
                          bgcolor: 'white',
                          boxShadow: 1
                        }}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {renderItemDisplay(item, index)}
                </Box>
              )}
            </Box>
          ))}
          
          {/* Handle new item form - when editingItemIndex >= itemsData.length */}
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
          
        </Box>
      )}
    </BaseSection>
  )
}

export default IndividualItemSection
