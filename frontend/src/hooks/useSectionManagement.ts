import { useState, useEffect, useCallback } from 'react'
import { CVData, CVSection, CVSectionType } from '../types'
import { AVAILABLE_SECTIONS, getSectionsInDisplayOrder } from '../components/cv/constants'

interface SectionManagementState {
  sections: CVSection[]
  setSections: (sections: CVSection[]) => void
  toggleSectionVisibility: (sectionId: string) => void
  addNewSection: (sectionId: string) => void
  removeSection: (sectionId: string) => void
  reorderSections: (sections: CVSection[]) => void
  resetToDefaultOrder: () => void
  isDefaultOrder: () => boolean
  getAvailableSectionsToAdd: () => Array<{id: string; name: string}>
}

interface UseSectionManagementProps {
  cvData: CVData
  onSave: (updatedData: CVData, message?: string) => void
}

export const useSectionManagement = ({ 
  cvData, 
  onSave 
}: UseSectionManagementProps): SectionManagementState => {
  // Helper function to check if a section is empty
  const isSectionEmpty = useCallback((sectionId: string, cvData: CVData): boolean => {
    const data = cvData[sectionId as keyof CVData]
    if (!data) return true
    
    // Check if array is empty
    if (Array.isArray(data)) {
      return data.length === 0
    }
    
    // Check if object is empty
    if (typeof data === 'object') {
      return Object.keys(data).length === 0
    }
    
    return false
  }, [])

  // Function to create sections dynamically based on CV data
  const createSectionsFromCVData = useCallback((cvData: CVData): CVSection[] => {
    if (!cvData) return []
    
    const sections: CVSection[] = []
    let order = 0
    
    // Get sections that have data in the CV
    const sectionsWithData = getSectionsInDisplayOrder(
      AVAILABLE_SECTIONS.filter(section => {
        const data = cvData[section.id as keyof CVData]
        return data && (
          (Array.isArray(data) && data.length > 0) ||
          (typeof data === 'object' && Object.keys(data).length > 0)
        )
      }).map(s => s.id)
    )
    
    sectionsWithData.forEach(sectionDef => {
      sections.push({
        id: sectionDef.id,
        type: sectionDef.id as CVSectionType,
        title: sectionDef.name,
        visible: true,
        order: order++
      })
    })
    return sections
  }, [])


  // Initialize sections from CV data or use defaults
  const [sections, setSections] = useState<CVSection[]>(() => {
    if (cvData?.section_config?.sections) {
      return cvData.section_config.sections
    }
    return createSectionsFromCVData(cvData)
  })

  // Update sections when cvData changes
  useEffect(() => {
    if (cvData) {
      if (cvData.section_config?.sections) {
        // Use the section configuration from the CV data
        setSections(cvData.section_config.sections)
      } else {
        // Create sections from CV data (only sections with data)
        const newSections = createSectionsFromCVData(cvData)
        setSections(newSections)
      }
    }
  }, [cvData, createSectionsFromCVData])

  const toggleSectionVisibility = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    let updatedSections: CVSection[]
    let updatedCvData: CVData
    let message: string
    
    if (section.visible) {
      // Hiding: check if section is empty
      if (isSectionEmpty(sectionId, cvData)) {
        // Empty section: delete it entirely
        updatedSections = sections.filter(s => s.id !== sectionId)
        
        // Remove the section data from CV data and update section config
        updatedCvData = { 
          ...cvData,
          section_config: {
            sections: updatedSections
          }
        }
        delete (updatedCvData as any)[sectionId]
        
        message = 'Empty section deleted'
      } else {
        // Non-empty section: just hide it
        updatedSections = sections.map(s => 
          s.id === sectionId 
            ? { ...s, visible: false }
            : s
        )
        
        updatedCvData = {
          ...cvData,
          section_config: {
            sections: updatedSections
          }
        }
        
        message = 'Section hidden'
      }
    } else {
      // Unhiding: make visible and move to end
      const visibleSections = sections.filter(s => s.visible)
      const maxOrder = visibleSections.length > 0 ? Math.max(...visibleSections.map(s => s.order)) : -1
      
      updatedSections = sections.map(s => 
        s.id === sectionId 
          ? { ...s, visible: true, order: maxOrder + 1 }
          : s
      )
      
      updatedCvData = {
        ...cvData,
        section_config: {
          sections: updatedSections
        }
      }
      
      message = 'Section restored to end'
    }
    
    setSections(updatedSections)
    onSave(updatedCvData, message)
  }, [sections, cvData, onSave, isSectionEmpty])

  const addNewSection = useCallback((sectionId: string) => {
    const sectionDef = AVAILABLE_SECTIONS.find(s => s.id === sectionId)
    if (!sectionDef) return

    // Check if section already exists but is hidden (soft removed)
    const existingSection = sections.find(s => s.id === sectionId)
    let updatedSections: CVSection[]

    if (existingSection) {
      // Restore the existing section by making it visible and moving to end
      const visibleSections = sections.filter(s => s.visible)
      const maxOrder = visibleSections.length > 0 ? Math.max(...visibleSections.map(s => s.order)) : -1
      
      updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { ...section, visible: true, order: maxOrder + 1 }
          : section
      )
    } else {
      // Create a new section at the end
      const visibleSections = sections.filter(s => s.visible)
      const maxOrder = visibleSections.length > 0 ? Math.max(...visibleSections.map(s => s.order)) : -1
      
      const newSection: CVSection = {
        id: sectionId,
        type: sectionId as CVSectionType,
        title: sectionDef.name,
        visible: true,
        order: maxOrder + 1
      }
      updatedSections = [...sections, newSection]
    }

    setSections(updatedSections)
    
    // Only initialize empty data if it's a completely new section
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: updatedSections
      }
    }

    // If it's a new section, initialize empty data
    if (!existingSection) {
      (updatedCvData as any)[sectionId] = sectionId === 'skills' ? { technical: [], soft: [] } : []
    }
    
    // Save both the section config and the updated CV data
    onSave(updatedCvData, existingSection ? `${sectionDef.name} section restored` : `${sectionDef.name} section added`)
  }, [sections, cvData, onSave])

  const removeSection = useCallback((sectionId: string) => {
    // Soft remove: just hide the section, don't delete data
    const updatedSections = sections.map(section => 
      section.id === sectionId 
        ? { ...section, visible: false }
        : section
    )
    setSections(updatedSections)
    
    // Update the section configuration in CV data (preserve all content)
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: updatedSections
      }
      // Don't remove the actual data - keep it for restoration
    }
    
    onSave(updatedCvData, 'Section hidden')
  }, [sections, cvData, onSave])

  const reorderSections = useCallback((newSections: CVSection[]) => {
    // Update order property
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      order: index
    }))
    
    setSections(updatedSections)
    
    // Update the section configuration in CV data
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: updatedSections
      }
    }
    
    onSave(updatedCvData, 'Section order updated')
  }, [cvData, onSave])

  const resetToDefaultOrder = useCallback(() => {
    const defaultSections = createSectionsFromCVData(cvData)
    setSections(defaultSections)
    
    // Update the section configuration in CV data
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: defaultSections
      }
    }
    
    onSave(updatedCvData, 'Section order reset to default')
  }, [cvData, createSectionsFromCVData, onSave])

  const getAvailableSectionsToAdd = useCallback(() => {
    // Get all sections that exist (both visible and hidden) - they should not appear in available sections
    const existingSectionIds = sections.map(s => s.id)
    
    const available = AVAILABLE_SECTIONS
      .filter(section => !existingSectionIds.includes(section.id))
      .map(section => ({
        id: section.id,
        name: section.name,
        icon: section.icon,
        description: section.description
      }))
    
    return available
  }, [sections])

  const isDefaultOrder = useCallback(() => {
    const defaultSections = createSectionsFromCVData(cvData)
    return sections.every((section, index) => 
      defaultSections[index] && 
      section.id === defaultSections[index].id && 
      section.order === index
    )
  }, [sections, cvData, createSectionsFromCVData])

  return {
    sections,
    setSections,
    toggleSectionVisibility,
    addNewSection,
    removeSection,
    reorderSections,
    resetToDefaultOrder,
    isDefaultOrder,
    getAvailableSectionsToAdd
  }
}
