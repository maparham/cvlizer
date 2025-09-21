/**
 * Validation utilities for parsing and handling CV validation errors
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
export const validateCVData = (cvData: any): ValidationError[] => {
  const errors: ValidationError[] = []
  
  // Validate education section
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any, index: number) => {
      // Check required fields
      if (!edu.start_date || edu.start_date.trim() === '') {
        errors.push({
          section: 'education',
          itemIndex: index,
          field: 'start_date',
          message: 'Start date is required'
        })
      }
      
      if (!edu.degree || edu.degree.trim() === '') {
        errors.push({
          section: 'education',
          itemIndex: index,
          field: 'degree',
          message: 'Degree is required'
        })
      }
      
      if (!edu.institution || edu.institution.trim() === '') {
        errors.push({
          section: 'education',
          itemIndex: index,
          field: 'institution',
          message: 'Institution is required'
        })
      }
    })
  }
  
  // Validate work experience section
  if (cvData.work_experience && Array.isArray(cvData.work_experience)) {
    cvData.work_experience.forEach((work: any, index: number) => {
      if (!work.start_date || work.start_date.trim() === '') {
        errors.push({
          section: 'work_experience',
          itemIndex: index,
          field: 'start_date',
          message: 'Start date is required'
        })
      }
      
      if (!work.position || work.position.trim() === '') {
        errors.push({
          section: 'work_experience',
          itemIndex: index,
          field: 'position',
          message: 'Position is required'
        })
      }
      
      if (!work.company || work.company.trim() === '') {
        errors.push({
          section: 'work_experience',
          itemIndex: index,
          field: 'company',
          message: 'Company is required'
        })
      }
    })
  }
  
  return errors
}