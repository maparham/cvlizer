import { useState, useCallback } from 'react'

export interface ArrayItem {
  id: string
  [key: string]: any
}

export interface UseArraySectionProps<T extends ArrayItem> {
  data: T[]
  onUpdate: (data: T[]) => void
  onSave: (data: T[], message?: string) => void
  createNewItem: () => T
  requiredFields: (keyof T)[]
}

export function useArraySection<T extends ArrayItem>({
  data,
  onUpdate,
  onSave,
  createNewItem,
  requiredFields
}: UseArraySectionProps<T>) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<T[]>(data || [])

  const startEditing = useCallback((index: number) => {
    setEditingIndex(index)
    setEditData([...data])
  }, [data])

  const cancelEditing = useCallback(() => {
    setEditingIndex(null)
    setEditData([...data])
  }, [data])

  const saveEditing = useCallback(() => {
    onSave(editData, 'Changes saved')
    setEditingIndex(null)
  }, [editData, onSave])

  const updateItem = useCallback((index: number, field: keyof T, value: any) => {
    setEditData(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }, [])

  const addItem = useCallback(() => {
    const newItem = createNewItem()
    setEditData(prev => [...prev, newItem])
    onUpdate([...data, newItem])
  }, [createNewItem, data, onUpdate])

  const removeItem = useCallback((index: number) => {
    const newData = editData.filter((_, i) => i !== index)
    setEditData(newData)
    onUpdate(newData)
  }, [editData, onUpdate])

  const isItemValid = useCallback((item: T) => {
    return requiredFields.every(field => {
      const value = item[field]
      return value !== undefined && value !== null && value !== ''
    })
  }, [requiredFields])

  return {
    editingIndex,
    editData,
    startEditing,
    cancelEditing,
    saveEditing,
    updateItem,
    addItem,
    removeItem,
    isItemValid,
    data: editData,
    isFormValid: () => editData.every(item => isItemValid(item)),
    resetData: () => setEditData([...data])
  }
}

export function createArrayItemValidator<T extends ArrayItem>(requiredFields: (keyof T)[]) {
  return (item: T) => {
    return requiredFields.every(field => {
      const value = item[field]
      return value !== undefined && value !== null && value !== ''
    })
  }
}
