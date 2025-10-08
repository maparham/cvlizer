/**
 * AI Components Export Module
 * 
 * This module exports all AI-related components for easy importing throughout
 * the application. It provides a centralized place to access all AI features
 * including suggestions, analysis, and optimization components.
 */

// Existing AI components
export { default as JobFitAnalysis } from './JobFitAnalysis';
export { default as ATSOptimization } from './ATSOptimization';
export { default as JobDescriptionSummary } from './JobDescriptionSummary';
export { default as JobDescriptionsModal } from './JobDescriptionsModal';

// Draft management components
export { default as DraftSection } from './DraftSection';
export { default as DraftsList } from './DraftsList';
export { default as InlineDraftSection } from './InlineDraftSection';

// Inline diff system components
export { SuggestionHighlight, HighlightedText } from './SuggestionHighlight';
export { FloatingSuggestionsPanel } from './FloatingSuggestionsPanel';
export { default as InlineDiffControls } from './InlineDiffControls';

// Re-export types for convenience
export type { AISuggestion, TempCVState, InlineDiffState } from '../../../types/ai';