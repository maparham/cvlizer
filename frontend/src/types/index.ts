// Export all types from their respective modules
export type * from './api'
export type * from './user'
export type * from './cv'
export type * from './components'
export type * from './history'

// Re-export commonly used types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError
} from './api'

export type {
  User,
  UserProfile,
  UserPreferences
} from './user'

export type {
  CV,
  CVData,
  PersonalInfo,
  ProfessionalSummary,
  WorkExperience,
  Education,
  Skills,
  CVSection,
  CVSectionType,
  CVSectionData
} from './cv'

export type {
  PDFCVEditorProps,
  BaseSectionProps,
  SectionProps,
  ArraySectionProps,
  IndividualItemSectionProps,
  EditingIndividualItem,
  UnsavedChangesHook
} from './components'

export type {
  CVHistoryEntry,
  CVHistoryChangeType,
  CVHistoryState,
  CVHistoryConfig,
  CreateSnapshotOptions,
  RestoreVersionOptions,
  HistoryStats,
  HistoryPanelProps,
  HistoryDiff
} from './history'

export {
  DEFAULT_HISTORY_CONFIG,
  HISTORY_STORAGE_KEYS
} from './history'
