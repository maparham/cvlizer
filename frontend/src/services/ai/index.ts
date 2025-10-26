/**
 * AI Service Module - Main Export
 *
 * Provides access to all AI-related services through a unified interface.
 * Maintains backward compatibility with existing code by exporting both
 * a singleton instance and individual convenience functions.
 *
 * This module combines all AI service domains:
 * - Job fit analysis and drafts
 * - Job descriptions and associations
 * - ATS optimization
 * - Content enhancement
 * - AI section generation
 * - Utility functions
 */

// Import all services
import { cacheManager, CacheManager } from "./cache";
import {
  jobFitService,
  analyzeJobFit,
  getDraftStatus,
  createJobFitDraft,
  getCVDrafts,
  approveWhyGoodFitDraft,
  deleteWhyGoodFitDraft,
} from "./jobFitService";
import {
  jobDescriptionService,
  createJobDescription,
  parseJobDescriptionUrl,
  getJobDescriptionStatus,
  getJobDescriptions,
  updateJobDescription,
  deleteJobDescription,
  associateJobDescriptionWithCV,
  disassociateJobDescriptionFromCV,
} from "./jobDescriptionService";
import { atsService, analyzeATSOptimization } from "./atsService";
import {
  contentEnhancementService,
  enhanceContent,
  getContentEnhancementStatus,
  deleteContentEnhancement,
} from "./contentEnhancementService";
import {
  aiSectionsService,
  generateAISection,
  getAISections,
  createAIEnhancement,
  getAIEnhancementStatus,
  getLatestAIEnhancement,
  updateAIEnhancement,
  deleteAIEnhancement,
} from "./aiSectionsService";
import {
  utilityService,
  checkAIFeatureStatus,
  retryWithBackoff,
  generateAllSuggestions,
} from "./utilityService";

/**
 * Unified AI Service aggregating all AI service modules
 * Provides all AI functionality through a single interface
 */
class AIService {
  // Cache management
  clearCacheForCV = cacheManager.clearCacheForCV.bind(cacheManager);
  clearAllCache = cacheManager.clearAllCache.bind(cacheManager);

  // Job fit analysis
  analyzeJobFit = analyzeJobFit;
  getDraftStatus = getDraftStatus;
  createJobFitDraft = createJobFitDraft;
  getCVDrafts = getCVDrafts;
  approveWhyGoodFitDraft = approveWhyGoodFitDraft;
  deleteWhyGoodFitDraft = deleteWhyGoodFitDraft;

  // Job descriptions
  createJobDescription = createJobDescription;
  parseJobDescriptionUrl = parseJobDescriptionUrl;
  getJobDescriptionStatus = getJobDescriptionStatus;
  getJobDescriptions = getJobDescriptions;
  updateJobDescription = updateJobDescription;
  deleteJobDescription = deleteJobDescription;
  associateJobDescriptionWithCV = associateJobDescriptionWithCV;
  disassociateJobDescriptionFromCV = disassociateJobDescriptionFromCV;

  // ATS optimization
  analyzeATSOptimization = analyzeATSOptimization;

  // Content enhancement
  enhanceContent = enhanceContent;
  getContentEnhancementStatus = getContentEnhancementStatus;
  deleteContentEnhancement = deleteContentEnhancement;

  // AI sections
  generateAISection = generateAISection;
  getAISections = getAISections;
  createAIEnhancement = createAIEnhancement;
  getAIEnhancementStatus = getAIEnhancementStatus;
  getLatestAIEnhancement = getLatestAIEnhancement;
  updateAIEnhancement = updateAIEnhancement;
  deleteAIEnhancement = deleteAIEnhancement;

  // Utility functions
  checkAIFeatureStatus = checkAIFeatureStatus;
  retryWithBackoff = retryWithBackoff;
  generateAllSuggestions = generateAllSuggestions;
}

// Export singleton instance for backward compatibility
export const aiService = new AIService();
