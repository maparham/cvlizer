// Export all contexts
export { AuthProvider, useAuth } from './AuthContext'
export {
  CVEditorProvider,
  useCVEditor,
  useCVEditorControls,
  useCVEditorState
} from './CVEditorContext'

// Re-export types for convenience
export type { User } from '../types'
