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
  suggestions: any[];
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
  markdown_diff?: string;
}

export interface ItemDescriptionSuggestion {
  id: string; // item ID from CV
  current_content_score: number; // Always present
  original?: string; // Only present for items with suggestions (score < 50)
  suggested?: string; // Only present for items with suggestions (score < 50)
  reasoning?: string; // Only present for items with suggestions (score < 50)
  importance?: 'highly_recommended' | 'standard'; // Only present for items with suggestions (score < 50)
  markdown_diff?: string; // Only present for items with suggestions (score < 50)
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

// ============================================================================
// ATS Optimization Types
// ============================================================================

/**
 * Missing keyword information from ATS analysis
 */
export interface MissingKeyword {
  keyword: string;
  importance: "high" | "medium" | "low";
  frequency_in_jd: number;
  suggested_placement: string;
}

/**
 * Keyword analysis data
 */
export interface KeywordAnalysis {
  [keyword: string]: {
    count: number;
    density: number;
    locations: string[];
    present?: boolean;
    frequency?: number;
    suggested_sections?: string[];
  };
}

/**
 * Content optimization suggestion
 */
export interface ContentOptimization {
  section: string;
  suggestion: string;
  missing_keywords?: string[];
}

/**
 * ATS Optimization Request
 */
export interface ATSOptimizationRequest {
  job_description_id: string;
}

/**
 * ATS Optimization Response
 */
export interface ATSOptimizationResponse {
  ats_score: number;
  confidence_score?: number;
  missing_keywords: MissingKeyword[];
  keyword_analysis?: KeywordAnalysis;
  keyword_density?: Record<string, number>;
  suggestions?: string[];
  content_optimization?: ContentOptimization[];
  optimized_sections?: string[];
  strengths?: string[];
  weaknesses?: string[];
  tokens_used?: number;
  generation_time?: number;
  model_used?: string;
}

// ============================================================================
// Inline Diff Types
// ============================================================================

/**
 * AI Suggestion for inline diff
 */
export interface AISuggestion {
  id: string;
  section: string;
  type: "add_keyword" | "enhance_content";
  description: string;
  originalValue: string;
  suggestedValue: string;
  status: "pending" | "approved" | "rejected";
  changeType: "addition" | "modification";
  fieldPath?: string;
}

/**
 * Temporary CV state for diff mode
 */
export interface TempCVState {
  originalCV: any;
  appliedSuggestions: AISuggestion[];
  tempData: any;
  isDiffMode: boolean;
}

/**
 * Inline diff state
 */
export interface InlineDiffState {
  tempCV: TempCVState | null;
  suggestions: AISuggestion[];
  isApplyingAll: boolean;
  isPanelOpen: boolean;
  highlightMode: "all" | "pending" | "approved";
  error?: string;
  cvId?: string;
}
