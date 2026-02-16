/**
 * Admin dashboard types and interfaces.
 *
 * This module defines TypeScript interfaces for the admin dashboard
 * data structures and API responses.
 */

export interface SystemStats {
  total_users: number;
  active_users: number;
  clerk_users: number;
  legacy_users: number;
  total_cvs: number;
  total_ai_sections: number;
  total_job_descriptions: number;
  users_last_7_days: number;
  users_last_30_days: number;
  cvs_last_7_days: number;
  cvs_last_30_days: number;
}

export interface UserSummary {
  id: string;
  clerk_id: string | null;
  email: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  cv_count: number;
  ai_sections_count: number;
  is_clerk_user: boolean;
}

export interface UserDetail {
  id: string;
  clerk_id: string | null;
  email: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  cvs: Array<{
    id: string;
    original_filename: string;
    file_size: number;
    file_type: string;
    is_parsed: boolean;
    parse_error: string | null;
    created_at: string;
    updated_at: string;
  }>;
  ai_sections: Array<{
    id: string;
    section_type: string;
    section_content: string | null;
    created_at: string;
  }>;
}

export interface UserCV {
  id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  is_parsed: boolean;
  parsing_status: string;
  ai_sections_count: number;
  job_descriptions_count: number;
  created_at: string;
  updated_at: string;
}

// AI Usage Types
export interface SystemAIStats {
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cached_tokens: number;
  total_cost: number;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  average_tokens_per_operation: number;
  average_prompt_tokens_per_operation: number;
  average_completion_tokens_per_operation: number;
  average_cached_tokens_per_operation: number;
  average_cost_per_operation: number;
  cache_hit_rate: number;
  estimated_cache_savings: number;
  most_expensive_operation_type: string | null;
  date_range: {
    start: string;
    end: string;
  };
}

export interface UserAIUsage {
  user_id: string;
  email: string;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost: number;
  operation_count: number;
  most_used_operation: string | null;
}

export interface OperationAIUsage {
  operation_type: string;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost: number;
  operation_count: number;
  average_tokens_per_operation: number;
  average_prompt_tokens_per_operation: number;
  average_completion_tokens_per_operation: number;
}

export interface TimelineData {
  date: string | null;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost: number;
  operation_count: number;
}

export interface AIUsageLogDetail {
  id: string;
  user_id: string;
  user_email: string;
  cv_id: string | null;
  operation_type: string;
  model_used: string;
  service_tier?: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  provider_cost?: number | null;
  generation_time: number;
  success: boolean;
  error_message: string | null;
  timestamp: string | null;
  created_at: string | null;
}

export interface PaginatedAIUsageLogs {
  logs: AIUsageLogDetail[];
  total: number;
  limit: number;
  offset: number;
}

export interface AIUsageFilters {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  operation_type?: string;
  success?: boolean;
  granularity?: "day" | "week" | "month" | "hour";
}
