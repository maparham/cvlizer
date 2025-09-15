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

  // Function to save section configuration
  const saveSectionConfig = useCallback((updatedSections: CVSection[], message?: string) => {
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: updatedSections
      }
    }
    onSave(updatedCvData, message)
  }, [cvData, onSave])

  // Initialize sections from CV data or use defaults
  const [sections, setSections] = useState<CVSection[]>(() => {
    if (cvData?.section_config?.sections) {
      return cvData.section_config.sections
    }
    return createSectionsFromCVData(cvData)
  })

  // Update sections when cvData changes
  useEffect(() => {
    if (cvData?.section_config?.sections) {
      setSections(cvData.section_config.sections)
    } else if (cvData) {
      const newSections = createSectionsFromCVData(cvData)
      setSections(newSections)
      // Don't automatically save section configuration on initial load
      // Only save when user explicitly makes changes
    }
  }, [cvData, createSectionsFromCVData])

  const toggleSectionVisibility = useCallback((sectionId: string) => {
    const updatedSections = sections.map(section => 
      section.id === sectionId 
        ? { ...section, visible: !section.visible }
        : section
    )
    setSections(updatedSections)
    saveSectionConfig(updatedSections, 'Section visibility updated')
  }, [sections, saveSectionConfig])

  const addNewSection = useCallback((sectionId: string) => {
    const sectionDef = AVAILABLE_SECTIONS.find(s => s.id === sectionId)
    if (!sectionDef) return

    const newSection: CVSection = {
      id: sectionId,
      type: sectionId as CVSectionType,
      title: sectionDef.name,
      visible: true,
      order: sections.length
    }

    const updatedSections = [...sections, newSection]
    setSections(updatedSections)
    saveSectionConfig(updatedSections, `${sectionDef.name} section added`)
  }, [sections, saveSectionConfig])

  const removeSection = useCallback((sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId)
    // Update order property
    const reorderedSections = updatedSections.map((section, index) => ({
      ...section,
      order: index
    }))
    setSections(reorderedSections)
    saveSectionConfig(reorderedSections, 'Section removed')
  }, [sections, saveSectionConfig])

  const reorderSections = useCallback((newSections: CVSection[]) => {
    // Update order property
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      order: index
    }))
    
    setSections(updatedSections)
    saveSectionConfig(updatedSections, 'Section order updated')
  }, [saveSectionConfig])

  const resetToDefaultOrder = useCallback(() => {
    const defaultSections = createSectionsFromCVData(cvData)
    setSections(defaultSections)
    saveSectionConfig(defaultSections, 'Section order reset to default')
  }, [cvData, createSectionsFromCVData, saveSectionConfig])

  const getAvailableSectionsToAdd = useCallback(() => {
    const existingSectionIds = sections.map(s => s.id)
    return AVAILABLE_SECTIONS
      .filter(section => !existingSectionIds.includes(section.id))
      .map(section => ({
        id: section.id,
        name: section.name
      }))
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
