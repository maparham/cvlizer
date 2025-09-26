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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

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
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        try {
          const token = await (window as any).Clerk.session?.getToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch (error) {
          // Authentication token not available
        }
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
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        try {
          (window as any).Clerk.redirectToSignIn()
        } catch {
          // Redirect failed - ignore error
        }
      }
    }

    return Promise.reject(error)
  }
)

// Normalize API errors to a predictable message
export const normalizeApiError = (error: any): string => {
  if (!error) return 'Unknown error'
  const response = error.response
  if (!response) return error.message || 'Network error'
  const data = response.data
  if (!data) return `HTTP ${response.status}`
  if (typeof data === 'string') return data
  if (data.message) return data.message
  if (data.detail) {
    if (typeof data.detail === 'string') return data.detail
    if (data.detail.message) {
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
  updateCV: async (cvId: string, data: { parsed_data: any }) => {
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

export default api
