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

// ATS Optimization Types
export interface ATSOptimizationRequest {
  job_description_id: string;
}

export interface MissingKeyword {
  keyword: string;
  importance: string;
  frequency_in_jd: number;
  suggested_placement: string;
}

export interface KeywordAnalysis {
  present: boolean;
  frequency?: number;
  suggested_sections?: string[];
  sections?: string[];
}

export interface ContentOptimization {
  section: string;
  missing_keywords: string[];
  suggestion: string;
}

export interface ATSOptimizationResponse {
  ats_score: number;
  missing_keywords: MissingKeyword[];
  keyword_analysis: Record<string, KeywordAnalysis>;
  suggestions: string[];
  content_optimization: ContentOptimization[];
  strengths: string[];
  weaknesses: string[];
  tokens_used: number;
  generation_time: number;
  model_used: string;
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

// ATS Optimization State
export interface ATSOptimizationState {
  isAnalyzing: boolean;
  lastAnalysis?: ATSOptimizationResponse;
  error?: string;
  isOptimizing: boolean;
}

// Job Fit Analysis State
export interface JobFitAnalysisState {
  isAnalyzing: boolean;
  lastAnalysis?: JobFitAnalysisResponse;
  error?: string;
  isGenerating: boolean;
}

// Inline Diff System Types
export type SuggestionType =
  | "add_keyword"
  | "enhance_content"
  | "add_section"
  | "modify_content"
  | "remove_content";

export interface AISuggestion {
  id: string;
  section: string; // 'skills', 'professional_summary', etc.
  type: SuggestionType;
  description: string; // Human-readable description
  originalValue: string;
  suggestedValue: string;
  status: "pending" | "approved" | "rejected";
  changeType: "addition" | "modification" | "removal";
  fieldPath?: string; // Optional dot-notation path for nested fields
}

export interface TempCVState {
  originalCV: any; // Store original CV data
  appliedSuggestions: AISuggestion[];
  tempData: any; // CV data with all suggestions applied
  isDiffMode: boolean;
}

export interface InlineDiffState {
  tempCV: TempCVState | null;
  suggestions: AISuggestion[];
  isApplyingAll: boolean;
  isPanelOpen: boolean;
  highlightMode: "all" | "pending" | "approved";
  error?: string;
  cvId?: string; // Track which CV is being edited for cache clearing
}

// AI Store State
export interface AIStoreState {
  featureStatus: AIFeatureStatus;
  jobFitAnalysis: JobFitAnalysisState;
  atsOptimization: ATSOptimizationState;
  suggestions: Record<string, AISuggestionState>; // keyed by content hash
  jobDescriptions: JobDescription[];  // User-level job descriptions (shared across CVs)
  activeJobDescriptionId?: string;  // Deprecated: use activeJobDescriptionIdPerCV instead
  activeJobDescriptionIdPerCV: Record<string, string>; // Map of cvId -> activeJobDescriptionId
  hiddenJobDescriptionIds: string[]; // IDs of job descriptions hidden from sidebar
  inlineDiff: InlineDiffState;
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

export interface AllSuggestionsResponse {
  skills: SkillsSuggestions;
  professional_summary: ProfessionalSummarySuggestion;
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
