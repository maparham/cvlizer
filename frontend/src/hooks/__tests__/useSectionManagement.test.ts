import { renderHook, act } from '@testing-library/react'
import { useSectionManagement } from '../useSectionManagement'
import { createMockCVData, createMockSection } from '../../test-utils'

// Mock the constants
jest.mock('../../components/cv/constants', () => ({
  AVAILABLE_SECTIONS: [
    { id: 'personal_info', name: 'Personal Information', description: 'Contact details', component: 'PersonalInfoSection', category: 'core' },
    { id: 'professional_summary', name: 'Professional Summary', description: 'Career summary', component: 'ProfessionalSummarySection', category: 'core' },
    { id: 'work_experience', name: 'Work Experience', description: 'Employment history', component: 'WorkExperienceSection', category: 'experience' },
    { id: 'education', name: 'Education', description: 'Academic background', component: 'EducationSection', category: 'core' },
    { id: 'skills', name: 'Skills', description: 'Technical skills', component: 'SkillsSection', category: 'core' },
    { id: 'certifications', name: 'Certifications', description: 'Professional certifications', component: 'CertificationsSection', category: 'achievements' }
  ],
  getSectionsInDisplayOrder: jest.fn((sectionIds) => 
    sectionIds.map((id: string) => ({ 
      id, 
      name: id.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) 
    }))
  )
}))

describe('useSectionManagement', () => {
  const mockOnSave = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize sections from CV data', () => {
      const cvData = createMockCVData()
      
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      expect(result.current.sections).toHaveLength(5) // Based on mock CV data
      expect(result.current.sections[0].id).toBe('personal_info')
      expect(result.current.sections[0].visible).toBe(true)
      expect(result.current.sections[0].order).toBe(0)
    })

    it('should use existing section config if available', () => {
      const existingSections = [
        createMockSection({ id: 'work_experience', order: 0 }),
        createMockSection({ id: 'personal_info', order: 1 })
      ]
      
      const cvData = createMockCVData({
        section_config: { sections: existingSections }
      })
      
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      expect(result.current.sections).toEqual(existingSections)
    })
  })

  describe('toggleSectionVisibility', () => {
    it('should toggle section visibility', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const initialVisibility = result.current.sections[0].visible

      act(() => {
        result.current.toggleSectionVisibility('personal_info')
      })

      expect(result.current.sections[0].visible).toBe(!initialVisibility)
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          section_config: {
            sections: expect.arrayContaining([
              expect.objectContaining({
                id: 'personal_info',
                visible: !initialVisibility
              })
            ])
          }
        }),
        'Section visibility updated'
      )
    })
  })

  describe('addNewSection', () => {
    it('should add a new section', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const initialLength = result.current.sections.length

      act(() => {
        result.current.addNewSection('certifications')
      })

      expect(result.current.sections).toHaveLength(initialLength + 1)
      expect(result.current.sections[initialLength]).toEqual(
        expect.objectContaining({
          id: 'certifications',
          type: 'certifications',
          title: 'Certifications',
          visible: true,
          order: initialLength
        })
      )
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.anything(),
        'Certifications section added'
      )
    })

    it('should not add section if it does not exist in AVAILABLE_SECTIONS', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const initialLength = result.current.sections.length

      act(() => {
        result.current.addNewSection('nonexistent_section')
      })

      expect(result.current.sections).toHaveLength(initialLength)
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('removeSection', () => {
    it('should remove a section and reorder', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const initialLength = result.current.sections.length
      const sectionToRemove = result.current.sections[1].id

      act(() => {
        result.current.removeSection(sectionToRemove)
      })

      expect(result.current.sections).toHaveLength(initialLength - 1)
      expect(result.current.sections.find(s => s.id === sectionToRemove)).toBeUndefined()
      
      // Check that order properties are updated correctly
      result.current.sections.forEach((section, index) => {
        expect(section.order).toBe(index)
      })
      
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.anything(),
        'Section removed'
      )
    })
  })

  describe('reorderSections', () => {
    it('should reorder sections and update order properties', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const originalSections = [...result.current.sections]
      const reorderedSections = [originalSections[1], originalSections[0], ...originalSections.slice(2)]

      act(() => {
        result.current.reorderSections(reorderedSections)
      })

      expect(result.current.sections[0].id).toBe(originalSections[1].id)
      expect(result.current.sections[1].id).toBe(originalSections[0].id)
      
      // Check that order properties are updated
      result.current.sections.forEach((section, index) => {
        expect(section.order).toBe(index)
      })

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.anything(),
        'Section order updated'
      )
    })
  })

  describe('resetToDefaultOrder', () => {
    it('should reset to default order', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      // First reorder sections
      const originalSections = [...result.current.sections]
      const reorderedSections = [originalSections[1], originalSections[0]]

      act(() => {
        result.current.reorderSections(reorderedSections)
      })

      // Then reset to default
      act(() => {
        result.current.resetToDefaultOrder()
      })

      expect(mockOnSave).toHaveBeenLastCalledWith(
        expect.anything(),
        'Section order reset to default'
      )
    })
  })

  describe('getAvailableSectionsToAdd', () => {
    it('should return sections not already in the list', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const available = result.current.getAvailableSectionsToAdd()
      const existingSectionIds = result.current.sections.map(s => s.id)

      expect(available).toHaveLength(1) // Only certifications should be available
      expect(available[0].id).toBe('certifications')
      expect(existingSectionIds).not.toContain('certifications')
    })
  })

  describe('isDefaultOrder', () => {
    it('should return true for default order', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      expect(result.current.isDefaultOrder()).toBe(true)
    })

    it('should return false for non-default order', () => {
      const cvData = createMockCVData()
      const { result } = renderHook(() =>
        useSectionManagement({ cvData, onSave: mockOnSave })
      )

      const originalSections = [...result.current.sections]
      const reorderedSections = [originalSections[1], originalSections[0], ...originalSections.slice(2)]

      act(() => {
        result.current.reorderSections(reorderedSections)
      })

      expect(result.current.isDefaultOrder()).toBe(false)
    })
  })
})
