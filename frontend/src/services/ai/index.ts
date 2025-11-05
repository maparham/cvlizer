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
 * - AI section generation
 * - Utility functions
 */

// Import all services
import { cacheManager } from "./cache";
import { jobFitService } from "./jobFitService";
import { jobDescriptionService } from "./jobDescriptionService";
import { aiSectionsService } from "./aiSectionsService";
import { utilityService } from "./utilityService";
import { atsService } from "./atsService";

/**
 * Unified AI Service aggregating all AI service modules
 * Provides all AI functionality through a single interface
 */
class AIService {
  // Cache management
  clearCacheForCV = cacheManager.clearCacheForCV.bind(cacheManager);
  clearAllCache = cacheManager.clearAllCache.bind(cacheManager);

  // Job fit analysis
  analyzeJobFit = jobFitService.analyzeJobFit.bind(jobFitService);
  getDraftStatus = jobFitService.getDraftStatus.bind(jobFitService);
  createJobFitDraft = jobFitService.createJobFitDraft.bind(jobFitService);
  getCVDrafts = jobFitService.getCVDrafts.bind(jobFitService);
  approveWhyGoodFitDraft = jobFitService.approveWhyGoodFitDraft.bind(jobFitService);
  deleteWhyGoodFitDraft = jobFitService.deleteWhyGoodFitDraft.bind(jobFitService);

  // Job descriptions
  createJobDescription = jobDescriptionService.createJobDescription.bind(jobDescriptionService);
  parseJobDescriptionUrl = jobDescriptionService.parseJobDescriptionUrl.bind(jobDescriptionService);
  getJobDescriptionStatus = jobDescriptionService.getJobDescriptionStatus.bind(jobDescriptionService);
  getJobDescriptions = jobDescriptionService.getJobDescriptions.bind(jobDescriptionService);
  updateJobDescription = jobDescriptionService.updateJobDescription.bind(jobDescriptionService);
  deleteJobDescription = jobDescriptionService.deleteJobDescription.bind(jobDescriptionService);
  associateJobDescriptionWithCV = jobDescriptionService.associateJobDescriptionWithCV.bind(jobDescriptionService);
  disassociateJobDescriptionFromCV = jobDescriptionService.disassociateJobDescriptionFromCV.bind(jobDescriptionService);

  // AI sections
  generateAISection = aiSectionsService.generateAISection.bind(aiSectionsService);
  getAISections = aiSectionsService.getAISections.bind(aiSectionsService);
  createCombinedAISuggestions = aiSectionsService.createCombinedAISuggestions.bind(aiSectionsService);
  getAIEnhancementStatus = aiSectionsService.getAIEnhancementStatus.bind(aiSectionsService);
  getLatestAIEnhancement = aiSectionsService.getLatestAIEnhancement.bind(aiSectionsService);
  updateAIEnhancement = aiSectionsService.updateAIEnhancement.bind(aiSectionsService);
  deleteAIEnhancement = aiSectionsService.deleteAIEnhancement.bind(aiSectionsService);
  deleteAllAIEnhancementsForCV = aiSectionsService.deleteAllAIEnhancementsForCV.bind(aiSectionsService);

  // ATS optimization
  analyzeATSOptimization = atsService.analyzeATSOptimization.bind(atsService);

  // Utility functions
  checkAIFeatureStatus = utilityService.checkAIFeatureStatus.bind(utilityService);
  retryWithBackoff = utilityService.retryWithBackoff.bind(utilityService);
  generateAllSuggestions = utilityService.generateAllSuggestions.bind(utilityService);
}

// Export singleton instance for backward compatibility
export const aiService = new AIService();

// Export individual functions for convenience
export const {
  clearCacheForCV,
  clearAllCache,
  analyzeJobFit,
  getDraftStatus,
  createJobFitDraft,
  getCVDrafts,
  approveWhyGoodFitDraft,
  deleteWhyGoodFitDraft,
  createJobDescription,
  parseJobDescriptionUrl,
  getJobDescriptionStatus,
  getJobDescriptions,
  updateJobDescription,
  deleteJobDescription,
  associateJobDescriptionWithCV,
  disassociateJobDescriptionFromCV,
  generateAISection,
  getAISections,
  createCombinedAISuggestions,
  getAIEnhancementStatus,
  getLatestAIEnhancement,
  updateAIEnhancement,
  deleteAIEnhancement,
  deleteAllAIEnhancementsForCV,
  analyzeATSOptimization,
  checkAIFeatureStatus,
  retryWithBackoff,
  generateAllSuggestions,
} = aiService;
