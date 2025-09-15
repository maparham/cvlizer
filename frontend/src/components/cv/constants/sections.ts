/**
 * Predefined CV section registry
 * 
 * This file defines all available CV sections that can be displayed or added.
 * The backend AI will map imported CV content to these predefined section names.
 */

export interface SectionDefinition {
  id: string
  name: string
  description: string
  component: string // Component name for dynamic import
  icon?: string
  category: 'core' | 'experience' | 'achievements' | 'additional'
}

export const AVAILABLE_SECTIONS: SectionDefinition[] = [
  // Core sections (always present in most CVs)
  {
    id: 'personal_info',
    name: 'Personal Information',
    description: 'Contact details, name, email, phone, location',
    component: 'PersonalInfoSection',
    icon: '👤',
    category: 'core'
  },
  {
    id: 'professional_summary',
    name: 'Professional Summary',
    description: 'Career summary, objective, profile statement',
    component: 'ProfessionalSummarySection',
    icon: '📝',
    category: 'core'
  },
  
  // Experience sections
  {
    id: 'work_experience',
    name: 'Work Experience',
    description: 'Employment history, jobs, positions held',
    component: 'WorkExperienceSection',
    icon: '💼',
    category: 'experience'
  },
  {
    id: 'volunteer_experience',
    name: 'Volunteer Experience',
    description: 'Volunteer work, community service, nonprofit activities',
    component: 'VolunteerExperienceSection',
    icon: '🤝',
    category: 'experience'
  },
  
  // Education and skills
  {
    id: 'education',
    name: 'Education',
    description: 'Academic background, degrees, schools, universities',
    component: 'EducationSection',
    icon: '🎓',
    category: 'core'
  },
  {
    id: 'skills',
    name: 'Skills',
    description: 'Technical skills, soft skills, languages, competencies',
    component: 'SkillsSection',
    icon: '🛠️',
    category: 'core'
  },
  
  // Achievement sections
  {
    id: 'certifications',
    name: 'Certifications',
    description: 'Professional certifications, licenses, credentials',
    component: 'CertificationsSection',
    icon: '🏅',
    category: 'achievements'
  },
  {
    id: 'awards',
    name: 'Awards & Recognition',
    description: 'Honors, recognition, achievements, prizes',
    component: 'AwardsSection',
    icon: '🏆',
    category: 'achievements'
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Personal projects, portfolio items, side projects',
    component: 'ProjectsSection',
    icon: '🚀',
    category: 'achievements'
  },
  {
    id: 'publications',
    name: 'Publications',
    description: 'Research papers, articles, books, publications',
    component: 'PublicationsSection',
    icon: '📄',
    category: 'achievements'
  }
]

// Helper functions
export const getSectionById = (id: string): SectionDefinition | undefined => {
  return AVAILABLE_SECTIONS.find(section => section.id === id)
}

export const getSectionComponent = (id: string): string | undefined => {
  const section = getSectionById(id)
  return section?.component
}

export const getSectionsByCategory = (category: SectionDefinition['category']): SectionDefinition[] => {
  return AVAILABLE_SECTIONS.filter(section => section.category === category)
}

export const getAvailableSectionIds = (): string[] => {
  return AVAILABLE_SECTIONS.map(section => section.id)
}

// Section ordering for display
export const SECTION_DISPLAY_ORDER = [
  'personal_info',
  'professional_summary', 
  'work_experience',
  'education',
  'skills',
  'certifications',
  'projects',
  'awards',
  'publications',
  'volunteer_experience'
]

export const getSectionsInDisplayOrder = (sectionIds: string[]): SectionDefinition[] => {
  const orderedSections: SectionDefinition[] = []
  
  // Add sections in display order if they exist in the provided list
  SECTION_DISPLAY_ORDER.forEach(id => {
    if (sectionIds.includes(id)) {
      const section = getSectionById(id)
      if (section) {
        orderedSections.push(section)
      }
    }
  })
  
  // Add any remaining sections not in the display order
  sectionIds.forEach(id => {
    if (!SECTION_DISPLAY_ORDER.includes(id)) {
      const section = getSectionById(id)
      if (section && !orderedSections.find(s => s.id === id)) {
        orderedSections.push(section)
      }
    }
  })
  
  return orderedSections
}
