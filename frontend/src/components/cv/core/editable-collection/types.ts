/**
 * Types and interfaces for IndividualItemSection component
 */
import React from 'react'

export interface SortOption<T> {
  field: keyof T
  label: string
}

export interface IndividualItemSectionProps<T> {
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

export interface ItemControlsProps<T> {
  item: T
  index: number
  title: string
  editingItemIndex: number | null
  isAnotherItemBeingEdited: boolean
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  renderItemDisplay: (item: T, index: number) => React.ReactNode
}

export interface SortMenuProps<T> {
  sortOptions: SortOption<T>[]
  sortField: keyof T | ''
  sortDirection: 'asc' | 'desc'
  onSort: (field: keyof T, direction: 'asc' | 'desc') => void
  onClearSort: () => void
  itemsCount: number
  editingItemIndex: number | null
}

export interface ReorderControlsProps {
  index: number
  itemsLength: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  dragHandleProps: any
}

export interface EditFormProps<T> {
  editData: T
  editingItemIndex: number
  title: string
  isFormValid: boolean
  onSave: () => void
  onCancel: () => void
  renderItemForm: (item: T, index: number, updateItem: (field: keyof T, value: any) => void) => React.ReactNode
  updateItem: (field: keyof T, value: any) => void
}
