import React, { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import { SectionProps } from '../types'
import { useSectionAutoSave } from './hooks'
import BaseSection from './BaseSection'
import { createFormValidator } from './formUtils'

interface SimpleFormSectionProps extends SectionProps {
  title: string
  sectionId: string
  requiredFields: string[]
  renderForm: (data: any, updateData: (field: string, value: any) => void, onSave: () => void, onCancel: () => void) => React.ReactNode
  renderDisplay: (data: any) => React.ReactNode
  autoSaveMessage: string
  autoSaveMode?: boolean // If true, don't show Save/Cancel buttons
}

/**
 * Generic simple form section component for non-array sections
 */
const SimpleFormSection: React.FC<SimpleFormSectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title,
  sectionId,
  requiredFields,
  renderForm,
  renderDisplay,
  autoSaveMessage,
  autoSaveMode = false
}) => {
  const [editData, setEditData] = useState(data || {})

  useEffect(() => {
    setEditData(data || {})
  }, [data])

  // Use common auto-save hook
  useSectionAutoSave(isEditing, editData, data, onUpdate, onSave, autoSaveMessage, sectionId, onUnsavedChanges)

  if (!data) return null

  const validateForm = createFormValidator(requiredFields)

  const handleSave = () => {
    if (!validateForm(editData)) {
      return
    }
    onUpdate(editData)
    onClose()
    onSave(editData)
  }

  const handleCancel = () => {
    setEditData(data)
    onClose()
  }

  const updateData = (field: string, value: any) => {
    setEditData({ ...editData, [field]: value })
  }

  return (
    <BaseSection
      title={title}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onSave={!autoSaveMode ? handleSave : undefined}
      onCancel={handleCancel} // Always show cancel button in edit mode
      isValid={!autoSaveMode ? validateForm(editData) : true}
      editButton={null}
    >
      {isEditing ? (
        <Box>
          {renderForm(editData, updateData, handleSave, handleCancel)}
        </Box>
      ) : (
        renderDisplay(data)
      )}
    </BaseSection>
  )
}

export default SimpleFormSection
