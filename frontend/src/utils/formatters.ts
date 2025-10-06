/**
 * Formatting utilities for displaying data in the admin dashboard.
 * 
 * This module provides utility functions for formatting costs, numbers,
 * durations, and other data types for consistent display across the UI.
 */

/**
 * Format cost as USD currency with appropriate precision.
 */
export const formatCost = (cost: number): string => {
  if (cost === 0) return '$0.00'
  
  // For very small costs, show 5 decimal places to fit in card area
  if (cost < 0.01) {
    return `$${cost.toFixed(5)}`
  }
  
  // For small costs, show 4 decimal places
  if (cost < 1) {
    return `$${cost.toFixed(4)}`
  }
  
  // For larger costs, show 2 decimal places
  return `$${cost.toFixed(2)}`
}

/**
 * Format number with commas for thousands separators.
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US')
}

/**
 * Format tokens with K/M suffix for large numbers.
 */
export const formatTokens = (tokens: number): string => {
  if (tokens === 0) return '0'
  
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  
  return tokens.toString()
}

/**
 * Format duration in milliseconds to human-readable format.
 */
export const formatDuration = (ms: number): string => {
  if (ms === 0) return '0ms'
  
  // For very short durations, show milliseconds
  if (ms < 1000) {
    return `${ms}ms`
  }
  
  // For longer durations, show seconds with 2 decimal places
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  
  // For very long durations, show minutes
  const minutes = seconds / 60
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`
  }
  
  // For extremely long durations, show hours
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

/**
 * Format percentage with appropriate decimal places.
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format date for display in tables and charts.
 * Handles UTC timestamps from backend and converts to local time.
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  
  try {
    // Handle different timestamp formats from backend
    let date: Date
    
    if (dateString.includes(' ') && !dateString.includes('T') && !dateString.includes('Z')) {
      // Format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
      date = new Date(dateString + 'Z')
    } else if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
      // Format: "YYYY-MM-DDTHH:MM:SS" - treat as UTC (ISO format without timezone)
      date = new Date(dateString + 'Z')
    } else {
      // Other formats (ISO with timezone, etc.) - let JavaScript handle it
      date = new Date(dateString)
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Format datetime for display in tables using local timezone.
 * Handles UTC timestamps from backend and converts to local time.
 */
export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  
  try {
    // Handle different timestamp formats from backend
    let date: Date
    
    if (dateString.includes(' ') && !dateString.includes('T') && !dateString.includes('Z')) {
      // Format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
      date = new Date(dateString + 'Z')
    } else if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
      // Format: "YYYY-MM-DDTHH:MM:SS" - treat as UTC (ISO format without timezone)
      date = new Date(dateString + 'Z')
    } else {
      // Other formats (ISO with timezone, etc.) - let JavaScript handle it
      date = new Date(dateString)
    }
    
    // Format in local timezone: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Format relative time (e.g., "2 hours ago").
 * Handles UTC timestamps from backend and converts to local time.
 */
export const formatRelativeTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  
  try {
    // Handle different timestamp formats from backend
    let date: Date
    
    if (dateString.includes(' ') && !dateString.includes('T') && !dateString.includes('Z')) {
      // Format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
      date = new Date(dateString + 'Z')
    } else if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
      // Format: "YYYY-MM-DDTHH:MM:SS" - treat as UTC (ISO format without timezone)
      date = new Date(dateString + 'Z')
    } else {
      // Other formats (ISO with timezone, etc.) - let JavaScript handle it
      date = new Date(dateString)
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`
    }
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    }
    
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }
    
    if (diffDays < 7) {
      return `${diffDays}d ago`
    }
    
    // For older dates, show the actual date
    return formatDate(dateString)
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Format operation type for display.
 */
export const formatOperationType = (operationType: string): string => {
  const typeMap: Record<string, string> = {
    'parse_cv': 'Parse CV',
    'generate_section': 'Generate Section',
    'job_fit_analysis': 'Job Fit Analysis',
    'enhance_content': 'Enhance Content',
    'ats_optimization': 'ATS Optimization',
    'generate_suggestions': 'Generate Suggestions',
    'extract_job_description': 'Extract Job Description'
  }
  
  return typeMap[operationType] || operationType
}

/**
 * Format model name for display.
 */
export const formatModelName = (model: string): string => {
  const modelMap: Record<string, string> = {
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4o': 'GPT-4o',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano'
  }
  
  return modelMap[model] || model
}

/**
 * Get color for operation type (for charts).
 */
export const getOperationTypeColor = (operationType: string): string => {
  const colorMap: Record<string, string> = {
    'parse_cv': '#8884d8',
    'generate_section': '#82ca9d',
    'job_fit_analysis': '#ffc658',
    'enhance_content': '#ff7300',
    'ats_optimization': '#00ff00',
    'generate_suggestions': '#0088fe',
    'extract_job_description': '#ff00ff'
  }
  
  return colorMap[operationType] || '#8884d8'
}

/**
 * Format success status for display.
 */
export const formatSuccessStatus = (success: boolean): { text: string; color: 'success' | 'error' } => {
  return success 
    ? { text: 'Success', color: 'success' as const }
    : { text: 'Failed', color: 'error' as const }
}

/**
 * Format file size in bytes to human-readable format.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
