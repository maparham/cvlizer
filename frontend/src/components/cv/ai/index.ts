/**
 * AI Components Export Module
 *
 * This module exports all AI-related components for easy importing throughout
 * the application. It provides a centralized place to access all AI features
 * including suggestions, analysis, and optimization components.
 */

// Existing AI components
export { default as JobFitAnalysis } from "./JobFitAnalysis";
export { default as JobDescriptionSummary } from "./JobDescriptionSummary";
export { default as JobDescriptionCard } from "./JobDescriptionCard";
export { default as JobDescriptionsModal } from "./job-descriptions-modal";
export { default as JobDescriptionStatusDialog } from "./JobDescriptionStatusDialog";

// Draft management components
export { default as DraftSection } from "./DraftSection";
export { default as DraftsList } from "./DraftsList";
export { default as InlineDraftSection } from "./InlineDraftSection";

// AI diff components
export { default as SemanticDiff } from "./SemanticDiff";

// Suggestion card components
export { CompactSuggestionCard } from "./CompactSuggestionCard";
export type { CompactSuggestionCardProps } from "./CompactSuggestionCard";
