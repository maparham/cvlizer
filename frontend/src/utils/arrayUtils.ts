/**
 * Array Utility Functions
 * 
 * This module provides utility functions for managing arrays of CV section items,
 * including sorting, filtering, and manipulation operations. These utilities are
 * used throughout the CV editor to handle dynamic lists of work experience,
 * education, skills, and other CV sections.
 * 
 * Key functions:
 * - Array sorting and filtering operations
 * - Item manipulation (add, remove, update, reorder)
 * - Validation helpers for array data
 * - Type-safe array operations with generic support
 * 
 * Usage:
 * - Import specific functions as needed in CV section components
 * - Used for maintaining data integrity in dynamic CV sections
 * - Provides consistent array handling across the application
 */
import { useState, useCallback } from 'react'

export interface ArrayItem {
  [key: string]: any
}

export interface ArraySectionConfig<T extends ArrayItem> {
  initialData: T[]
  createNewItem: () => T
  validateItem: (item: T) => boolean
  onUpdate: (data: T[]) => void
  onSave: (data: T[], message?: string) => void
  autoSaveMessage: string
}

/**
 * Hook for managing array-based sections with common CRUD operations
 */
export const useArraySection = <T extends ArrayItem>({
  initialData,
  createNewItem,
  validateItem,
  onUpdate,
  onSave,
  autoSaveMessage
}: ArraySectionConfig<T>) => {
  const [data, setData] = useState<T[]>(initialData)

  const addItem = useCallback(() => {
    const newItem = createNewItem()
    const updatedData = [...data, newItem]
    setData(updatedData)
    onUpdate(updatedData)
    onSave(updatedData, `${autoSaveMessage} - Item added`)
  }, [data, createNewItem, onUpdate, onSave, autoSaveMessage])

  const removeItem = useCallback((index: number) => {
    const updatedData = data.filter((_, i) => i !== index)
    setData(updatedData)
    onUpdate(updatedData)
    onSave(updatedData, `${autoSaveMessage} - Item removed`)
  }, [data, onUpdate, onSave, autoSaveMessage])

  const updateItem = useCallback((index: number, field: keyof T, value: any) => {
    const updatedData = [...data]
    updatedData[index] = { ...updatedData[index], [field]: value }
    setData(updatedData)
    onUpdate(updatedData)
  }, [data, onUpdate])

  const isItemValid = useCallback((item: T) => {
    return validateItem(item)
  }, [validateItem])

  const isFormValid = useCallback(() => {
    return data.every(item => isItemValid(item))
  }, [data, isItemValid])

  const resetData = useCallback((newData: T[]) => {
    setData(newData)
  }, [])

  return {
    data,
    addItem,
    removeItem,
    updateItem,
    isItemValid,
    isFormValid,
    resetData
  }
}

/**
 * Common validation functions
 */
export const createRequiredFieldValidator = (fields: string[]) => {
  return (item: ArrayItem): boolean => {
    return fields.every(field => item[field]?.toString().trim())
  }
}

/**
 * Alias for createRequiredFieldValidator for array items
 */
export const createArrayItemValidator = createRequiredFieldValidator

/**
 * Common form field props generator
 */
export const createFieldProps = (
  value: string,
  onChange: (value: string) => void,
  isRequired: boolean = false,
  errorMessage?: string
) => ({
  value: value || '',
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
  error: isRequired && !value?.trim(),
  helperText: isRequired && !value?.trim() ? errorMessage : '',
  variant: 'standard' as const,
  fullWidth: true
})
