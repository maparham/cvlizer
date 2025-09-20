/**
 * Error Handling Utilities
 * 
 * Centralized error handling for consistent user experience
 */

export interface AppError {
  message: string
  code?: string
  details?: any
}

export const createAppError = (message: string, code?: string, details?: any): AppError => ({
  message,
  code,
  details
})

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.detail) return error.detail
  return 'An unexpected error occurred'
}

export const isNetworkError = (error: any): boolean => {
  return error?.code === 'NETWORK_ERROR' || 
         error?.message?.includes('Network Error') ||
         error?.message?.includes('fetch')
}

export const getErrorDisplayMessage = (error: any): string => {
  const message = getErrorMessage(error)
  
  if (isNetworkError(error)) {
    return 'Connection error. Please check your internet connection and try again.'
  }
  
  // Make error messages more user-friendly
  if (message.includes('validation')) {
    return 'Please check your input and try again.'
  }
  
  if (message.includes('not found')) {
    return 'The requested item could not be found.'
  }
  
  return message
}
