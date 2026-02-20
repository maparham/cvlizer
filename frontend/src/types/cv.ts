/**
 * CV Type Definitions
 *
 * This module defines the core TypeScript interfaces and types for CV-related data structures.
 * It includes the main CV entity, section types, validation schemas, and utility types used
 * throughout the CV editor application.
 *
 * Key types:
 * - CV: Main CV entity with metadata and parsed data
 * - CVSection: Individual sections within a CV (work experience, education, etc.)
 * - CVData: The structured data content of a CV
 * - Validation types: Field validation results and error handling
 * - History types: CV version history and snapshot management
 *
 * Usage:
 * - Import these types in components and services that work with CV data
 * - Used for type safety in API calls and data transformations
 * - Provides IntelliSense support for CV-related operations
 */
export interface CV {
  id: string;
  user_id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
  is_parsed: boolean;
  parse_error?: string;
  parsed_data?: CVData;
  is_imported: boolean;
  has_been_edited: boolean;
}

// CV Data Structure
export interface CVData {
  personal_info: PersonalInfo;
  custom_sections: CustomSection[];
  why_good_fit_metadata?: WhyGoodFitMetadata;
  work_experience: WorkExperience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
  projects: Project[];
  awards: Award[];
  publications: Publication[];
  volunteer_experience: VolunteerExperience[];
  section_config?: SectionConfig;
}

// Immutable section type for custom sections; used for AI summary and cover letter
export type CustomSectionType = "professional_summary" | "cover_letter";

// Custom section (user-defined or AI-extracted, e.g. Professional Summary, References)
export interface CustomSection {
  id: string;
  title: string;
  content: string;
  /** Immutable; professional_summary = CV summary, cover_letter = application letter. */
  type?: CustomSectionType;
}

// Personal Information
export interface PersonalInfo {
  full_name: string;
  academic_title?: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  website_url: string;
  github_url?: string;
  portfolio_url?: string;
  description?: string;
  description_center_align?: boolean;
  show_horizontal_line?: boolean;
}

// Why I'm a Good Fit – metadata only (content/title live in custom_sections id "why_good_fit")
export interface WhyGoodFitMetadata {
  fit_analysis: string;
  confidence_score: number;
  key_matches: string[];
  missing_skills?: string[];
  suggested_improvements?: string[];
  strengths?: string[];
  weaknesses?: string[];
  generated_at: string;
  job_description_id?: string;
  tokens_used?: number;
  generation_time?: number;
  model_used?: string;
}

// Full payload for draft/API (content + title + metadata)
export interface WhyGoodFit {
  content?: string;
  title?: string;
  fit_analysis?: string;
  confidence_score: number;
  key_matches: string[];
  missing_skills?: string[];
  suggested_improvements?: string[];
  strengths?: string[];
  weaknesses?: string[];
  generated_at?: string;
  job_description_id?: string;
}

// Work Experience
export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
  responsibilities?: string[];
}

// Education
export interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  academic_title?: string;
  start_date: string;
  end_date: string;
  current: boolean;
  gpa?: string;
  honors: string[];
  thesis_title?: string;
}

// Skills
export interface Skills {
  technical: string[];
  soft: string[];
  languages: Language[];
  frameworks?: string[];
  tools?: string[];
  databases?: string[];
}

export interface Language {
  id: string;
  language: string;
  proficiency: "Basic" | "Intermediate" | "Advanced" | "Fluent" | "Native";
}

// Certifications
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiry_date?: string;
  description?: string;
}

// Projects
export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

// Awards
export interface Award {
  id: string;
  name: string;
  issuer: string;
  date: string;
  description?: string;
}

// Publications
export interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  date: string;
  url?: string;
}

// Volunteer Experience
export interface VolunteerExperience {
  id: string;
  organization: string;
  position: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
  achievements?: string[];
}

// Section Configuration
export interface SectionConfig {
  sections: CVSection[];
}

export interface CVSection {
  id: string;
  type: CVSectionType;
  title: string;
  visible: boolean;
  order: number;
}

export type CVSectionType =
  | "personal_info"
  | "custom"
  | "work_experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "awards"
  | "publications"
  | "volunteer_experience";

// CV Section Data Union Type
export type CVSectionData =
  | PersonalInfo
  | CustomSection
  | WhyGoodFit
  | WorkExperience[]
  | Education[]
  | Skills
  | Certification[]
  | Project[]
  | Award[]
  | Publication[]
  | VolunteerExperience[];

// Utility Types
export interface CVSectionDefinition {
  id: CVSectionType;
  name: string;
  description: string;
  component: string;
  icon?: string;
  category: "core" | "experience" | "achievements" | "additional";
}

// Form States
export interface CVFormData extends Partial<CVData> {}

export interface CVFormErrors {
  [sectionId: string]: {
    [fieldId: string]: string;
  };
}

// CV Operations
export interface CVUpdateRequest {
  parsed_data: CVData;
}

export interface CVUploadRequest extends FormData {}

export interface CVUploadResponse {
  cv: CV;
  message: string;
}

/**
 * CV Title Update Payload
 */
export interface CVTitleUpdatePayload {
  title: string;
}

/**
 * CV API Response wrapper for list operations
 */
export interface CVListResponse {
  cvs: CV[];
  total?: number;
}

/**
 * Generic CV operation result
 */
export interface CVOperationResult<T = CV> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * PDF Preview Response from backend
 */
export interface PDFPreviewResponse {
  preview_image_base64: string;
}

/**
 * File Preview State for tracking preview generation status
 */
export interface FilePreviewState {
  status: 'idle' | 'loading' | 'success' | 'error';
  imageUrl: string | null;
  error?: string;
}
