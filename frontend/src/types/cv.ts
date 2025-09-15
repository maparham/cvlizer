// Core CV Entity Types
export interface CV {
  id: string
  user_id: string
  original_filename: string
  file_size: number
  file_type: string
  created_at: string
  updated_at: string
  is_parsed: boolean
  parse_error?: string
  parsed_data?: CVData
}

// CV Data Structure
export interface CVData {
  personal_info: PersonalInfo
  professional_summary: ProfessionalSummary
  work_experience: WorkExperience[]
  education: Education[]
  skills: Skills
  certifications: Certification[]
  projects: Project[]
  awards: Award[]
  publications: Publication[]
  volunteer_experience: VolunteerExperience[]
  section_config?: SectionConfig
}

// Personal Information
export interface PersonalInfo {
  full_name: string
  email: string
  phone: string
  location: string
  linkedin_url: string
  website_url: string
  github_url?: string
  portfolio_url?: string
}

// Professional Summary
export interface ProfessionalSummary {
  content: string
  keywords: string[]
}

// Work Experience
export interface WorkExperience {
  id?: string
  company: string
  position: string
  location: string
  start_date: string
  end_date: string
  current: boolean
  description: string
  achievements: string[]
  technologies: string[]
  responsibilities?: string[]
}

// Education
export interface Education {
  id?: string
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date: string
  current: boolean
  gpa?: string
  honors: string[]
  relevant_coursework?: string[]
  thesis_title?: string
}

// Skills
export interface Skills {
  technical: string[]
  soft: string[]
  languages: Language[]
  frameworks?: string[]
  tools?: string[]
  databases?: string[]
}

export interface Language {
  language: string
  proficiency: 'Basic' | 'Intermediate' | 'Advanced' | 'Fluent' | 'Native'
}

// Certifications
export interface Certification {
  id?: string
  name: string
  issuing_organization: string
  issue_date: string
  expiration_date?: string
  credential_id?: string
  credential_url?: string
}

// Projects
export interface Project {
  id?: string
  name: string
  description: string
  start_date: string
  end_date?: string
  current: boolean
  technologies: string[]
  url?: string
  github_url?: string
  achievements?: string[]
  role?: string
}

// Awards
export interface Award {
  id?: string
  name: string
  issuing_organization: string
  date: string
  description?: string
}

// Publications
export interface Publication {
  id?: string
  title: string
  authors: string[]
  publication_date: string
  journal?: string
  conference?: string
  url?: string
  doi?: string
  abstract?: string
}

// Volunteer Experience
export interface VolunteerExperience {
  id?: string
  organization: string
  position: string
  location: string
  start_date: string
  end_date: string
  current: boolean
  description: string
  achievements?: string[]
}

// Section Configuration
export interface SectionConfig {
  sections: CVSection[]
}

export interface CVSection {
  id: string
  type: CVSectionType
  title: string
  visible: boolean
  order: number
}

export type CVSectionType = 
  | 'personal_info' 
  | 'professional_summary' 
  | 'work_experience' 
  | 'education' 
  | 'skills' 
  | 'certifications' 
  | 'projects' 
  | 'awards' 
  | 'publications' 
  | 'volunteer_experience'

// CV Section Data Union Type
export type CVSectionData = 
  | PersonalInfo 
  | ProfessionalSummary 
  | WorkExperience[] 
  | Education[] 
  | Skills 
  | Certification[] 
  | Project[] 
  | Award[] 
  | Publication[] 
  | VolunteerExperience[]

// Utility Types
export interface CVSectionDefinition {
  id: CVSectionType
  name: string
  description: string
  component: string
  icon?: string
  category: 'core' | 'experience' | 'achievements' | 'additional'
}

// Form States
export interface CVFormData extends Partial<CVData> {}

export interface CVFormErrors {
  [sectionId: string]: {
    [fieldId: string]: string
  }
}

// CV Operations
export interface CVUpdateRequest {
  parsed_data: CVData
}

export interface CVUploadRequest extends FormData {}

export interface CVUploadResponse {
  cv: CV
  message: string
}
