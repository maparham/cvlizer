/**
 * Custom hooks for IndividualItemSection component
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getSectionId, sortItemsByDate, hasUnsavedChanges } from './utils'

/**
 * Hook for managing item editing state
 */
export const useItemEditing = <T>(
  title: string,
  onUnsavedChanges?: (sectionId: string, hasChanges: boolean) => void,
  unregisterIndividualItemEditing?: () => void,
  onClose?: () => void
) => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<T | null>(null)
  const editingItemIndexRef = useRef<number | null>(null)
  
  
  // Memoize section ID to avoid recalculation
  const sectionId = useMemo(() => getSectionId(title), [title])

  const handleCancelEdit = useCallback((isSave = false) => {
    
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
    if (!isSave && onClose) {
      onClose()
    }
  }, [sectionId, onUnsavedChanges, unregisterIndividualItemEditing, onClose])

  const handleUpdateItem = useCallback((
    field: keyof T, 
    value: any, 
    itemsData: T[]
  ) => {
    if (editData) {
      const newEditData = { ...editData, [field]: value }
      
      // Track unsaved changes BEFORE setting state
      if (onUnsavedChanges) {
        const isNewItem = editingItemIndex !== null && editingItemIndex >= itemsData.length
        const originalItem = isNewItem ? null : itemsData[editingItemIndex!]
        const hasChanges = hasUnsavedChanges(newEditData, originalItem, isNewItem)
        
        onUnsavedChanges(sectionId, hasChanges)
      }
      
      setEditData(newEditData)
    }
  }, [editData, editingItemIndex, onUnsavedChanges, sectionId])

  return {
    editingItemIndex,
    setEditingItemIndex,
    editData,
    setEditData,
    editingItemIndexRef,
    handleCancelEdit,
    handleUpdateItem
  }
}

/**
 * Hook for managing sorting functionality
 */
export const useSorting = <T>(
  title: string,
  _data: T[],
  isReordering: boolean
) => {
  // Memoize section ID to avoid recalculation
  const sectionId = useMemo(() => getSectionId(title), [title])
  
  const [sortField, setSortField] = useState<keyof T | ''>(() => {
    const saved = localStorage.getItem(`cv_sort_${sectionId}_field`)
    return (saved as keyof T) || ''
  })
  
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem(`cv_sort_${sectionId}_direction`)
    return (saved as 'asc' | 'desc') || 'desc'
  })

  const handleSort = useCallback((field: keyof T, direction: 'asc' | 'desc') => {
    setSortField(field)
    setSortDirection(direction)
    
    // Save sort preferences to localStorage
    localStorage.setItem(`cv_sort_${sectionId}_field`, String(field))
    localStorage.setItem(`cv_sort_${sectionId}_direction`, direction)
  }, [sectionId])

  const clearSort = useCallback(() => {
    setSortField('')
    localStorage.removeItem(`cv_sort_${sectionId}_field`)
    localStorage.removeItem(`cv_sort_${sectionId}_direction`)
  }, [sectionId])

  const getSortedData = useMemo(() => (inputData: T[]): T[] => {
    if (!sortField || isReordering) {
      return inputData
    }
    return sortItemsByDate(inputData, sortField, sortDirection)
  }, [sortField, sortDirection, isReordering])

  return {
    sortField,
    sortDirection,
    handleSort,
    clearSort,
    getSortedData
  }
}

/**
 * Hook for managing items data with sorting
 */
export const useItemsData = <T>(
  data: T[],
  sortField: keyof T | '',
  sortDirection: 'asc' | 'desc',
  isReordering: boolean
) => {
  const [itemsData, setItemsData] = useState<T[]>((data as T[]) || [])

  useEffect(() => {
    // Only sync with parent data if we're not currently reordering manually
    if (!isReordering) {
      let newData = (data as T[]) || []
      
      // Apply persisted sort if it exists
      if (sortField && newData.length > 0) {
        newData = sortItemsByDate(newData, sortField, sortDirection)
      }
      
      setItemsData(newData)
    }
  }, [data, sortField, sortDirection, isReordering])

  return {
    itemsData,
    setItemsData
  }
}

/**
 * Hook for managing drag and drop reordering
 */
export const useReordering = () => {
  const [isReordering, setIsReordering] = useState(false)

  const handleDragStart = useCallback(() => {
    setIsReordering(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    // Small delay before enabling transitions to prevent snapback
    setTimeout(() => setIsReordering(false), 50)
  }, [])

  const handleManualReorder = useCallback(() => {
    // Disable transitions for instant movement
    setIsReordering(true)
    // Keep transitions disabled for arrow movements
    setTimeout(() => setIsReordering(false), 10)
  }, [])

  return {
    isReordering,
    setIsReordering,
    handleDragStart,
    handleDragEnd,
    handleManualReorder
  }
}
