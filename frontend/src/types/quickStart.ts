/**
 * Quick Start Types
 *
 * Type definitions for the Quick Start wizard feature that allows
 * unauthenticated users to preview CV and job description parsing.
 */

export interface CVPreview {
  filename: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  section_count?: number;
  has_summary?: boolean;
  work_experience_count?: number;
  education_count?: number;
  full_parsed_data?: any; // Full CV data from backend
  error?: string;

  // Session metadata fields (added by storeQuickStartSession)
  cvFileBase64?: string;
  cvFileName?: string;
  cvFileSize?: number;
  cvFileType?: string;
}

export interface JobPreview {
  source?: "url" | "text";
  title?: string;
  company?: string;
  location?: string;
  content_preview?: string;
  has_content?: boolean;
  content_length?: number;
  url?: string;
  full_parsed_data?: any; // Full job data from backend
  error?: string;
}

export interface QuickStartPreviewResponse {
  cv_preview: CVPreview;
  job_preview: JobPreview;
  success: boolean;
  message: string;
}

export interface QuickStartClaimResponse {
    cv_id?: string;
    job_description_id?: string;
    message: string;
}

export interface QuickStartSessionData {
  cvFile: File;
  jobUrl?: string;
  jobText?: string;
  previewResponse?: QuickStartPreviewResponse;
  timestamp: number;
}
