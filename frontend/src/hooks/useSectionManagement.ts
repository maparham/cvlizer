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
  updateSectionTitle: (sectionId: string, newTitle: string) => void
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

    // Special case for why_good_fit - if it's null, it should be considered empty/deleted
    if (sectionId === 'why_good_fit' && data === null) {
      return true
    }

    // Check if array is empty
    if (Array.isArray(data)) {
      return data.length === 0
    }

    // Check if object is empty
    if (typeof data === 'object') {
      // Personal info should always be visible in new CVs (it's a core required section)
      if (sectionId === 'personal_info') {
        // Always show personal_info if it exists (even if fields are empty)
        return false
      }

      // For other object sections, check if they have meaningful content
      if (sectionId === 'professional_summary') {
        const summary = data as { content?: string; keywords?: string[] }
        return !summary.content || summary.content.trim() === ''
      }

      if (sectionId === 'skills') {
        const skills = data as { technical?: string[]; soft?: string[]; languages?: string[] }
        return (!skills.technical || skills.technical.length === 0) &&
               (!skills.soft || skills.soft.length === 0) &&
               (!skills.languages || skills.languages.length === 0)
      }

      if (sectionId === 'why_good_fit') {
        const whyGoodFit = data as { content?: string; fit_analysis?: string }
        // Section is empty if neither content nor fit_analysis exists or is populated
        const isEmpty = (!whyGoodFit.content || whyGoodFit.content.trim() === '') &&
               (!whyGoodFit.fit_analysis || whyGoodFit.fit_analysis.trim() === '');
        return isEmpty;
      }

      // Generic object check (fallback)
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
        return !isSectionEmpty(section.id, cvData)
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

    // Also include AI-generated sections that have data

    if (cvData.why_good_fit && !isSectionEmpty('why_good_fit', cvData)) {
      sections.push({
        id: 'why_good_fit',
        type: 'why_good_fit' as CVSectionType,
        title: 'Why I\'m a Good Fit',
        visible: true,
        order: order++
      })
    }

    return sections
  }, [isSectionEmpty])


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
        // Use the section configuration from the CV data, but filter out deleted sections
        const filteredSections = cvData.section_config.sections.filter(section => {
          // Keep the section if it's not why_good_fit or if why_good_fit has data
          if (section.id === 'why_good_fit') {
            return !isSectionEmpty('why_good_fit', cvData)
          }
          return true
        })
        setSections(filteredSections)
      } else {
        // Create sections from CV data (only sections with data)
        const newSections = createSectionsFromCVData(cvData)
        setSections(newSections)
      }
    }
  }, [cvData, createSectionsFromCVData, isSectionEmpty])

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

    // Handle AI-generated sections that are not in AVAILABLE_SECTIONS
    let sectionName = sectionDef?.name
    if (!sectionDef) {
      // Special handling for AI-generated sections
      if (sectionId === 'why_good_fit') {
        sectionName = 'Why I\'m a Good Fit'
      } else {
        // For unknown sections, use a generic name
        sectionName = sectionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
    }

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
        title: sectionName || sectionId,
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
      if (sectionId === 'skills') {
        (updatedCvData as any)[sectionId] = { technical: [], soft: [], languages: [] }
      } else if (sectionId === 'professional_summary') {
        (updatedCvData as any)[sectionId] = { content: "", keywords: [] }
      } else if (sectionId === 'personal_info') {
        (updatedCvData as any)[sectionId] = {
          full_name: "",
          email: "",
          phone: "",
          location: "",
          linkedin_url: "",
          website_url: ""
        }
      } else if (sectionId === 'why_good_fit') {
        // AI-generated section - don't initialize empty data, let it be null
        // The section will only be visible if there's actual data
        (updatedCvData as any)[sectionId] = null
      } else {
        // All other sections are arrays (work_experience, education, etc.)
        (updatedCvData as any)[sectionId] = []
      }
    }

    // Save both the section config and the updated CV data
    onSave(updatedCvData, existingSection ? `${sectionName} section restored` : `${sectionName} section added`)
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

  const updateSectionTitle = useCallback((sectionId: string, newTitle: string) => {
    // Update the section title in the sections array
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? { ...section, title: newTitle }
        : section
    )

    setSections(updatedSections)

    // Update the section configuration in CV data
    const updatedCvData = {
      ...cvData,
      section_config: {
        sections: updatedSections
      }
    }

    onSave(updatedCvData, 'Section title updated')
  }, [sections, cvData, onSave])

  return {
    sections,
    setSections,
    toggleSectionVisibility,
    addNewSection,
    removeSection,
    reorderSections,
    resetToDefaultOrder,
    isDefaultOrder,
    getAvailableSectionsToAdd,
    updateSectionTitle
  }
}
