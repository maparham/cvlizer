/**
 * Advanced validation utilities for CV components
 */

export interface ValidationRule {
  field: string
  validator: (value: any, allData: any) => boolean
  message: string
}

export interface CrossFieldValidation {
  fields: string[]
  validator: (data: any) => boolean
  message: string
}

/**
 * Common validation rules for CV fields
 */
export const createValidationRules = (): ValidationRule[] => [
  {
    field: 'email',
    validator: (value) => {
      if (!value) return true // Optional field
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message: 'Please enter a valid email address'
  },
  {
    field: 'phone',
    validator: (value) => {
      if (!value) return true // Optional field
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))
    },
    message: 'Please enter a valid phone number'
  },
  {
    field: 'linkedin_url',
    validator: (value) => {
      if (!value) return true // Optional field
      const urlRegex = /^https?:\/\/.+\..+/
      return urlRegex.test(value)
    },
    message: 'Please enter a valid LinkedIn URL'
  },
  {
    field: 'github_url',
    validator: (value) => {
      if (!value) return true // Optional field
      const urlRegex = /^https?:\/\/.+\..+/
      return urlRegex.test(value)
    },
    message: 'Please enter a valid GitHub URL'
  },
  {
    field: 'website_url',
    validator: (value) => {
      if (!value) return true // Optional field
      const urlRegex = /^https?:\/\/.+\..+/
      return urlRegex.test(value)
    },
    message: 'Please enter a valid website URL'
  }
]

/**
 * Cross-field validation rules
 */
export const createCrossFieldValidations = (): CrossFieldValidation[] => [
  {
    fields: ['start_date', 'end_date'],
    validator: (data) => {
      const startDate = data.start_date
      const endDate = data.end_date
      
      if (!startDate || !endDate) return true // Skip if either is missing
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      return start <= end
    },
    message: 'End date must be after start date'
  },
  {
    fields: ['current', 'end_date'],
    validator: (data) => {
      // If current is true, end_date should be empty or "Present"
      if (data.current) {
        return !data.end_date || data.end_date.toLowerCase() === 'present'
      }
      return true
    },
    message: 'End date should be empty when currently working'
  }
]

/**
 * Validate a single field
 */
export const validateField = (
  fieldName: string,
  value: any,
  allData: any,
  rules: ValidationRule[] = createValidationRules()
): { isValid: boolean; message?: string } => {
  const rule = rules.find(r => r.field === fieldName)
  if (!rule) return { isValid: true }
  
  const isValid = rule.validator(value, allData)
  return {
    isValid,
    message: isValid ? undefined : rule.message
  }
}

/**
 * Validate all fields in data
 */
export const validateAllFields = (
  data: any,
  rules: ValidationRule[] = createValidationRules()
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  let isValid = true
  
  rules.forEach(rule => {
    const value = data[rule.field]
    const validation = validateField(rule.field, value, data, rules)
    
    if (!validation.isValid) {
      errors[rule.field] = validation.message || 'Invalid value'
      isValid = false
    }
  })
  
  return { isValid, errors }
}

/**
 * Validate cross-field rules
 */
export const validateCrossFields = (
  data: any,
  crossFieldRules: CrossFieldValidation[] = createCrossFieldValidations()
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  crossFieldRules.forEach(rule => {
    if (!rule.validator(data)) {
      errors.push(rule.message)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Check for duplicate entries in array data
 */
export const checkForDuplicates = (
  items: any[],
  keyFields: string[]
): { hasDuplicates: boolean; duplicates: number[] } => {
  const seen = new Set<string>()
  const duplicates: number[] = []
  
  items.forEach((item, index) => {
    const key = keyFields.map(field => item[field] || '').join('|')
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

/**
 * Comprehensive validation for CV data
 */
export const validateCVData = (data: any): {
  isValid: boolean
  errors: Record<string, string>
  crossFieldErrors: string[]
  duplicates: { hasDuplicates: boolean; duplicates: number[] }
} => {
  // Validate individual fields
  const fieldValidation = validateAllFields(data)
  
  // Validate cross-field rules
  const crossFieldValidation = validateCrossFields(data)
  
  // Check for duplicates in array fields
  const arrayFields = ['work_experience', 'education', 'projects', 'awards', 'certifications']
  let duplicates = { hasDuplicates: false, duplicates: [] as number[] }
  
  arrayFields.forEach(field => {
    if (Array.isArray(data[field])) {
      const fieldDuplicates = checkForDuplicates(data[field], ['company', 'position'])
      if (fieldDuplicates.hasDuplicates) {
        duplicates.hasDuplicates = true
        duplicates.duplicates.push(...fieldDuplicates.duplicates)
      }
    }
  })
  
  return {
    isValid: fieldValidation.isValid && crossFieldValidation.isValid && !duplicates.hasDuplicates,
    errors: fieldValidation.errors,
    crossFieldErrors: crossFieldValidation.errors,
    duplicates
  }
}

/**
 * Get validation summary for display
 */
export const getValidationSummary = (validation: ReturnType<typeof validateCVData>): {
  hasErrors: boolean
  errorCount: number
  summary: string
} => {
  const fieldErrorCount = Object.keys(validation.errors).length
  const crossFieldErrorCount = validation.crossFieldErrors.length
  const duplicateCount = validation.duplicates.duplicates.length
  
  const totalErrors = fieldErrorCount + crossFieldErrorCount + duplicateCount
  
  let summary = ''
  if (fieldErrorCount > 0) {
    summary += `${fieldErrorCount} field error${fieldErrorCount > 1 ? 's' : ''}`
  }
  if (crossFieldErrorCount > 0) {
    summary += summary ? ', ' : ''
    summary += `${crossFieldErrorCount} validation error${crossFieldErrorCount > 1 ? 's' : ''}`
  }
  if (duplicateCount > 0) {
    summary += summary ? ', ' : ''
    summary += `${duplicateCount} duplicate entr${duplicateCount > 1 ? 'ies' : 'y'}`
  }
  
  return {
    hasErrors: totalErrors > 0,
    errorCount: totalErrors,
    summary: summary || 'All fields are valid'
  }
}
