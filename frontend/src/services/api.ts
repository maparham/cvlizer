/**
 * API Service Module
 *
 * This module provides centralized HTTP client configuration and API functions including:
 * - Axios instance with base URL configuration
 * - Request/response interceptors for authentication
 * - Automatic token refresh handling
 * - Error normalization utilities
 * - CV-specific API endpoints (upload, CRUD operations)
 */
import axios from 'axios'
import { ClerkWindow, isClerkAvailable } from '../types/clerk'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add authentication token
api.interceptors.request.use(
  async (config) => {
    // Use Clerk token
    if (!config.headers.Authorization) {
      // Fall back to Clerk token from the global Clerk instance
      if (typeof window !== 'undefined' && isClerkAvailable(window)) {
        const clerk = (window as ClerkWindow).Clerk
        if (!clerk) {
          return Promise.reject(new Error('Authentication service not available'))
        }

        try {
          const token = await clerk.session?.getToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          } else {
            // No token available, reject the request to prevent 403 errors
            return Promise.reject(new Error('No authentication token available'))
          }
        } catch (error) {
          // Authentication token not available, reject the request
          return Promise.reject(new Error('Authentication token not available'))
        }
      } else {
        // Clerk not available, reject the request
        return Promise.reject(new Error('Authentication service not available'))
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors - user needs to re-authenticate
      // Redirect to sign-in if Clerk is available
      if (typeof window !== 'undefined' && isClerkAvailable(window)) {
        const clerk = (window as ClerkWindow).Clerk
        if (clerk) {
          try {
            await clerk.redirectToSignIn()
          } catch {
            // Redirect failed - ignore error
          }
        }
      }
    }

    return Promise.reject(error)
  }
)

/**
 * API Error Response interfaces for type safety
 */
interface ApiErrorDetail {
  message?: string;
  errors?: string[];
}

interface ApiErrorResponse {
  status: number;
  data?: string | {
    message?: string;
    detail?: string | ApiErrorDetail;
  };
}

interface ApiError {
  message?: string;
  response?: ApiErrorResponse;
}

/**
 * Normalize API errors to a predictable message
 * @param error - Error object from API call
 * @returns User-friendly error message
 */
export const normalizeApiError = (error: unknown): string => {
  if (!error) return 'Unknown error'

  const apiError = error as ApiError
  const response = apiError.response

  if (!response) return apiError.message || 'Network error'

  const data = response.data
  if (!data) return `HTTP ${response.status}`
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    if (data.message) return data.message
    if (data.detail) {
      if (typeof data.detail === 'string') return data.detail
      if (typeof data.detail === 'object' && data.detail.message) {
        // Handle validation errors with detailed field information
        if (data.detail.errors && Array.isArray(data.detail.errors)) {
          const errorList = data.detail.errors.join('\n• ')
          return `${data.detail.message}:\n• ${errorList}`
        }
        return data.detail.message
      }
      try {
        return JSON.stringify(data.detail)
      } catch {
        return 'Request failed'
      }
    }
  }
  return 'Request failed'
}

// CV API functions
export const cvApi = {
  // Get all CVs for the current user
  getCVs: async () => {
    const response = await api.get('/api/cvs/')
    return response.data
  },

  // Get a specific CV by ID
  getCV: async (cvId: string) => {
    const response = await api.get(`/api/cvs/${cvId}`)
    return response.data
  },

  // Delete a CV
  deleteCV: async (cvId: string) => {
    const response = await api.delete(`/api/cvs/${cvId}`)
    return response.data
  },

  // Update CV data
  updateCV: async (cvId: string, data: { parsed_data: Record<string, unknown> }) => {
    // Defensive guard: Clean and normalize why_good_fit data if present
    if (data.parsed_data && data.parsed_data.why_good_fit) {
      const raw = data.parsed_data.why_good_fit as Record<string, unknown>;

      // Normalize the data to match backend schema (snake_case fields only)
      const normalized: Record<string, unknown> = {
        content: (raw.content as string) || (raw.fit_analysis as string) || '',
        fit_analysis: (raw.fit_analysis as string) || (raw.content as string) || '',
        confidence_score: raw.confidence_score ?? raw.confidenceScore,
        key_matches: raw.key_matches || [],
        missing_skills: raw.missing_skills || [],
        suggested_improvements: raw.suggested_improvements || [],
        strengths: raw.strengths || [],
        weaknesses: raw.weaknesses || [],
        generated_at: (raw.generated_at as string) || new Date().toISOString(),
        job_description_id: raw.job_description_id,
      };

      // Add optional fields only if they exist
      if (raw.tokens_used !== undefined) normalized.tokens_used = raw.tokens_used;
      if (raw.generation_time !== undefined) normalized.generation_time = raw.generation_time;
      if (raw.model_used) normalized.model_used = raw.model_used;

      // Validate required fields
      if (normalized.confidence_score === undefined || normalized.confidence_score === null) {
        throw new Error('Cannot save CV: why_good_fit section is missing confidence_score. Please refresh the page and try again.');
      }

      // Replace with normalized data
      data.parsed_data.why_good_fit = normalized;
    }

    const response = await api.put(`/api/cvs/${cvId}`, data)
    return response.data
  },

  // Upload CV file
  uploadCV: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/api/cvs/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Create blank CV from scratch
  createBlankCV: async () => {
    const response = await api.post('/api/cvs/create-blank')
    return response.data
  },

  // Update CV title
  updateCVTitle: async (cvId: string, title: string) => {
    const response = await api.put(`/api/cvs/${cvId}/title`, { title })
    return response.data
  },

  // Download CV file
  downloadCV: async (cvId: string, filename: string) => {
    const response = await api.get(`/api/cvs/${cvId}/download`, {
      responseType: 'blob'
    })
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  // Duplicate CV
  duplicateCV: async (cvId: string) => {
    const response = await api.post(`/api/cvs/${cvId}/duplicate`)
    return response.data
  },

  // Export CV as PDF (LaTeX compiled) and open in a new tab
  exportCVAsPDF: async (cvId: string) => {
    const response = await api.get(`/api/cvs/${cvId}/export/pdf`, {
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => window.URL.revokeObjectURL(url), 30000)
  },

}

// Export the API client for direct use
export const apiClient = api

export default api
