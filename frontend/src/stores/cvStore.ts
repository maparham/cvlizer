/**
 * CV Store - Centralized State Management for CV Operations
 * 
 * This module provides comprehensive state management for CV operations using Zustand,
 * including CRUD operations, background parsing monitoring, and real-time status updates.
 * It serves as the single source of truth for CV data throughout the application.
 * 
 * Key responsibilities:
 * - Manage CV CRUD operations (fetch, upload, update, delete) with API integration
 * - Handle background parsing status polling and real-time updates
 * - Maintain loading states, error handling, and user feedback
 * - Manage current CV selection and temporary CV workflows
 * - Provide CV history tracking and auto-snapshot functionality
 * - Handle file upload progress and parsing status monitoring
 * - Integrate with polling manager for background job tracking
 * 
 * Usage context:
 * - Used by CV management components throughout the application
 * - Provides reactive state updates for UI components
 * - Handles complex async workflows with proper error handling
 * - Manages temporary CV creation and validation processes
 * 
 * Dependencies:
 * - Zustand for state management with devtools integration
 * - CV API services for backend communication
 * - Polling manager for background job monitoring
 * - CV data types and schemas for type safety
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { 
  CV, 
  CVUpdateRequest, 
  CVData,
  CVHistoryEntry,
  CreateSnapshotOptions,
  RestoreVersionOptions,
  HistoryStats
} from '../types'
import { cvApi, normalizeApiError } from '../services/api'
import { PollingManager } from './utils'
import { CVValidationService } from '../services/cvValidationService'
import { backendHistoryService } from '../services/backendHistoryService'
import { migrateCVIfNeeded } from '../utils/cvDataMigration'

// Constants
const DEFAULT_CV_FILENAME = 'New CV'
const TEMP_CV_ID_PREFIX = 'temp-'

// Check if CV history feature is enabled
const isHistoryEnabled = () => import.meta.env.VITE_SHOW_HISTORY_PANEL === 'true'

/**
 * Check if a CV ID is temporary (not yet saved to backend)
 * Temporary CVs have IDs that start with 'temp-'
 */
export const isTempCVId = (cvId: string | undefined): boolean => {
  return cvId ? cvId.startsWith(TEMP_CV_ID_PREFIX) : false
}

// Default CV structure for new CVs - only includes sections that can be empty
export const DEFAULT_CV_DATA: CVData = {
  personal_info: {
    full_name: "",
    email: "",
    phone: "",
    location: "",
    linkedin_url: "",
    website_url: ""
  },
  professional_summary: {
    content: "",
    keywords: []
  },
  work_experience: [],
  education: [],
  skills: {
    technical: [],
    soft: [],
    languages: []
  },
  certifications: [],
  projects: [],
  awards: [],
  publications: [],
  volunteer_experience: []
}

interface CVState {
  // State
  cvs: CV[]
  currentCV: CV | null
  temporaryCV: CV | null  // For new CVs that haven't been saved yet
  loading: boolean
  uploading: boolean
  error: string | null
  saving: boolean
  lastSavedAt: string | null

  // Pagination state
  currentPage: number
  totalPages: number
  totalCVs: number
  cvsPerPage: number

  // Polling state
  hasUnparsedCVs: boolean
  pollingManager: PollingManager | null

  // History state
  historyPanelOpen: boolean
  autoSnapshotsEnabled: boolean
  lastAutoSnapshot: string | null

  // Actions
  fetchCVs: (page?: number, limit?: number) => Promise<void>
  fetchCV: (_cvId: string) => Promise<CV | null>
  uploadCV: (file: File) => Promise<CV>
  createTemporaryCV: () => CV
  saveTemporaryCV: (cvData: CVUpdateRequest) => Promise<CV>
  updateCV: (cvId: string, data: CVUpdateRequest) => Promise<CV>
  updateCVTitle: (cvId: string, title: string) => Promise<CV>
  deleteCV: (cvId: string) => Promise<void>
  duplicateCV: (cvId: string) => Promise<CV>
  
  // History actions
  createSnapshot: (cvId: string, cvData: CVData, options: CreateSnapshotOptions) => Promise<CVHistoryEntry>
  getHistoryEntries: (cvId: string) => Promise<CVHistoryEntry[]>
  getHistoryEntry: (cvId: string, entryId: string) => Promise<CVHistoryEntry | null>
  restoreVersion: (cvId: string, options: RestoreVersionOptions) => Promise<CV>
  deleteHistoryEntry: (cvId: string, entryId: string) => Promise<boolean>
  getHistoryStats: (cvId: string) => Promise<HistoryStats>
  setHistoryPanelOpen: (open: boolean) => void
  setAutoSnapshotsEnabled: (enabled: boolean) => void
  
  // Utility actions
  setCurrentCV: (cv: CV | null) => void
  setTemporaryCV: (cv: CV | null) => void
  clearError: () => void
  startPolling: () => void
  stopPolling: () => void
  setPage: (page: number) => void

  // Internal actions
  addCV: (cv: CV) => void
  updateCVInList: (cv: CV) => void
  removeCVFromList: (cvId: string) => void
  setLoading: (loading: boolean) => void
  setUploading: (uploading: boolean) => void
  setError: (error: string | null) => void
  setSaving: (saving: boolean) => void
  
  // Internal history helpers
  shouldCreateAutoSnapshot: (cvId: string) => Promise<boolean>
  createAutoSnapshotIfNeeded: (cvId: string, cvData: CVData, changeType?: string) => Promise<void>
  createSnapshotOnUserAction: (cvId: string, cvData: CVData, action: string, customDescription?: string) => Promise<void>
}

export const useCVStore = create<CVState>()(
  devtools(
    (set, get) => ({
      // Initial state
      cvs: [],
      currentCV: null,
      temporaryCV: null,
      loading: false,
      uploading: false,
      error: null,
      saving: false,
      lastSavedAt: null,
      currentPage: 1,
      totalPages: 1,
      totalCVs: 0,
      cvsPerPage: 100,
      hasUnparsedCVs: false,
      pollingManager: null,

      // History state
      historyPanelOpen: false,
      autoSnapshotsEnabled: false,
      lastAutoSnapshot: null,

      // Actions
      fetchCVs: async (page: number = 1, limit: number = 100) => {
        const state = get()
        if (state.loading) return // Prevent concurrent fetches

        set({ loading: true, error: null })

        try {
          const response = await cvApi.getCVs(page, limit)
          const cvs = response.cvs || []

          // Check if there are unparsed CVs
          const hasUnparsedCVs = cvs.some((cv: CV) => !cv.is_parsed && !cv.parse_error)

          set({
            cvs,
            loading: false,
            hasUnparsedCVs,
            error: null,
            currentPage: response.page || page,
            totalPages: response.pages || 1,
            totalCVs: response.total || 0,
            cvsPerPage: response.limit || limit
          })

          // Start polling if there are unparsed CVs
          const pollingManager = get().pollingManager
          if (hasUnparsedCVs && !pollingManager?.isActive()) {
            get().startPolling()
          } else if (!hasUnparsedCVs && pollingManager?.isActive()) {
            get().stopPolling()
          }
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to fetch CVs'
          set({
            error: errorMessage,
            loading: false,
            cvs: []
          })
        }
      },

      fetchCV: async (cvId: string): Promise<CV | null> => {
        set({ loading: true, error: null })
        
        try {
          const cv = await cvApi.getCV(cvId)
          
          // Migrate CV data to ensure all items have IDs
          let migratedCV = cv
          if (cv.parsed_data) {
            const { data: migratedData, migrated } = migrateCVIfNeeded(cv.parsed_data)
            if (migrated) {
              migratedCV = { ...cv, parsed_data: migratedData }
              
              // Save the migrated data back to the backend
              try {
                const cleanedData = CVValidationService.cleanForBackend(migratedData)
                await cvApi.updateCV(cvId, { parsed_data: cleanedData })
              } catch (error) {
                // Continue anyway with the migrated data in memory
              }
            }
          }
          
          set({ 
            currentCV: migratedCV,
            loading: false,
            error: null
          })
          
          // Also update in the CVs list if it exists
          const existingIndex = get().cvs.findIndex(c => c.id === cvId)
          if (existingIndex !== -1) {
            const updatedCVs = [...get().cvs]
            updatedCVs[existingIndex] = migratedCV
            set({ cvs: updatedCVs })
          }

          // Initial history entry is now created automatically by the backend after parsing
          // No need to create it here to avoid duplicates
          
          return migratedCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to fetch CV'
          set({ 
            error: errorMessage,
            loading: false,
            currentCV: null
          })
          return null
        }
      },

      uploadCV: async (file: File): Promise<CV> => {
        set({ uploading: true, error: null })
        
        try {
          const cv = await cvApi.uploadCV(file)
          
          
          // Migrate CV data to ensure all items have IDs (same as fetchCV)
          let migratedCV = cv
          if (cv.parsed_data) {
            const { data: migratedData, migrated } = migrateCVIfNeeded(cv.parsed_data)
            
            
            if (migrated) {
              migratedCV = { ...cv, parsed_data: migratedData }
              
              // Save the migrated data back to the backend
              try {
                const cleanedData = CVValidationService.cleanForBackend(migratedData)
                await cvApi.updateCV(cv.id, { parsed_data: cleanedData })
              } catch (error) {
                // Continue anyway with the migrated data in memory
              }
            }
          }
          
          // Add to the CVs list
          set(state => ({ 
            cvs: [...state.cvs, migratedCV],
            uploading: false,
            error: null,
            hasUnparsedCVs: true // New uploads typically need parsing
          }))

          // Start polling for parsing updates
          if (!get().pollingManager?.isActive()) {
            get().startPolling()
          }
          
          return migratedCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to upload CV'
          set({ 
            error: errorMessage,
            uploading: false
          })
          throw new Error(errorMessage)
        }
      },

      createTemporaryCV: (): CV => {
        // Create a temporary CV object that exists only in frontend state
        const temporaryCV: CV = {
          id: `${TEMP_CV_ID_PREFIX}${Date.now()}`, // Temporary ID
          user_id: '', // Will be set when saved
          original_filename: DEFAULT_CV_FILENAME,
          file_size: 0,
          file_type: 'application/pdf',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_parsed: true,
          parsed_data: JSON.parse(JSON.stringify(DEFAULT_CV_DATA)), // Deep copy
          is_imported: false,
          has_been_edited: false
        }
        
        set({ temporaryCV })
        return temporaryCV
      },

      saveTemporaryCV: async (cvData: CVUpdateRequest): Promise<CV> => {
        const { temporaryCV } = get()
        if (!temporaryCV) {
          throw new Error('No temporary CV to save')
        }
        
        set({ loading: true, error: null })
        
        try {
          // Clean the CV data to remove sections that would fail backend validation
          const cleanedData = CVValidationService.cleanForBackend(cvData.parsed_data)
          const cleanedRequest = { parsed_data: cleanedData }
          
          // Create blank CV with the cleaned data
          const newCV = await cvApi.createBlankCV()
          
          // Batch the updates to minimize API calls
          const promises = [
            cvApi.updateCV(newCV.id, cleanedRequest)
          ]
          
          // Only update title if it's different from default
          if (temporaryCV.original_filename !== DEFAULT_CV_FILENAME) {
            promises.push(cvApi.updateCVTitle(newCV.id, temporaryCV.original_filename))
          }
          
          // Execute updates in parallel
          const results = await Promise.all(promises)
          const finalCV = results[results.length - 1] // Get the last result (either updateCV or updateCVTitle)
          
          // Add to the CVs list and clear temporary CV
          set(state => ({ 
            cvs: [...state.cvs, finalCV],
            currentCV: finalCV,
            temporaryCV: null,
            loading: false,
            error: null
          }))
          
          return finalCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to save CV'
          set({ 
            error: errorMessage,
            loading: false
          })
          throw new Error(errorMessage)
        }
      },

      updateCV: async (cvId: string, data: CVUpdateRequest): Promise<CV> => {
        // Debounced save UX: do not toggle heavy loading; mark saving
        set({ error: null, saving: true })
        try {
          const cleanedData = CVValidationService.cleanForBackend(data.parsed_data)
          const validationErrors = CVValidationService.validateCVData(cleanedData)
          if (validationErrors.length > 0) {
            set({ saving: false })
            throw new Error(`CV validation failed:\n• ${validationErrors.join('\n• ')}`)
          }
          const cleanedRequest = { parsed_data: cleanedData }
          const updatedCV = await cvApi.updateCV(cvId, cleanedRequest)
          set({
            currentCV: get().currentCV?.id === cvId ? updatedCV : get().currentCV,
            error: null,
            saving: false,
            lastSavedAt: new Date().toISOString()
          })
          get().updateCVInList(updatedCV)
          return updatedCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to update CV'
          set({ error: errorMessage, saving: false })
          throw new Error(errorMessage)
        }
      },

      updateCVTitle: async (cvId: string, title: string): Promise<CV> => {
        set({ loading: true, error: null })
        
        try {
          const updatedCV = await cvApi.updateCVTitle(cvId, title)
          
          // Update in both currentCV and CVs list
          set({ 
            currentCV: get().currentCV?.id === cvId ? updatedCV : get().currentCV,
            loading: false,
            error: null
          })
          
          get().updateCVInList(updatedCV)
          
          return updatedCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to update CV title'
          
          set({ 
            error: errorMessage,
            loading: false
          })
          throw new Error(errorMessage)
        }
      },

      deleteCV: async (cvId: string): Promise<void> => {
        set({ loading: true, error: null })
        
        try {
          await cvApi.deleteCV(cvId)
          
          // Remove from state
          get().removeCVFromList(cvId)
          
          // Clear currentCV if it was the deleted one
          if (get().currentCV?.id === cvId) {
            set({ currentCV: null })
          }
          
          set({ 
            loading: false,
            error: null
          })
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to delete CV'
          set({ 
            error: errorMessage,
            loading: false
          })
          throw new Error(errorMessage)
        }
      },

      duplicateCV: async (cvId: string): Promise<CV> => {
        set({ loading: true, error: null })
        
        try {
          const duplicatedCV = await cvApi.duplicateCV(cvId)
          
          // Add to the CVs list
          set(state => ({ 
            cvs: [...state.cvs, duplicatedCV],
            loading: false,
            error: null
          }))
          
          return duplicatedCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to duplicate CV'
          set({ 
            error: errorMessage,
            loading: false
          })
          throw new Error(errorMessage)
        }
      },

      // Utility actions
      setCurrentCV: (cv: CV | null) => {
        set({ currentCV: cv })
      },

      setTemporaryCV: (cv: CV | null) => {
        set({ temporaryCV: cv })
      },

      clearError: () => {
        set({ error: null })
      },

      startPolling: () => {
        // Don't start if already polling
        if (get().pollingManager?.isActive()) return

        const pollingFn = async () => {
          const { loading, uploading, currentPage, cvsPerPage } = get()

          // Don't poll if already loading or uploading
          if (loading || uploading) return

          // Fetch CVs without setting loading state to avoid UI flicker
          const response = await cvApi.getCVs(currentPage, cvsPerPage)
          const cvs = response.cvs || []
          const newHasUnparsedCVs = cvs.some((cv: CV) => !cv.is_parsed && !cv.parse_error)

          set({
            cvs,
            hasUnparsedCVs: newHasUnparsedCVs,
            currentPage: response.page || currentPage,
            totalPages: response.pages || 1,
            totalCVs: response.total || 0
          })

          // Stop polling if no unparsed CVs remain
          if (!newHasUnparsedCVs) {
            get().stopPolling()
          }
        }

        const pollingManager = new PollingManager(pollingFn, 2000)
        pollingManager.start()
        set({ pollingManager })
      },

      stopPolling: () => {
        const { pollingManager } = get()
        if (pollingManager) {
          pollingManager.stop()
          set({ pollingManager: null })
        }
      },

      // Internal actions
      addCV: (cv: CV) => {
        set(state => ({ 
          cvs: [...state.cvs, cv] 
        }))
      },

      updateCVInList: (updatedCV: CV) => {
        set(state => ({
          cvs: state.cvs.map(cv => 
            cv.id === updatedCV.id ? updatedCV : cv
          )
        }))
      },

      removeCVFromList: (cvId: string) => {
        set(state => ({
          cvs: state.cvs.filter(cv => cv.id !== cvId)
        }))
      },

      setLoading: (loading: boolean) => {
        set({ loading })
      },

      setUploading: (uploading: boolean) => {
        set({ uploading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      setSaving: (saving: boolean) => {
        set({ saving })
      },

      setPage: (page: number) => {
        set({ currentPage: page })
        get().fetchCVs(page, get().cvsPerPage)
      },

      // History actions
      createSnapshot: async (cvId: string, cvData: CVData, options: CreateSnapshotOptions): Promise<CVHistoryEntry> => {
        // Skip if history feature is disabled
        if (!isHistoryEnabled()) {
          // Return a mock entry to prevent crashes
          return {
            id: `disabled_${Date.now()}`,
            timestamp: new Date().toISOString(),
            cvData: cvData,
            changeType: options.changeType,
            description: options.description || 'Snapshot created',
            isAutomatic: options.changeType !== 'manual_save' && options.changeType !== 'restore_point',
            isInitial: options.changeType === 'initial_load',
            label: options.label,
            dataSize: JSON.stringify(cvData).length
          }
        }

        const entry = await backendHistoryService.createSnapshot(cvId, cvData, options)

        // Update last auto snapshot time if this was automatic
        if (entry.isAutomatic) {
          set({ lastAutoSnapshot: entry.timestamp })
        }

        return entry
      },

      getHistoryEntries: async (cvId: string): Promise<CVHistoryEntry[]> => {
        return await backendHistoryService.getHistoryEntries(cvId)
      },

      getHistoryEntry: async (cvId: string, entryId: string): Promise<CVHistoryEntry | null> => {
        return await backendHistoryService.getHistoryEntry(cvId, entryId)
      },

      restoreVersion: async (cvId: string, options: RestoreVersionOptions): Promise<CV> => {
        set({ loading: true, error: null })

        try {
          // Use the backend restore endpoint which handles CV update
          const result = await backendHistoryService.restoreVersion(
            cvId, 
            options.entryId
          )

          const updatedCV = result.cv

          // Update local state
          set({ 
            currentCV: updatedCV,
            loading: false,
            error: null
          })
          
          get().updateCVInList(updatedCV)

          return updatedCV
        } catch (error: any) {
          set({ loading: false })
          throw error
        }
      },

      deleteHistoryEntry: async (cvId: string, entryId: string): Promise<boolean> => {
        return await backendHistoryService.deleteHistoryEntry(cvId, entryId)
      },

      getHistoryStats: async (cvId: string): Promise<HistoryStats> => {
        return await backendHistoryService.getHistoryStats(cvId)
      },

      setHistoryPanelOpen: (open: boolean) => {
        set({ historyPanelOpen: open })
      },

      setAutoSnapshotsEnabled: (enabled: boolean) => {
        set({ autoSnapshotsEnabled: enabled })
      },

      // Internal history helpers
      shouldCreateAutoSnapshot: async (cvId: string): Promise<boolean> => {
        const { autoSnapshotsEnabled } = get()
        if (!autoSnapshotsEnabled) return false

        try {
          const historyEntries = await get().getHistoryEntries(cvId)
          
          // If no history at all, don't auto-create (initial load will handle this)
          if (historyEntries.length === 0) return false

          // Get the most recent entry
          const lastEntry = historyEntries[0]
          if (!lastEntry) return true

          // Check if enough time has passed since last entry (30 seconds)
          const timeSinceLastEntry = Date.now() - new Date(lastEntry.timestamp).getTime()
          return timeSinceLastEntry >= 30000
        } catch (error) {
          return false
        }
      },

      createAutoSnapshotIfNeeded: async (cvId: string, cvData: CVData, changeType: string = 'auto_save'): Promise<void> => {
        // Skip if history feature is disabled
        if (!isHistoryEnabled()) return

        if (!(await get().shouldCreateAutoSnapshot(cvId))) return

        try {
          const descriptions = {
            'auto_save': 'Auto-saved changes',
            'manual_save': 'CV saved',
            'section_edit': 'Section edited'
          }

          await get().createSnapshot(cvId, cvData, {
            changeType: changeType as any,
            description: descriptions[changeType as keyof typeof descriptions] || 'CV updated',
            force: false
          })
        } catch (error: any) {
          // Don't throw on auto-snapshot failures
        }
      },

      createSnapshotOnUserAction: async (cvId: string, cvData: CVData, action: string, customDescription?: string): Promise<void> => {
        // Skip if history feature is disabled
        if (!isHistoryEnabled()) return

        try {
          const actionDescriptions = {
            'section_completed': 'Section editing completed',
            'bulk_edit': 'Multiple sections updated',
            'major_change': 'Significant changes made',
            'manual_save': 'CV saved by user'
          }

          // Use custom description if provided, otherwise fall back to action descriptions
          const description = customDescription || actionDescriptions[action as keyof typeof actionDescriptions] || 'CV updated'

          await get().createSnapshot(cvId, cvData, {
            changeType: 'manual_save',
            description: description,
            force: false
          })
        } catch (error: any) {
          // Snapshot creation failed
        }
      }
    }),
    {
      name: 'cv-store'
    }
  )
)

// Cleanup function to stop polling when the store is no longer used
// This should be called when the app unmounts or the user logs out
export const cleanupCVStore = () => {
  useCVStore.getState().stopPolling()
}
