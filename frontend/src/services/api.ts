import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token: newRefreshToken } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
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
    if (data.detail.message) return data.detail.message
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
  updateCV: async (cvId: string, data: any) => {
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
  }
}

export default api
