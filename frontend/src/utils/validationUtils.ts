/**
 * Validation Utilities
 * 
 * This module provides utilities for parsing and handling CV validation errors from the backend.
 * It includes error parsing, formatting, and display utilities for user-friendly error messages.
 * 
 * Key responsibilities:
 * - Parse backend validation error messages into structured format
 * - Format validation errors for display in the UI
 * - Provide utilities for error handling and user feedback
 * 
 * Usage:
 * - Import parseValidationErrors to convert backend errors to structured format
 * - Use error formatting functions for consistent error display
 * - Integrate with validation error display components
 */

export interface ValidationError {
  section: string
  itemIndex?: number
  field: string
  message: string
}

/**
 * Parse validation error message into structured errors
 * Example: "CV validation failed:\n• Education #2: Start date is required"
 */
export const parseValidationErrors = (errorMessage: string): ValidationError[] => {
  if (!errorMessage.includes('CV validation failed:')) {
    return []
  }

  const lines = errorMessage.split('\n').slice(1) // Skip first line
  const errors: ValidationError[] = []

  for (const line of lines) {
    const cleanLine = line.replace('• ', '').trim()
    if (!cleanLine) continue

    // Parse patterns like "Education #2: Start date is required"
    const sectionMatch = cleanLine.match(/^(\w+)\s*#?(\d+)?:\s*(.+)$/)
    
    if (sectionMatch) {
      const [, section, itemIndex, message] = sectionMatch
      const field = extractFieldFromMessage(message)
      
      const error = {
        section: section.toLowerCase(),
        itemIndex: itemIndex ? parseInt(itemIndex) - 1 : undefined, // Convert to 0-based index
        field: field,
        message: message
      }
      
      errors.push(error)
    }
  }

  return errors
}

/**
 * Extract field name from validation message
 */
const extractFieldFromMessage = (message: string): string => {
  // Common patterns: "Start date is required", "End date is invalid"
  const fieldMatch = message.toLowerCase().match(/^(\w+(?:\s+\w+)*)\s+(?:is|are)\s+/)
  if (fieldMatch) {
    return fieldMatch[1].replace(' ', '_') // Convert "start date" to "start_date"
  }
  
  // Fallback: return first word
  return message.split(' ')[0].toLowerCase()
}

/**
 * Create error key for form field identification
 */
export const createErrorKey = (section: string, itemIndex?: number, field?: string): string => {
  if (itemIndex !== undefined && field) {
    return `${section}.${itemIndex}.${field}`
  }
  if (field) {
    return `${section}.${field}`
  }
  return section
}

/**
 * Check if a specific field has validation errors
 */
export const hasFieldError = (errors: ValidationError[], section: string, itemIndex?: number, field?: string): boolean => {
  return errors.some(error => 
    error.section === section &&
    (itemIndex === undefined || error.itemIndex === itemIndex) &&
    (field === undefined || error.field === field)
  )
}

/**
 * Get error message for a specific field
 */
export const getFieldError = (errors: ValidationError[], section: string, itemIndex?: number, field?: string): string | undefined => {
  const error = errors.find(error => 
    error.section === section &&
    (itemIndex === undefined || error.itemIndex === itemIndex) &&
    (field === undefined || error.field === field)
  )
  return error?.message
}

/**
 * Check if a section has any validation errors
 */
export const hasSectionErrors = (errors: ValidationError[], section: string): boolean => {
  return errors.some(error => error.section === section)
}

/**
 * Get count of validation errors for a section
 */
export const getSectionErrorCount = (errors: ValidationError[], section: string): number => {
  return errors.filter(error => error.section === section).length
}

/**
 * Validate CV data client-side and return validation errors
 */
export const validateCVData = (cvData: any): { isValid: boolean; errors: Record<string, string>; crossFieldErrors: string[]; duplicates: { hasDuplicates: boolean; duplicates: number[] } } => {
  const fieldErrors: Record<string, string> = {}
  const crossFieldErrors: string[] = []
  
  // Validate education section
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any, index: number) => {
      // Check required fields
      if (!edu.start_date || edu.start_date.trim() === '') {
        fieldErrors[`education.${index}.start_date`] = 'Start date is required'
      }
      
      if (!edu.degree || edu.degree.trim() === '') {
        fieldErrors[`education.${index}.degree`] = 'Degree is required'
      }
      
      if (!edu.institution || edu.institution.trim() === '') {
        fieldErrors[`education.${index}.institution`] = 'Institution is required'
      }
    })
  }
  
  // Validate work experience section
  if (cvData.work_experience && Array.isArray(cvData.work_experience)) {
    cvData.work_experience.forEach((work: any, index: number) => {
      if (!work.start_date || work.start_date.trim() === '') {
        fieldErrors[`work_experience.${index}.start_date`] = 'Start date is required'
      }
      
      if (!work.position || work.position.trim() === '') {
        fieldErrors[`work_experience.${index}.position`] = 'Position is required'
      }
      
      if (!work.company || work.company.trim() === '') {
        fieldErrors[`work_experience.${index}.company`] = 'Company is required'
      }
    })
  }
  
  // Run cross-field validation
  const crossFieldResult = validateCrossFields(cvData)
  crossFieldErrors.push(...crossFieldResult.errors)
  
  // Check for duplicates in work experience
  const workDuplicates = cvData.work_experience ? checkForDuplicates(cvData.work_experience, ['company', 'position']) : { hasDuplicates: false, duplicates: [] }
  
  // Check for duplicates in education
  const educationDuplicates = cvData.education ? checkForDuplicates(cvData.education, ['institution', 'degree']) : { hasDuplicates: false, duplicates: [] }
  
  const hasAnyDuplicates = workDuplicates.hasDuplicates || educationDuplicates.hasDuplicates
  const allDuplicates = [...workDuplicates.duplicates, ...educationDuplicates.duplicates]
  
  return {
    isValid: Object.keys(fieldErrors).length === 0 && crossFieldErrors.length === 0 && !hasAnyDuplicates,
    errors: fieldErrors,
    crossFieldErrors,
    duplicates: {
      hasDuplicates: hasAnyDuplicates,
      duplicates: allDuplicates
    }
  }
}

// Field validation functions
export interface FieldValidationResult {
  isValid: boolean
  message?: string
}

export const validateField = (fieldName: string, value: string, _data: any): FieldValidationResult => {
  switch (fieldName) {
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!value) return { isValid: true } // Optional field
      return {
        isValid: emailRegex.test(value),
        message: 'Please enter a valid email address'
      }
    }
    
    case 'phone': {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
      if (!value) return { isValid: true } // Optional field
      return {
        isValid: phoneRegex.test(value.replace(/[\s\-()]/g, '')),
        message: 'Please enter a valid phone number'
      }
    }
    
    case 'linkedin_url': {
      if (!value) return { isValid: true } // Optional field
      const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/
      return {
        isValid: linkedinRegex.test(value),
        message: 'Please enter a valid LinkedIn URL'
      }
    }
    
    case 'github_url': {
      if (!value) return { isValid: true } // Optional field
      const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/
      return {
        isValid: githubRegex.test(value),
        message: 'Please enter a valid GitHub URL'
      }
    }
    
    default:
      return { isValid: true }
  }
}

export const validateAllFields = (data: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  // Validate email
  const emailResult = validateField('email', data.email || '', data)
  if (!emailResult.isValid) {
    errors.email = emailResult.message || 'Invalid email'
  }
  
  // Validate phone
  const phoneResult = validateField('phone', data.phone || '', data)
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.message || 'Invalid phone'
  }
  
  // Validate LinkedIn URL
  const linkedinResult = validateField('linkedin_url', data.linkedin_url || '', data)
  if (!linkedinResult.isValid) {
    errors.linkedin_url = linkedinResult.message || 'Invalid LinkedIn URL'
  }
  
  // Validate GitHub URL
  const githubResult = validateField('github_url', data.github_url || '', data)
  if (!githubResult.isValid) {
    errors.github_url = githubResult.message || 'Invalid GitHub URL'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateCrossFields = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // Validate top-level date ranges (for direct field validation)
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)
    
    if (startDate >= endDate) {
      errors.push('End date must be after start date')
    }
  }
  
  // Validate current job logic (for direct field validation)
  if (data.current && data.end_date) {
    errors.push('End date should be empty when currently working')
  }
  
  // Validate work experience date ranges
  if (data.work_experience && Array.isArray(data.work_experience)) {
    data.work_experience.forEach((work: any, index: number) => {
      if (work.start_date && work.end_date) {
        const startDate = new Date(work.start_date)
        const endDate = new Date(work.end_date)
        
        if (startDate >= endDate) {
          errors.push(`Work experience #${index + 1}: End date must be after start date`)
        }
      }
      
      // Validate current job logic
      if (work.current && work.end_date) {
        errors.push(`Work experience #${index + 1}: End date should be empty when currently working`)
      }
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const checkForDuplicates = (items: any[], fields: string[]): { hasDuplicates: boolean; duplicates: number[] } => {
  const duplicates: number[] = []
  const seen = new Set<string>()
  
  items.forEach((item, index) => {
    const key = fields.map(field => item[field] || '').join('|')
    if (seen.has(key)) {
      duplicates.push(index)
    } else {
      seen.add(key)
    }
  })
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates
  }
}

export const getValidationSummary = (validation: { isValid: boolean; errors: Record<string, string>; crossFieldErrors: string[]; duplicates: { hasDuplicates: boolean; duplicates: number[] } }): { hasErrors: boolean; errorCount: number; summary: string } => {
  const fieldErrorCount = Object.keys(validation.errors).length
  const crossFieldErrorCount = validation.crossFieldErrors.length
  const duplicateCount = validation.duplicates.duplicates.length
  const totalErrors = fieldErrorCount + crossFieldErrorCount + duplicateCount
  
  let summary = 'All fields are valid'
  if (totalErrors > 0) {
    const parts = []
    if (fieldErrorCount > 0) parts.push(`${fieldErrorCount} field error${fieldErrorCount > 1 ? 's' : ''}`)
    if (crossFieldErrorCount > 0) parts.push(`${crossFieldErrorCount} cross-field error${crossFieldErrorCount > 1 ? 's' : ''}`)
    if (duplicateCount > 0) parts.push(`${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}`)
    summary = parts.join(', ')
  }
  
  return {
    hasErrors: totalErrors > 0,
    errorCount: totalErrors,
    summary
  }
}

export const createValidationRules = () => {
  return [
    { field: 'email', required: false, type: 'email' },
    { field: 'phone', required: false, type: 'phone' },
    { field: 'linkedin_url', required: false, type: 'url' },
    { field: 'github_url', required: false, type: 'url' },
    { field: 'website', required: false, type: 'url' }
  ]
}

export const createCrossFieldValidations = () => {
  return [
    { fields: ['start_date', 'end_date'], type: 'date_range' },
    { fields: ['current', 'end_date'], type: 'current_job' }
  ]
}