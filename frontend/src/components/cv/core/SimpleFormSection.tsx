import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Box } from '@mui/material'
import { SectionProps } from '../../../types'
import { useSectionAutoSave } from './hooks'
import BaseSection from './BaseSection'
import { createFormValidator } from './formUtils'

interface SimpleFormSectionProps extends SectionProps {
  title: string
  sectionId: string
  requiredFields: string[]
  renderForm: (_data: any, _updateData: (_field: string, _value: any) => void, _onSave: () => void, _onCancel: () => void) => React.ReactNode
  renderDisplay: (_data: any) => React.ReactNode
  autoSaveMessage: string
  autoSaveMode?: boolean // If true, don't show Save/Cancel buttons
  onTitleSave?: (newTitle: string) => Promise<void>
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
  autoSaveMode = false,
  onTitleSave
}) => {
  // Memoize default data to prevent unnecessary re-renders
  const defaultData = useMemo(() => {
    if (sectionId === 'professional_summary') {
      return { content: "", keywords: [] }
    } else if (sectionId === 'personal_info') {
      return { full_name: "", email: "", phone: "", location: "", linkedin_url: "", website_url: "" }
    } else if (sectionId === 'skills') {
      return { technical: [], soft: [], languages: [] }
    }
    return {}
  }, [sectionId])

  const actualData = data || defaultData
  const [editData, setEditData] = useState(actualData)

  useEffect(() => {
    setEditData(data || defaultData)
  }, [data, defaultData])

  // Reset local state when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setEditData(actualData)
    }
  }, [isEditing, actualData])

  const validateForm = useCallback((data: any): boolean => {
    // First check basic required fields
    const basicValidation = createFormValidator(requiredFields)(data)
    if (!basicValidation) return false
    
    // Section-specific validation
    if (sectionId === 'professional_summary') {
      return data.content && data.content.trim().length >= 10
    }
    
    return true
  }, [requiredFields, sectionId])


  // Use common auto-save hook with validation (skip for skills section as it handles its own saving)
  useSectionAutoSave(
    isEditing, 
    editData, 
    actualData, 
    onUpdate, 
    onSave, 
    autoSaveMessage, 
    sectionId, 
    onUnsavedChanges, 
    validateForm, 
    autoSaveMode && sectionId !== 'skills' // Disable immediate save for skills as it handles its own saving
  )


  const handleSave = async () => {
    if (!validateForm(editData)) {
      return
    }
    onUpdate(editData)
    try {
      await onSave(editData)
      // Clear unsaved changes after successful save
      if (onUnsavedChanges) {
        onUnsavedChanges(sectionId, false)
      }
      // Don't close for Skills section in auto-save mode
      if (sectionId !== 'skills' || !autoSaveMode) {
        onClose()
      }
    } catch (error) {
      // Don't close on error so user can retry
    }
  }

  const handleCancel = () => {
    if (autoSaveMode) {
      // For auto-save sections, just reset and close (no dialog needed)
      setEditData(actualData)
      if (onUnsavedChanges) {
        onUnsavedChanges(sectionId, false)
      }
      onClose()
    } else {
      // For non-auto-save sections, call onClose which will check for changes
      // and show dialog if needed. Data will be reset only if user confirms discard.
      onClose()
    }
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
      onCancel={handleCancel}
      isValid={!autoSaveMode ? validateForm(editData) : true}
      editButton={null}
      onTitleSave={onTitleSave}
    >
      {isEditing ? (
        <Box>
          {renderForm(editData, updateData, handleSave, handleCancel)}
        </Box>
      ) : (
        renderDisplay(actualData)
      )}
    </BaseSection>
  )
}

export default SimpleFormSection
