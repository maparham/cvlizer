/**
 * Admin dashboard types and interfaces.
 * 
 * This module defines TypeScript interfaces for the admin dashboard
 * data structures and API responses.
 */

export interface SystemStats {
  total_users: number
  active_users: number
  clerk_users: number
  legacy_users: number
  total_cvs: number
  total_ai_sections: number
  total_job_descriptions: number
  users_last_7_days: number
  users_last_30_days: number
  cvs_last_7_days: number
  cvs_last_30_days: number
}

export interface UserSummary {
  id: string
  clerk_id: string | null
  email: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login: string | null
  cv_count: number
  ai_sections_count: number
  is_clerk_user: boolean
}

export interface UserDetail {
  id: string
  clerk_id: string | null
  email: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login: string | null
  cvs: Array<{
    id: string
    original_filename: string
    file_size: number
    file_type: string
    is_parsed: boolean
    parse_error: string | null
    created_at: string
    updated_at: string
  }>
  ai_sections: Array<{
    id: string
    section_type: string
    section_content: string | null
    created_at: string
  }>
}

export interface UserCV {
  id: string
  original_filename: string
  file_size: number
  file_type: string
  is_parsed: boolean
  parsing_status: string
  ai_sections_count: number
  job_descriptions_count: number
  created_at: string
  updated_at: string
}
