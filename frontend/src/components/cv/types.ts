// @deprecated - Use types from '@/types' instead
// This file is being phased out in favor of the new type system

import { 
  CVSection as NewCVSection, 
  PDFCVEditorProps as NewPDFCVEditorProps 
} from '../../types'

// Re-export new types for backward compatibility
export type CVSection = NewCVSection
export type PDFCVEditorProps = NewPDFCVEditorProps

import { 
  BaseSectionProps as NewBaseSectionProps,
  ArraySectionProps as NewArraySectionProps,
  SortableSectionItemProps as NewSortableSectionItemProps,
  SectionProps as NewSectionProps
} from '../../types'

// Re-export new types for backward compatibility
export type BaseSectionProps = NewBaseSectionProps
export type ArraySectionProps<T> = NewArraySectionProps<T>
export type SortableSectionItemProps = NewSortableSectionItemProps
export type SectionProps<T = unknown> = NewSectionProps<T>

// @deprecated - Use SectionProps instead
export interface ArraySectionComponentProps<T> {
  data: T[]
  onUpdate: (data: T[]) => void
  onSave: (data: T[], message?: string) => Promise<void>
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  onUnsavedChanges?: (hasChanges: boolean) => void
}
