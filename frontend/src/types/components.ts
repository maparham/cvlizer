import { ReactNode } from 'react'
import { CVData, CVSection, CVSectionType } from './cv'

// Base Component Props
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
}

// PDF CV Editor Types
export interface PDFCVEditorProps {
  cvData: CVData
  onUpdateCV: (updatedData: CVData) => void
  onSave: (updatedData?: CVData, message?: string) => Promise<void>
}

// Base Section Props
export interface BaseSectionProps extends BaseComponentProps {
  title: string
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  onSave?: () => void
  onCancel?: () => void
  editButton?: ReactNode
  isValid?: boolean
}

// Section Props for CV sections
export interface SectionProps<T = unknown> {
  data: T
  onUpdate: (data: T) => void
  onSave: (data: T, message?: string) => Promise<void>
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  onUnsavedChanges?: (sectionId: string, hasChanges: boolean) => void
  registerIndividualItemEditing?: (
    sectionId: string, 
    itemIndex: number, 
    onCancel: () => void, 
    onStartEdit?: () => void
  ) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing?: () => void
  requestIndividualItemCancel?: (sectionId: string, onCancel: () => void) => void
  requestSectionCancel?: () => void
  isAnotherItemBeingEdited?: boolean
}

// Array Section Props
export interface ArraySectionProps<T> {
  title: string
  data: T[]
  onUpdate: (data: T[]) => void
  onSave: (data: T[], message?: string) => Promise<void>
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  emptyMessage: string
  renderEditForm: (
    editData: T, 
    setEditData: (data: T) => void, 
    onSave: () => void, 
    onCancel: () => void
  ) => ReactNode
  renderItem: (
    item: T, 
    index: number, 
    onEdit: (index: number) => void, 
    onDelete: (index: number) => void
  ) => ReactNode
  createNewItem: () => T
  autoSaveMessage: string
  onUnsavedChanges?: (hasChanges: boolean) => void
}

// Individual Item Section Props
export interface IndividualItemSectionProps<T> extends SectionProps<T[]> {
  title: string
  emptyMessage: string
  createNewItem: () => T
  requiredFields: (keyof T)[]
  renderItemForm: (
    item: T, 
    index: number, 
    updateItem: (field: keyof T, value: unknown) => void
  ) => ReactNode
  renderItemDisplay: (item: T, index: number) => ReactNode
  autoSaveMessage: string
}

// Sortable Section Item Props
export interface SortableSectionItemProps {
  section: CVSection
  onToggleVisibility: (id: string) => void
  onRemove?: (id: string) => void
  isOverlay?: boolean
}

// Section Manager Sidebar Props
export interface SectionManagerSidebarProps {
  sections: CVSection[]
  activeId: string | null
  isDefaultOrder: boolean
  availableSectionsToAdd: Array<{id: string; name: string}>
  onToggleVisibility: (sectionId: string) => void
  onRemove: (sectionId: string) => void
  onResetClick: () => void
  onAddNewSection: (sectionId: string) => void
  onDragStart: (event: any) => void
  onDragEnd: (event: any) => void
}

// CV Content Area Props
export interface CVContentAreaProps {
  sections: CVSection[]
  cvData: CVData
  editingSection: string | null
  onUnsavedChanges: (sectionId: string, hasChanges: boolean) => void
  onUpdateCV: (data: CVData) => void
  onSave: (data?: CVData, message?: string) => Promise<void>
  onSectionEdit: (sectionType: string) => void
  onSectionClose: () => void
  requestSectionCancel: () => void
  requestIndividualItemCancel: (sectionId: string, onCancel: () => void) => void
  registerIndividualItemEditing: (
    sectionId: string,
    itemIndex: number,
    onCancel: () => void,
    onStartEdit?: () => void
  ) => 'success' | 'dialog_shown'
  unregisterIndividualItemEditing: () => void
  editingIndividualItem: EditingIndividualItem | null
}

// Dialog Props
export interface PDFCVEditorDialogsProps {
  showResetDialog: boolean
  showUnsavedChangesDialog: boolean
  pendingChanges: Map<string, unknown>
  onCloseResetDialog: () => void
  onConfirmReset: () => void
  onCloseUnsavedChangesDialog: () => void
  onConfirmUnsavedChanges: () => void
}

// Upload Component Props
export interface CVUploadProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// Form Field Props
export interface FormFieldConfig {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  multiline?: boolean
  rows?: number
  type?: string
  helperText?: string
}

export interface FormFieldProps {
  config: FormFieldConfig
  value: string
  onChange: (value: string) => void
  error?: boolean
  helperText?: string
  sx?: Record<string, unknown>
}

export interface DateFieldProps extends FormFieldProps {
  config: FormFieldConfig & {
    name: string
    label: string
    required?: boolean
  }
}

// Editing State Types
export interface EditingIndividualItem {
  sectionId: string
  itemIndex: number
}

// Hook Return Types
export interface UnsavedChangesState {
  hasUnsavedChanges: boolean
  editingSections: Set<string>
  pendingChanges: Map<string, unknown>
}

export interface UnsavedChangesHook extends UnsavedChangesState {
  startEditing: (sectionId: string) => void
  stopEditing: (sectionId: string) => void
  updatePendingChanges: (sectionId: string, changes: unknown) => void
  clearUnsavedChanges: () => void
  hasSectionUnsavedChanges: (sectionId: string) => boolean
}

// Navigation Types
export interface NavigationItem {
  label: string
  path: string
  icon?: ReactNode
  requiresAuth?: boolean
}
