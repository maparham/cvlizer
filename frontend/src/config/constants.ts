/**
 * Application-wide constants and configuration values
 *
 * This file centralizes all magic numbers and configuration values
 * used throughout the application for easier maintenance.
 */

// API Configuration
export const API_CONFIG = {
  /** Base URL for backend API (from environment variable) */
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',

  /** Request timeout in milliseconds */
  TIMEOUT: 30000,
} as const;

// Polling Configuration
export const POLLING_CONFIG = {
  /** Default polling interval for background tasks in milliseconds */
  DEFAULT_INTERVAL: 2000,

  /** Polling interval for job description parsing in milliseconds */
  JOB_DESCRIPTION_INTERVAL: 2000,

  /** Polling interval for AI task completion in milliseconds */
  AI_TASK_INTERVAL: 2000,

  /** Polling interval for content enhancement in milliseconds */
  CONTENT_ENHANCEMENT_INTERVAL: 2000,

  /** Maximum number of polling retries before giving up */
  MAX_RETRIES: 30,

  /** Timeout for long-running operations in milliseconds */
  LONG_OPERATION_TIMEOUT: 60000,
} as const;

// File Upload Configuration
export const FILE_CONFIG = {
  /** Maximum file size for CV uploads in bytes (10MB) */
  MAX_CV_SIZE: 10 * 1024 * 1024,

  /** Allowed file types for CV upload */
  ALLOWED_CV_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],

  /** Allowed file extensions for CV upload */
  ALLOWED_CV_EXTENSIONS: ['.pdf', '.doc', '.docx'],
} as const;

// UI Configuration
export const UI_CONFIG = {
  /** Debounce delay for search inputs in milliseconds */
  SEARCH_DEBOUNCE: 300,

  /** Auto-save delay for form inputs in milliseconds */
  AUTO_SAVE_DELAY: 1000,

  /** Notification display duration in milliseconds */
  NOTIFICATION_DURATION: 5000,

  /** Toast auto-hide duration in milliseconds */
  TOAST_DURATION: 3000,

  /** Animation duration for transitions in milliseconds */
  ANIMATION_DURATION: 300,
} as const;

// AI Configuration
export const AI_CONFIG = {
  /** Minimum confidence score for job fit analysis (0-100) */
  MIN_CONFIDENCE_SCORE: 0,

  /** Maximum confidence score for job fit analysis (0-100) */
  MAX_CONFIDENCE_SCORE: 100,

  /** Default AI model name */
  DEFAULT_MODEL: 'gpt-4o-mini',

  /** Maximum tokens for AI generation */
  MAX_TOKENS: 4000,
} as const;

// Validation Configuration
export const VALIDATION_CONFIG = {
  /** Minimum length for job description content */
  MIN_JOB_DESCRIPTION_LENGTH: 50,

  /** Maximum length for job description content */
  MAX_JOB_DESCRIPTION_LENGTH: 10000,

  /** Minimum length for CV content */
  MIN_CV_CONTENT_LENGTH: 100,

  /** Maximum length for section content */
  MAX_SECTION_CONTENT_LENGTH: 5000,

  /** URL validation pattern */
  URL_PATTERN: /^https?:\/\/.+/,
} as const;

// Pagination Configuration
export const PAGINATION_CONFIG = {
  /** Default page size for lists */
  DEFAULT_PAGE_SIZE: 10,

  /** Available page size options */
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],

  /** Maximum items to display in a single page */
  MAX_PAGE_SIZE: 100,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  /** Cache TTL for user data in milliseconds */
  USER_DATA_TTL: 5 * 60 * 1000, // 5 minutes

  /** Cache TTL for CV data in milliseconds */
  CV_DATA_TTL: 2 * 60 * 1000, // 2 minutes

  /** Cache TTL for job descriptions in milliseconds */
  JOB_DESCRIPTION_TTL: 5 * 60 * 1000, // 5 minutes
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  /** Key for storing active job description ID per CV */
  ACTIVE_JOB_DESCRIPTION: 'activeJobDescriptionIdPerCV',

  /** Key for storing hidden job description IDs */
  HIDDEN_JOB_DESCRIPTIONS: 'hiddenJobDescriptionIds',

  /** Key for storing user preferences */
  USER_PREFERENCES: 'userPreferences',

  /** Key for storing theme preference */
  THEME: 'theme',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  /** Enable AI-powered features */
  AI_ENABLED: true,

  /** Enable background task polling */
  BACKGROUND_TASKS_ENABLED: true,

  /** Enable admin dashboard */
  ADMIN_DASHBOARD_ENABLED: true,

  /** Enable impersonation feature */
  IMPERSONATION_ENABLED: true,
} as const;

// Export all constants as a single object for convenience
export const APP_CONSTANTS = {
  API: API_CONFIG,
  POLLING: POLLING_CONFIG,
  FILE: FILE_CONFIG,
  UI: UI_CONFIG,
  AI: AI_CONFIG,
  VALIDATION: VALIDATION_CONFIG,
  PAGINATION: PAGINATION_CONFIG,
  CACHE: CACHE_CONFIG,
  STORAGE: STORAGE_KEYS,
  FEATURES: FEATURE_FLAGS,
} as const;

export default APP_CONSTANTS;
