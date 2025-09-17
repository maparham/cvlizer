/**
 * CV Store - Zustand State Management
 * 
 * This module provides centralized state management for CV operations including:
 * - CV CRUD operations (fetch, upload, update, delete)
 * - Background parsing status polling for uploaded CVs
 * - Loading and error states management
 * - Current CV selection and list management
 * - Integration with API service layer
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { CV, CVUpdateRequest, CVData } from '../types'
import { cvApi, normalizeApiError } from '../services/api'
import { PollingManager } from './utils'
import { CVValidationService } from '../services/cvValidationService'

// Constants
const DEFAULT_CV_FILENAME = 'New CV'
const TEMP_CV_ID_PREFIX = 'temp-'

// Default CV structure for new CVs - only includes sections that can be empty
const DEFAULT_CV_DATA: CVData = {
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
  
  // Polling state
  hasUnparsedCVs: boolean
  pollingManager: PollingManager | null

  // Actions
  fetchCVs: () => Promise<void>
  fetchCV: (cvId: string) => Promise<CV | null>
  uploadCV: (file: File) => Promise<CV>
  createTemporaryCV: () => CV
  saveTemporaryCV: (cvData: CVUpdateRequest) => Promise<CV>
  updateCV: (cvId: string, data: CVUpdateRequest) => Promise<CV>
  updateCVTitle: (cvId: string, title: string) => Promise<CV>
  deleteCV: (cvId: string) => Promise<void>
  
  // Utility actions
  setCurrentCV: (cv: CV | null) => void
  setTemporaryCV: (cv: CV | null) => void
  clearError: () => void
  startPolling: () => void
  stopPolling: () => void
  
  // Internal actions
  addCV: (cv: CV) => void
  updateCVInList: (cv: CV) => void
  removeCVFromList: (cvId: string) => void
  setLoading: (loading: boolean) => void
  setUploading: (uploading: boolean) => void
  setError: (error: string | null) => void
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
      hasUnparsedCVs: false,
      pollingManager: null,

      // Actions
      fetchCVs: async () => {
        set({ loading: true, error: null })
        
        try {
          const response = await cvApi.getCVs()
          const cvs = response.cvs || []
          
          // Check if there are unparsed CVs
          const hasUnparsedCVs = cvs.some((cv: CV) => !cv.is_parsed && !cv.parse_error)
          
          set({ 
            cvs,
            loading: false,
            hasUnparsedCVs,
            error: null
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
          set({ 
            currentCV: cv,
            loading: false,
            error: null
          })
          
          // Also update in the CVs list if it exists
          const existingIndex = get().cvs.findIndex(c => c.id === cvId)
          if (existingIndex !== -1) {
            const updatedCVs = [...get().cvs]
            updatedCVs[existingIndex] = cv
            set({ cvs: updatedCVs })
          }
          
          return cv
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
          
          // Add to the CVs list
          set(state => ({ 
            cvs: [...state.cvs, cv],
            uploading: false,
            error: null,
            hasUnparsedCVs: true // New uploads typically need parsing
          }))

          // Start polling for parsing updates
          if (!get().pollingManager?.isActive()) {
            get().startPolling()
          }
          
          return cv
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
          parsed_data: JSON.parse(JSON.stringify(DEFAULT_CV_DATA)) // Deep copy
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
        set({ loading: true, error: null })
        
        try {
          // Clean the CV data to remove sections that would fail backend validation
          const cleanedData = CVValidationService.cleanForBackend(data.parsed_data)
          const cleanedRequest = { parsed_data: cleanedData }
          
          const updatedCV = await cvApi.updateCV(cvId, cleanedRequest)
          
          // Update in both currentCV and CVs list
          set({ 
            currentCV: get().currentCV?.id === cvId ? updatedCV : get().currentCV,
            loading: false,
            error: null
          })
          
          get().updateCVInList(updatedCV)
          
          return updatedCV
        } catch (error: any) {
          const errorMessage = normalizeApiError(error) || 'Failed to update CV'
          
          set({ 
            error: errorMessage,
            loading: false
          })
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
          const { loading, uploading } = get()
          
          // Don't poll if already loading or uploading
          if (loading || uploading) return

          // Fetch CVs without setting loading state to avoid UI flicker
          const response = await cvApi.getCVs()
          const cvs = response.cvs || []
          const newHasUnparsedCVs = cvs.some((cv: CV) => !cv.is_parsed && !cv.parse_error)
          
          set({ 
            cvs,
            hasUnparsedCVs: newHasUnparsedCVs
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
