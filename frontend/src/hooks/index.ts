// Export all custom hooks
export { useSectionManagement } from './useSectionManagement'
export { useEditingState } from './useEditingState'  
export { useDragAndDrop } from './useDragAndDrop'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export { usePDFCVEditor } from './usePDFCVEditor'

// Re-export commonly used types for hooks
export type {
  PDFCVEditorProps,
  EditingIndividualItem,
  CVSection
} from '../types'
