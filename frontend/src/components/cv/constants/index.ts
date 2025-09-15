// Export the new comprehensive section definitions
export * from './sections'

// Export skills constants
export * from './skills'

// Legacy constants for backward compatibility
export const CV_SECTION_TYPES = {
  PERSONAL_INFO: 'personal_info',
  PROFESSIONAL_SUMMARY: 'professional_summary',
  WORK_EXPERIENCE: 'work_experience',
  EDUCATION: 'education',
  SKILLS: 'skills',
  CERTIFICATIONS: 'certifications',
  PROJECTS: 'projects',
  AWARDS: 'awards',
  PUBLICATIONS: 'publications',
  VOLUNTEER_EXPERIENCE: 'volunteer_experience'
} as const

// CV Section Titles
export const CV_SECTION_TITLES = {
  [CV_SECTION_TYPES.PERSONAL_INFO]: 'Personal Information',
  [CV_SECTION_TYPES.PROFESSIONAL_SUMMARY]: 'Professional Summary',
  [CV_SECTION_TYPES.WORK_EXPERIENCE]: 'Work Experience',
  [CV_SECTION_TYPES.EDUCATION]: 'Education',
  [CV_SECTION_TYPES.SKILLS]: 'Skills',
  [CV_SECTION_TYPES.CERTIFICATIONS]: 'Certifications',
  [CV_SECTION_TYPES.PROJECTS]: 'Projects',
  [CV_SECTION_TYPES.AWARDS]: 'Awards & Recognition',
  [CV_SECTION_TYPES.PUBLICATIONS]: 'Publications',
  [CV_SECTION_TYPES.VOLUNTEER_EXPERIENCE]: 'Volunteer Experience'
} as const

// Default section order
export const DEFAULT_SECTION_ORDER = [
  CV_SECTION_TYPES.PERSONAL_INFO,
  CV_SECTION_TYPES.PROFESSIONAL_SUMMARY,
  CV_SECTION_TYPES.WORK_EXPERIENCE,
  CV_SECTION_TYPES.EDUCATION,
  CV_SECTION_TYPES.SKILLS,
  CV_SECTION_TYPES.CERTIFICATIONS,
  CV_SECTION_TYPES.PROJECTS,
  CV_SECTION_TYPES.AWARDS,
  CV_SECTION_TYPES.PUBLICATIONS,
  CV_SECTION_TYPES.VOLUNTEER_EXPERIENCE
] as const

// Auto-save messages
export const AUTO_SAVE_MESSAGES = {
  PERSONAL_INFO: 'Personal information updated',
  PROFESSIONAL_SUMMARY: 'Professional summary updated',
  WORK_EXPERIENCE: 'Work experience updated',
  EDUCATION: 'Education updated',
  SKILLS: 'Skills updated',
  CERTIFICATIONS: 'Certifications updated',
  PROJECTS: 'Projects updated',
  AWARDS: 'Awards updated',
  PUBLICATIONS: 'Publications updated',
  VOLUNTEER_EXPERIENCE: 'Volunteer experience updated',
  WORK_EXPERIENCE_ITEM: 'Work experience item updated',
  EDUCATION_ITEM: 'Education item updated',
  SKILLS_ITEM: 'Skills item updated'
} as const
