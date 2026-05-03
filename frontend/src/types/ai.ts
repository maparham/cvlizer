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
  [category: string]: Array<{ skill: string; reasoning: string }>;
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
  application_date?: string | null;
  notes?: string;
  /** True when a public read-only share link is enabled */
  is_public_shared?: boolean;
}

export interface JobDescriptionStatusUpdate {
  status?: string;
  application_date?: string | null;
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
  activeJobDescriptionIdPerCV: Record<string, string>; // Map of cvId -> activeJobDescriptionId
  hiddenJobDescriptionIds: string[]; // IDs of job descriptions hidden from sidebar
  drafts: DraftState;
}

// Unified AI Suggestions Types
export interface SkillSuggestion {
  skill: string;
  reasoning: string;
  original?: string;
}

export interface SkillsSuggestions {
  [category: string]: SkillSuggestion[];
}

export interface ProfessionalSummarySuggestion {
  suggested_text: string;
  original_text: string;
  key_changes: string[];
  html_diff?: string;
}

export interface ItemDescriptionSuggestion {
  id: string; // item ID from CV
  current_content_score: number; // Always present
  original?: string; // Only present for items with suggestions (score < 50)
  suggested?: string; // Only present for items with suggestions (score < 50)
  reasoning?: string; // Only present for items with suggestions (score < 50)
  importance?: 'highly_recommended' | 'standard'; // Only present for items with suggestions (score < 50)
  html_diff?: string; // Only present for items with suggestions (score < 50)
}

export interface WhyGoodFitSuggestion {
  title: string;
  confidence_score: number;
  fit_analysis: string;
  key_matches: string[];
  missing_skills: string[];
  suggested_improvements: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface AllSuggestionsResponse {
  skills: SkillsSuggestions;
  professional_summary: ProfessionalSummarySuggestion;
  work_experience: ItemDescriptionSuggestion[];
  education: ItemDescriptionSuggestion[];
  why_good_fit: WhyGoodFitSuggestion;
  /** Optional description suggestions for additional sections */
  certifications?: ItemDescriptionSuggestion[];
  projects?: ItemDescriptionSuggestion[];
  awards?: ItemDescriptionSuggestion[];
  volunteer_experience?: ItemDescriptionSuggestion[];
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
// CV Quality Analysis Types
// ============================================================================

export interface FieldCorrection {
  field_name: string;
  original_value: string;
  corrected_value?: string; // Optional - computed from html_diff in post-processing
  html_diff: string;
  reasoning?: string;
}

export interface WritingCorrection {
  item_id: string;
  /** Field path for UI placement. */
  field_path: string;
  html_diff?: string;  // Optional; apply logic uses field_corrections only
  field_corrections?: FieldCorrection[];
  importance: 'highly_recommended' | 'standard';
}

export interface CoachingQuestion {
  question: string;
}

export interface ContentCoachingItem {
  item_id: string;
  section: string;
  issue_category: 'offensive_language' | 'unprofessional_tone' | 'discriminatory_content' | 'insufficient_content' | 'missing_impact' | 'too_brief' | 'missing_achievements' | 'lacks_specificity' | 'missing_context' | 'weak_action_verbs' | 'grammar_errors';
  coaching_questions: CoachingQuestion[];
  direct_prompts: string[];
  /** Optional reasoning from the issue, shown in a tooltip on the coaching card. */
  reasoning?: string;
}

/** Coaching block nested in an issue (cv_review_v2). */
export interface Coaching {
  coaching_questions: CoachingQuestion[];
  direct_prompts: string[];
}

export type IssueItemType =
  | 'personal_info'
  | 'professional_summary'
  | 'custom'
  | 'work_experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'projects'
  | 'awards'
  | 'publications'
  | 'volunteer_experience';
export type IssueSeverity = 'critical' | 'major' | 'minor';
export type IssueCategory = ContentCoachingItem['issue_category'];

/** Single issue from cv_review_v2 (issues-based quality data). */
export interface Issue {
  item_type: IssueItemType;
  item_id: string | null;
  /** Field path for UI placement. */
  field_path: string;
  issue_severity: IssueSeverity;
  issue_category: IssueCategory;
  quality_score: number | null;
  reasoning: string;
  html_diff: string | null;
  coaching: Coaching | null;
  /** Set by backend post-processing */
  original?: string;
  suggested?: string;
}

/** Coaching analysis: objective edits vs full career-coach rewording. */
export type RewordingMode = 'minimal' | 'deep';

/** Professional summary for cv_review_v2 (original_text + html_diff only). */
export interface ProfessionalSummaryV2 {
  original_text: string;
  html_diff?: string | null;
  suggested_text?: string;
  reasoning?: string | null;
}

/** CV quality analysis data (issues-based only). */
export interface CVQualityAnalysisData {
  overall_quality_score: number;
  issues: Issue[];
  professional_summary?: ProfessionalSummaryV2 | null;
  skills: {
    [category: string]: SkillQualitySuggestion[];
  };
  timeline_gaps: TimelineGap[];
  /** Per-field draft history for retry (up to 3 generations per field, newest first). */
  field_draft_histories?: Record<string, Issue[]>;
  /** Mode used to generate this analysis; only 'coaching' enables regenerate. */
  correction_mode?: 'proofread' | 'coaching';
  /** Coaching only: minimal (objective edits) or deep (full coach). */
  rewording_mode?: 'minimal' | 'deep' | null;
}

/** @deprecated Use CVQualityAnalysisData; kept for normalizer/summary component. */
export interface ProfessionalSummaryQualitySuggestion {
  suggested_text?: string;
  original_text: string;
  key_changes: string[];
  html_diff?: string;
  coaching_questions?: CoachingQuestion[];
}

export interface HighQualityItem {
  item_type: 'high_score';
  item_id: string;
  field_path: string;
  quality_score: number;
}

export interface LowQualityItem {
  item_type: 'low_score';
  item_id: string;
  field_path: string;
  quality_score: number;
  original: string;
  suggested: string;
  reasoning: string;
  html_diff: string;
  coaching_questions?: CoachingQuestion[];
}

export type QualityItem = HighQualityItem | LowQualityItem;

/**
 * Type guard to check if a QualityItem is a LowQualityItem
 */
export function isLowQualityItem(item: QualityItem): item is LowQualityItem {
  return item.item_type === 'low_score';
}

/**
 * Type guard to check if a QualityItem is a HighQualityItem
 */
export function isHighQualityItem(item: QualityItem): item is HighQualityItem {
  return item.item_type === 'high_score';
}

export interface TimelineGap {
  gap_type: 'work_experience' | 'education' | 'combined';
  gap_duration_months: number;
  start_date: string;
  end_date: string;
  item_before?: {
    type: string;
    id: string;
    title: string;
  };
  item_after?: {
    type: string;
    id: string;
    title: string;
  };
}

export interface SkillQualitySuggestion {
  skill: string;
  reasoning: string;
  /** If set, replace this exact string in the CV list with `skill` (spelling/capitalization correction). */
  original?: string;
}

export interface CVQualityAnalysisResponse {
  id: string;
  cv_id: string;
  user_id: string;
  quality_data?: CVQualityAnalysisData;
  overall_quality_score?: number;
  is_generating: boolean;
  generation_error?: string;
  tokens_used: number;
  generation_time: number;
  model_used?: string;
  created_at: string;
}

export interface CVQualityAnalysisCreateResponse {
  analysis_id: string;
  is_generating: boolean;
  message?: string;
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
