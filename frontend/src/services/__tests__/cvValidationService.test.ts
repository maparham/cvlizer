/**
 * Unit tests for CV Validation Service
 */
import { CVValidationService } from '../cvValidationService'
import { CVData } from '../../types'

describe('CVValidationService', () => {
  const mockCVData: CVData = {
    personal_info: {
      full_name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      location: "New York, NY",
      linkedin_url: "https://linkedin.com/in/johndoe",
      website_url: "https://johndoe.com"
    },
    professional_summary: {
      content: "Experienced software developer with 5+ years of experience",
      keywords: ["JavaScript", "React", "Node.js"]
    },
    work_experience: [
      {
        company: "Tech Corp",
        position: "Senior Developer",
        start_date: "2020-01",
        end_date: "2023-12",
        description: "Led development team"
      }
    ],
    education: [],
    skills: {
      technical: ["JavaScript", "React", "Python"],
      soft: ["Leadership", "Communication"],
      languages: ["English", "Spanish"]
    },
    certifications: [],
    projects: [],
    awards: [],
    publications: [],
    volunteer_experience: []
  }

  describe('cleanForBackend', () => {
    it('should preserve valid sections', () => {
      const result = CVValidationService.cleanForBackend(mockCVData)
      
      expect(result.personal_info).toBeDefined()
      expect(result.professional_summary).toBeDefined()
      expect(result.skills).toBeDefined()
      expect(result.work_experience).toBeDefined()
    })

    it('should remove professional summary with empty content', () => {
      const invalidData = {
        ...mockCVData,
        professional_summary: { content: "", keywords: [] }
      }
      
      const result = CVValidationService.cleanForBackend(invalidData)
      
      expect(result.professional_summary).toBeUndefined()
    })

    it('should remove professional summary with short content', () => {
      const invalidData = {
        ...mockCVData,
        professional_summary: { content: "Short", keywords: [] }
      }
      
      const result = CVValidationService.cleanForBackend(invalidData)
      
      expect(result.professional_summary).toBeUndefined()
    })

    it('should remove personal info with missing required fields', () => {
      const invalidData = {
        ...mockCVData,
        personal_info: {
          full_name: "",
          email: "test@example.com",
          phone: "",
          location: "New York",
          linkedin_url: "",
          website_url: ""
        }
      }
      
      const result = CVValidationService.cleanForBackend(invalidData)
      
      expect(result.personal_info).toBeUndefined()
    })

    it('should remove skills with no technical or soft skills', () => {
      const invalidData = {
        ...mockCVData,
        skills: {
          technical: [],
          soft: [],
          languages: ["English"]
        }
      }
      
      const result = CVValidationService.cleanForBackend(invalidData)
      
      expect(result.skills).toBeUndefined()
    })

    it('should preserve skills with only technical skills', () => {
      const validData = {
        ...mockCVData,
        skills: {
          technical: ["JavaScript"],
          soft: [],
          languages: []
        }
      }
      
      const result = CVValidationService.cleanForBackend(validData)
      
      expect(result.skills).toBeDefined()
      expect(result.skills.technical).toEqual(["JavaScript"])
    })

    it('should preserve skills with only soft skills', () => {
      const validData = {
        ...mockCVData,
        skills: {
          technical: [],
          soft: ["Leadership"],
          languages: []
        }
      }
      
      const result = CVValidationService.cleanForBackend(validData)
      
      expect(result.skills).toBeDefined()
      expect(result.skills.soft).toEqual(["Leadership"])
    })
  })

  describe('validateSection', () => {
    it('should validate personal_info section correctly', () => {
      const result = CVValidationService.validateSection('personal_info', mockCVData.personal_info)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid personal_info', () => {
      const invalidPersonalInfo = {
        full_name: "",
        email: "invalid-email",
        location: ""
      }
      
      const result = CVValidationService.validateSection('personal_info', invalidPersonalInfo)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate professional_summary section correctly', () => {
      const result = CVValidationService.validateSection('professional_summary', mockCVData.professional_summary)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for short professional summary', () => {
      const invalidSummary = { content: "Short", keywords: [] }
      
      const result = CVValidationService.validateSection('professional_summary', invalidSummary)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Professional summary must be at least 10 characters long')
    })
  })

  describe('validateItem', () => {
    const mockItem = {
      title: "Test Project",
      description: "A test project description",
      start_date: "2023-01"
    }

    it('should validate item with all required fields', () => {
      const result = CVValidationService.validateItem(
        mockItem, 
        ['title', 'description'], 
        'Projects'
      )
      
      expect(result).toBe(true)
    })

    it('should return false for item with missing required fields', () => {
      const invalidItem = {
        title: "",
        description: "A test project description"
      }
      
      const result = CVValidationService.validateItem(
        invalidItem, 
        ['title', 'description'], 
        'Projects'
      )
      
      expect(result).toBe(false)
    })

    it('should return false for null item', () => {
      const result = CVValidationService.validateItem(
        null, 
        ['title'], 
        'Projects'
      )
      
      expect(result).toBe(false)
    })
  })

  describe('validateTitle', () => {
    it('should validate normal title', () => {
      const result = CVValidationService.validateTitle('My CV Title')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return error for empty title', () => {
      const result = CVValidationService.validateTitle('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title cannot be empty')
    })

    it('should return error for title that is too long', () => {
      const longTitle = 'a'.repeat(300)
      const result = CVValidationService.validateTitle(longTitle)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title cannot exceed 255 characters')
    })

    it('should return warning for long title', () => {
      const longTitle = 'a'.repeat(220)
      const result = CVValidationService.validateTitle(longTitle)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('hasUnsavedChanges', () => {
    const originalData = { name: "John", age: 30 }

    it('should return false for identical objects', () => {
      const currentData = { name: "John", age: 30 }
      const result = CVValidationService.hasUnsavedChanges(currentData, originalData)
      
      expect(result).toBe(false)
    })

    it('should return true for different objects', () => {
      const currentData = { name: "Jane", age: 30 }
      const result = CVValidationService.hasUnsavedChanges(currentData, originalData)
      
      expect(result).toBe(true)
    })

    it('should return true for objects with different nested properties', () => {
      const originalData = { person: { name: "John" } }
      const currentData = { person: { name: "Jane" } }
      const result = CVValidationService.hasUnsavedChanges(currentData, originalData)
      
      expect(result).toBe(true)
    })
  })
})
