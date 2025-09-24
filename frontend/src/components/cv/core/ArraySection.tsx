import React, { useState } from 'react'
import { IconButton, Typography, Tooltip } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { ArraySectionProps } from '../types'
import { useArraySectionAutoSave } from './hooks'
import BaseSection from './BaseSection'

const ArraySection: React.FC<ArraySectionProps<any>> = ({
  title,
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  emptyMessage,
  renderEditForm,
  renderItem,
  createNewItem,
  autoSaveMessage,
  onUnsavedChanges
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>({})

  // Use common auto-save hook - it now properly handles new vs existing items
  useArraySectionAutoSave(
    isEditing,
    editingIndex, 
    editData, 
    data || [], 
    onUpdate, 
    onSave, 
    autoSaveMessage || '',
    onUnsavedChanges ? (hasChanges: boolean) => onUnsavedChanges('', hasChanges) : undefined
  )

  const handleAdd = () => {
    if (!createNewItem) return
    const newItem = createNewItem()
    setEditingIndex((data || []).length)
    setEditData(newItem)
    onEdit()
  }


  const handleSave = () => {
    if (editingIndex !== null) {
      const newData = [...(data || [])]
      
      // Check if we're adding a new item (editingIndex >= current array length)
      if (editingIndex >= (data || []).length) {
        // Adding a new item - append to the array
        newData.push(editData)
      } else {
        // Editing an existing item - update at the index
        newData[editingIndex] = editData
      }
      
      onUpdate(newData)
      onSave(newData, autoSaveMessage || '')
    }
    onClose()
    setEditingIndex(null)
    setEditData({})
  }

  const handleCancel = () => {
    onClose()
    setEditingIndex(null)
    setEditData({})
  }


  if (!data || data.length === 0) {
    return (
      <BaseSection
        title={title}
        isEditing={isEditing}
        onEdit={onEdit}
        onClose={onClose}
        editButton={
          <Tooltip title={`Add new ${(title || 'item').toLowerCase()}`}>
            <IconButton
              className="edit-button"
              onClick={handleAdd}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                opacity: 1,
                transition: 'opacity 0.2s',
                bgcolor: 'white',
                boxShadow: 1
              }}
              size="small"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      >
        <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
          {emptyMessage}
        </Typography>
      </BaseSection>
    )
  }

  return (
    <BaseSection
      title={title}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onSave={isEditing && editingIndex !== null ? handleSave : undefined}
      onCancel={isEditing && editingIndex !== null ? handleCancel : undefined}
      isValid={true}
      editButton={
        <Tooltip title={`Add new ${(title || 'item').toLowerCase()}`}>
          <IconButton
            className="edit-button"
            onClick={handleAdd}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              opacity: 1,
              transition: 'opacity 0.2s',
              bgcolor: 'white',
              boxShadow: 1
            }}
            size="small"
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      }
    >
      {isEditing && editingIndex !== null ? (
        renderEditForm?.(editData, editingIndex, setEditData)
      ) : (
        data.map((item: any, index: number) => renderItem?.(item, index))
      )}
    </BaseSection>
  )
}

export default ArraySection
