/**
 * CV Validation Service
 * 
 * Centralized validation logic for CV data processing, cleaning, and validation.
 * This service handles data transformation between frontend and backend formats,
 * ensuring data integrity and proper validation before API calls.
 */

import { CVData } from '../types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CleaningOptions {
  removeEmptyStrings?: boolean
  removeEmptyArrays?: boolean
  trimStrings?: boolean
  validateRequired?: boolean
}

/**
 * Main CV validation and cleaning service
 */
export class CVValidationService {
  /**
   * Clean CV data before sending to backend
   * Removes sections that would fail backend validation
   */
  static cleanForBackend(cvData: CVData, options: CleaningOptions = {}): any {
    const cleaner = new CVDataCleaner(cvData, {
      removeEmptyStrings: true,
      removeEmptyArrays: true,
      trimStrings: true,
      validateRequired: true,
      ...options
    })
    
    return cleaner.clean()
  }

  /**
   * Validate a CV section against its requirements
   */
  static validateSection(sectionName: string, data: any): ValidationResult {
    const validator = SectionValidatorFactory.getValidator(sectionName)
    return validator.validate(data)
  }

  /**
   * Validate individual item in a collection
   */
  static validateItem<T>(
    item: T | null,
    requiredFields: (keyof T)[],
    sectionTitle: string
  ): boolean {
    if (!item) return false

    return requiredFields.every(field => {
      const value = item[field]
      return value !== undefined && value !== null && value !== ''
    })
  }

  /**
   * Validate CV title
   */
  static validateTitle(title: string, maxLength: number = 255): ValidationResult {
    const trimmed = title.trim()
    const errors: string[] = []
    const warnings: string[] = []

    if (!trimmed) {
      errors.push('Title cannot be empty')
    }

    if (trimmed.length > maxLength) {
      errors.push(`Title cannot exceed ${maxLength} characters`)
    }

    if (trimmed.length > maxLength * 0.8) {
      warnings.push('Title is quite long, consider shortening it')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check if CV data has unsaved changes
   */
  static hasUnsavedChanges<T>(current: T, original: T): boolean {
    return JSON.stringify(current) !== JSON.stringify(original)
  }
}

/**
 * CV Data Cleaner - handles data transformation and cleaning
 */
class CVDataCleaner {
  private data: CVData
  private options: Required<CleaningOptions>

  constructor(data: CVData, options: Required<CleaningOptions>) {
    this.data = { ...data }
    this.options = options
  }

  clean(): any {
    const cleanedData: any = { ...this.data }

    // Clean professional summary
    this.cleanProfessionalSummary(cleanedData)
    
    // Clean personal info
    this.cleanPersonalInfo(cleanedData)
    
    // Clean skills
    this.cleanSkills(cleanedData)
    
    // Clean array sections
    this.cleanArraySections(cleanedData)

    return cleanedData
  }

  private cleanProfessionalSummary(data: any): void {
    if (data.professional_summary) {
      const content = this.cleanString(data.professional_summary.content)
      
      // Backend requires min 10 characters for professional summary
      if (!content || content.length < 10) {
        delete data.professional_summary
      } else {
        data.professional_summary.content = content
      }
    }
  }

  private cleanPersonalInfo(data: any): void {
    if (data.personal_info) {
      const { full_name, email, location } = data.personal_info
      
      // Clean strings
      const cleanedFullName = this.cleanString(full_name)
      const cleanedEmail = this.cleanString(email)
      const cleanedLocation = this.cleanString(location)
      
      // Backend requires these fields to be non-empty
      if (!cleanedFullName || !cleanedEmail || !cleanedLocation) {
        delete data.personal_info
      } else {
        data.personal_info = {
          ...data.personal_info,
          full_name: cleanedFullName,
          email: cleanedEmail,
          location: cleanedLocation,
          phone: this.cleanString(data.personal_info.phone) || '',
          linkedin_url: this.cleanString(data.personal_info.linkedin_url) || '',
          website_url: this.cleanString(data.personal_info.website_url) || ''
        }
      }
    }
  }

  private cleanSkills(data: any): void {
    if (data.skills) {
      const technical = this.cleanArray(data.skills.technical)
      const soft = this.cleanArray(data.skills.soft)
      const languages = this.cleanArray(data.skills.languages)
      
      // Backend requires at least one technical or soft skill
      if (technical.length === 0 && soft.length === 0) {
        delete data.skills
      } else {
        data.skills = {
          technical,
          soft,
          languages
        }
      }
    }
  }

  private cleanArraySections(data: any): void {
    const arraySections = [
      'work_experience',
      'education', 
      'certifications',
      'projects',
      'awards',
      'publications',
      'volunteer_experience'
    ]

    arraySections.forEach(section => {
      if (data[section]) {
        const cleaned = this.cleanArray(data[section])
        if (cleaned.length === 0 && this.options.removeEmptyArrays) {
          delete data[section]
        } else {
          data[section] = cleaned
        }
      }
    })
  }

  private cleanString(value: any): string {
    if (typeof value !== 'string') return ''
    
    let cleaned = value
    
    if (this.options.trimStrings) {
      cleaned = cleaned.trim()
    }
    
    if (this.options.removeEmptyStrings && cleaned === '') {
      return ''
    }
    
    return cleaned
  }

  private cleanArray(arr: any[]): any[] {
    if (!Array.isArray(arr)) return []
    
    return arr.filter(item => {
      if (item === null || item === undefined) return false
      if (typeof item === 'string') return this.cleanString(item) !== ''
      if (typeof item === 'object') return Object.keys(item).length > 0
      return true
    })
  }
}

/**
 * Abstract base class for section validators
 */
abstract class SectionValidator {
  abstract validate(data: any): ValidationResult
  
  protected createResult(isValid: boolean, errors: string[] = [], warnings: string[] = []): ValidationResult {
    return { isValid, errors, warnings }
  }
}

/**
 * Personal Info section validator
 */
class PersonalInfoValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data) {
      return this.createResult(false, ['Personal info is required'])
    }

    if (!data.full_name?.trim()) {
      errors.push('Full name is required')
    }

    if (!data.email?.trim()) {
      errors.push('Email is required')
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format')
    }

    if (!data.location?.trim()) {
      errors.push('Location is required')
    }

    if (data.linkedin_url && !this.isValidUrl(data.linkedin_url)) {
      warnings.push('LinkedIn URL format may be invalid')
    }

    if (data.website_url && !this.isValidUrl(data.website_url)) {
      warnings.push('Website URL format may be invalid')
    }

    return this.createResult(errors.length === 0, errors, warnings)
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Professional Summary validator
 */
class ProfessionalSummaryValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data?.content?.trim()) {
      return this.createResult(false, ['Professional summary content is required'])
    }

    const content = data.content.trim()
    
    if (content.length < 10) {
      errors.push('Professional summary must be at least 10 characters long')
    }

    if (content.length < 50) {
      warnings.push('Professional summary is quite short, consider expanding it')
    }

    if (content.length > 500) {
      warnings.push('Professional summary is quite long, consider condensing it')
    }

    return this.createResult(errors.length === 0, errors, warnings)
  }
}

/**
 * Skills section validator
 */
class SkillsValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data) {
      return this.createResult(false, ['Skills section is required'])
    }

    const technical = Array.isArray(data.technical) ? data.technical : []
    const soft = Array.isArray(data.soft) ? data.soft : []

    if (technical.length === 0 && soft.length === 0) {
      errors.push('At least one technical or soft skill is required')
    }

    if (technical.length === 0) {
      warnings.push('Consider adding technical skills')
    }

    if (soft.length === 0) {
      warnings.push('Consider adding soft skills')
    }

    return this.createResult(errors.length === 0, errors, warnings)
  }
}

/**
 * Factory for creating section validators
 */
class SectionValidatorFactory {
  private static validators: Map<string, SectionValidator> = new Map([
    ['personal_info', new PersonalInfoValidator()],
    ['professional_summary', new ProfessionalSummaryValidator()],
    ['skills', new SkillsValidator()]
  ])

  static getValidator(sectionName: string): SectionValidator {
    return this.validators.get(sectionName) || new DefaultValidator()
  }
}

/**
 * Default validator for sections without specific validation rules
 */
class DefaultValidator extends SectionValidator {
  validate(data: any): ValidationResult {
    return this.createResult(true) // Always valid for sections without specific rules
  }
}

// Export utility functions for backward compatibility
export const cleanCVDataForBackend = CVValidationService.cleanForBackend
export const validateItem = CVValidationService.validateItem
export const hasUnsavedChanges = CVValidationService.hasUnsavedChanges
