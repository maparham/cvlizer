import React, { useState, useEffect } from 'react'
import { Box, Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { SectionProps } from '../types'
import { useSectionAutoSave } from './hooks'
import BaseSection from './BaseSection'
import { useArraySection, ArrayItem } from './arrayUtils'
import { ArrayItemContainer, EmptyState } from './formUtils'

interface ArrayFormSectionProps<T extends ArrayItem> extends SectionProps {
  title: string
  emptyMessage: string
  createNewItem: () => T
  requiredFields: (keyof T)[]
  renderItemForm: (item: T, index: number, updateItem: (field: keyof T, value: any) => void) => React.ReactNode
  renderItemDisplay: (item: T, index: number) => React.ReactNode
  autoSaveMessage: string
}

/**
 * Generic array form section component that handles common array management logic
 */
const ArrayFormSection = <T extends ArrayItem>({
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
  autoSaveMessage
}: ArrayFormSectionProps<T>) => {
  const [editData, setEditData] = useState<T[]>(data as T[] || [])

  useEffect(() => {
    setEditData(data as T[] || [])
  }, [data])

  // Use common auto-save hook
  useSectionAutoSave(isEditing, editData, data, onUpdate, onSave, autoSaveMessage || 'Changes saved', title, onUnsavedChanges)

  // const validateItem = createArrayItemValidator(requiredFields as string[])

  const {
    data: arrayData,
    addItem,
    removeItem,
    updateItem,
    isFormValid,
    resetData
  } = useArraySection({
    data: editData,
    onUpdate: (newData: ArrayItem[]) => {
      setEditData(newData as T[])
      onUpdate(newData as T[])
    },
    onSave: (newData: ArrayItem[], message?: string) => {
      onSave(newData as T[], message)
    },
    createNewItem,
    requiredFields: requiredFields as string[]
  })

  if (!data) return null

  const handleSave = () => {
    if (!isFormValid()) {
      return
    }
    onUpdate(arrayData)
    onClose()
    onSave(arrayData)
  }

  const handleCancel = () => {
    resetData()
    onClose()
  }

  const handleAddItem = () => {
    addItem()
  }

  const handleRemoveItem = (index: number) => {
    removeItem(index)
  }

  const handleUpdateItem = (index: number, field: keyof T, value: any) => {
    updateItem(index, field as keyof ArrayItem, value)
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

  return (
    <BaseSection
      title={title}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onSave={handleSave}
      onCancel={handleCancel}
      isValid={isFormValid()}
    >
      {isEditing ? (
        <Box>
          {arrayData.map((item: T, index: number) => (
            <ArrayItemContainer
              key={index}
              index={index}
              title={getSingularTitle(title)}
              onEdit={() => {}} // Handled by the form itself
              onDelete={handleRemoveItem}
            >
              {renderItemForm(item, index, (field, value) => handleUpdateItem(index, field, value))}
            </ArrayItemContainer>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Add {getSingularTitle(title)}
          </Button>
        </Box>
      ) : (
        <Box>
          {arrayData.length === 0 ? (
            <EmptyState message={emptyMessage} />
          ) : (
            arrayData.map((item: T, index: number) => (
              <Box key={index} sx={{ mb: 0.25 }}>
                {renderItemDisplay(item, index)}
              </Box>
            ))
          )}
        </Box>
      )}
    </BaseSection>
  )
}

export default ArrayFormSection
