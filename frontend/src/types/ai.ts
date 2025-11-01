/**
 * AI-related TypeScript types and interfaces.
 *
 * This module defines all TypeScript types related to AI features including
 * job fit analysis, content enhancement, and ATS optimization.
 */

// Job Fit Analysis Types
export interface JobFitAnalysisRequest {
  job_description_id: string;
}

export interface JobFitAnalysisResponse {
  confidence_score: number;
  fit_analysis: string;
  key_matches: string[];
  missing_skills: string[];
  suggested_improvements: string[];
  strengths: string[];
  weaknesses: string[];
  tokens_used: number;
  generation_time: number;
  model_used: string;
}

// Content Enhancement Types
export interface ContentEnhancementRequest {
  original_content: string;
  content_type: string;
}

export interface ContentSuggestion {
  content: string;
  improvements: string[];
  confidence_score: number;
}

export interface ContentEnhancementResponse {
  suggestions: ContentSuggestion[];
  overall_improvements: string[];
  tokens_used: number;
  generation_time: number;
  model_used: string;
  is_generating: boolean;
  generation_error?: string;
}

export interface ContentEnhancementCreateResponse {
  enhancement_id: string;
  is_generating: boolean;
}

// AI Enhancement Types (for Enhance CV functionality)
export interface AIEnhancementRequest {
  job_description_id: string;
}

/**
 * Enhanced skills suggestion data structure
 */
export interface EnhancementSkillsData {
  technical: Array<{ skill: string; reasoning: string }>;
  soft: Array<{ skill: string; reasoning: string }>;
}

/**
 * Enhanced professional summary data structure
 */
export interface EnhancementSummaryData {
  suggested_text: string;
  original_text: string;
  key_changes: string[];
}

/**
 * Complete AI enhancement data structure
 */
export interface AIEnhancementData {
  skills?: EnhancementSkillsData;
  professional_summary?: EnhancementSummaryData;
  [key: string]: unknown; // Allow for future enhancement types
}

export interface AIEnhancementResponse {
  id: string;
  cv_id: string;
  job_description_id: string;
  enhancement_data?: AIEnhancementData;
  tokens_used: number;
  generation_time: number;
  model_used?: string;
  is_generating: boolean;
  generation_error?: string;
  created_at: string;
}

export interface AIEnhancementCreateResponse {
  enhancement_id: string;
  is_generating: boolean;
}

// AI Section Types (existing functionality)
export interface AISectionResponse {
  id: string;
  cv_id: string;
  job_description_id: string;
  section_content: string;
  section_type: string;
  ai_model: string;
  tokens_used: number;
  generation_time: number;
  created_at: string;
  low_fit_warning?: {
    message: string;
    confidence_score: number;
    severity: string;
  };
}

export interface AISectionListResponse {
  ai_sections: AISectionResponse[];
}

// Job Description Types (for AI features)
export interface JobDescription {
  id: string;
  cv_id: string | null;  // Original CV that created this JD (can be null)
  cv_ids: string[];  // All CVs associated with this JD (many-to-many)
  content: string;
  title?: string;
  company?: string;
  location?: string;
  source_url?: string;
  created_at: string;
  updated_at?: string;
  is_parsing?: boolean;
  parse_error?: string;
  status?: string;  // "open" | "applied" | "archived"
  application_date?: string;
  notes?: string;
}

export interface JobDescriptionRequest {
  content: string;
  title?: string;
  company?: string;
  location?: string;
  source_url?: string;
}

// AI Service Error Types
export interface AIServiceError {
  error: string;
  details?: string;
  code?: string;
}

// AI Feature Status
export interface AIFeatureStatus {
  isEnabled: boolean;
  lastChecked: Date;
  error?: string;
}

// AI Suggestion State
export interface AISuggestionState {
  id: string;
  originalContent: string;
  suggestions: ContentSuggestion[];
  isAccepted?: boolean;
  selectedSuggestion?: number;
  isLoading: boolean;
  error?: string;
}

// Job Fit Analysis State
export interface JobFitAnalysisState {
  isAnalyzing: boolean;
  lastAnalysis?: JobFitAnalysisResponse;
  error?: string;
  isGenerating: boolean;
}

// AI Store State
export interface AIStoreState {
  featureStatus: AIFeatureStatus;
  jobFitAnalysis: JobFitAnalysisState;
  suggestions: Record<string, AISuggestionState>; // keyed by content hash
  jobDescriptions: JobDescription[];  // User-level job descriptions (shared across CVs)
  activeJobDescriptionId?: string;  // Deprecated: use activeJobDescriptionIdPerCV instead
  activeJobDescriptionIdPerCV: Record<string, string>; // Map of cvId -> activeJobDescriptionId
  hiddenJobDescriptionIds: string[]; // IDs of job descriptions hidden from sidebar
  drafts: DraftState;
}

// Unified AI Suggestions Types
export interface SkillSuggestion {
  skill: string;
  reasoning: string;
}

export interface SkillsSuggestions {
  technical: SkillSuggestion[];
  soft: SkillSuggestion[];
}

export interface ProfessionalSummarySuggestion {
  suggested_text: string;
  original_text: string;
  key_changes: string[];
}

export interface ItemDescriptionSuggestion {
  id: string; // item ID from CV
  original: string;
  suggested: string;
  reasoning: string;
  importance: 'highly_recommended' | 'standard';
  current_content_score: number;
}

export interface AllSuggestionsResponse {
  skills: SkillsSuggestions;
  professional_summary: ProfessionalSummarySuggestion;
  work_experience: ItemDescriptionSuggestion[];
  education: ItemDescriptionSuggestion[];
}

// Draft Management Types
export interface DraftResponse {
  id: string;
  cv_id: string;
  job_description_id: string;
  section_type: string;
  draft_data: any;
  ai_model: string;
  tokens_used: number;
  generation_time: number;
  created_at: string;
  is_generating: boolean;
  generation_error?: string;
}

export interface DraftListResponse {
  drafts: DraftResponse[];
}

export interface DraftCreateRequest {
  job_description_id: string;
}

export interface DraftApproveRequest {
  draft_id: string;
}

// Draft State
export interface DraftState {
  drafts: DraftResponse[];
  isLoading: boolean;
  error?: string;
}

/**
 * Inline Suggestion Data - for store and component communication
 */
export interface InlineSuggestionData {
  id: string;
  sectionType: string;
  fieldPath?: string;
  description: string;
  originalValue: string;
  suggestedValue: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * AI Service Response Wrapper - standardizes AI operation responses
 */
export interface AIServiceResponse<T> {
  data: T;
  tokensUsed?: number;
  generationTime?: number;
  modelUsed?: string;
  isGenerating?: boolean;
  generationError?: string;
}

/**
 * Generic background task response
 */
export interface BackgroundTaskResponse {
  task_id: string;
  is_processing: boolean;
  is_complete: boolean;
  error?: string;
  result?: unknown;
}
