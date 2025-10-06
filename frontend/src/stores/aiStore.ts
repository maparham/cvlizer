/**
 * AI Store - Zustand store for AI features state management
 * 
 * This module provides centralized state management for all AI features including
 * job fit analysis, content enhancement, ATS optimization, and job descriptions.
 * 
 * Key responsibilities:
 * - Manage AI feature status and availability
 * - Store job fit analysis results and state
 * - Handle ATS optimization data and analysis state
 * - Manage content enhancement suggestions
 * - Store job descriptions and active selection
 * - Provide actions for all AI operations
 * 
 * Usage:
 * - Import useAIStore hook in components
 * - Use selectors to get specific state slices
 * - Call actions to perform AI operations
 * - State updates automatically trigger re-renders
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import {
  AIStoreState,
  AIFeatureStatus,
  JobDescription,
  TempCVState,
  DraftResponse,
  // InlineDiffState - unused import removed
} from '../types/ai';
import { aiService } from '../services/aiService';

interface AIStoreActions {
  // Feature status actions
  checkFeatureStatus: () => Promise<void>;
  setFeatureStatus: (status: Partial<AIFeatureStatus>) => void;

  // Job fit analysis actions
  analyzeJobFit: (cvId: string, jobDescriptionId: string) => Promise<DraftResponse>;
  clearJobFitAnalysis: () => void;

  // Draft management actions
  getCVDrafts: (cvId: string) => Promise<any[]>;
  approveWhyGoodFitDraft: (cvId: string, draftId: string) => Promise<any>;
  deleteWhyGoodFitDraft: (cvId: string) => Promise<void>;
  clearDrafts: () => void;

  // ATS optimization actions
  analyzeATSOptimization: (cvId: string, jobDescriptionId: string) => Promise<void>;
  clearATSOptimization: () => void;

  // Content enhancement actions
  clearSuggestions: () => void;
  acceptSuggestion: (suggestionId: string, suggestionIndex: number) => void;
  rejectSuggestion: (suggestionId: string) => void;

  // Job description actions
  loadJobDescriptions: (cvId: string) => Promise<void>;
  createJobDescription: (cvId: string, jobDescription: Omit<JobDescription, 'id' | 'cv_id' | 'created_at' | 'updated_at'>) => Promise<JobDescription>;
  updateJobDescription: (jobDescriptionId: string, jobDescription: Partial<Omit<JobDescription, 'id' | 'cv_id' | 'created_at' | 'updated_at'>>) => Promise<JobDescription>;
  deleteJobDescription: (jobDescriptionId: string) => Promise<void>;
  setActiveJobDescription: (jobDescriptionId: string | undefined) => void;
  hideJobDescriptionFromSidebar: (jobDescriptionId: string) => void;
  showJobDescriptionInSidebar: (jobDescriptionId: string) => void;
  clearJobDescriptionsForCV: (cvId: string) => void;
  clearDraftsForCV: (cvId: string) => void;
  clearAllDrafts: () => void;

  // Background task actions
  parseJobDescriptionUrl: (cvId: string, url: string) => Promise<any>;
  enhanceContent: (cvId: string, content: string, contentType: string) => Promise<any>;
  createJobFitDraft: (cvId: string, jobDescriptionId: string) => Promise<any>;
  updateJobDescriptionStatus: (jobDescriptionId: string) => Promise<JobDescription>;
  updateDraftStatus: (draftId: string) => Promise<any>;
  updateContentEnhancementStatus: (enhancementId: string) => Promise<any>;

  // Inline diff actions
  generateInlineSuggestions: (cvId: string, jobDescriptionId: string) => Promise<void>;
  applyAllSuggestions: (cvData: any) => void;
  acceptInlineSuggestion: (suggestionId: string) => void;
  rejectInlineSuggestion: (suggestionId: string) => void;
  toggleSuggestionPanel: (isOpen?: boolean) => void;
  setHighlightMode: (mode: 'all' | 'pending' | 'approved') => void;
  exitDiffMode: () => void;
  commitApprovedChanges: () => any;

  // Utility actions
  clearAllData: () => void;
  clearCacheForCV: (cvId: string) => void;
}

type AIStore = AIStoreState & AIStoreActions;

const initialState: AIStoreState = {
  featureStatus: {
    isEnabled: false,
    lastChecked: new Date(),
  },
  jobFitAnalysis: {
    isAnalyzing: false,
    isGenerating: false,
  },
  atsOptimization: {
    isAnalyzing: false,
    isOptimizing: false,
  },
  suggestions: {},
  jobDescriptions: [],
  activeJobDescriptionId: undefined, // This will be set per CV when loading
  activeJobDescriptionIdPerCV: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('activeJobDescriptionIdPerCV') || '{}') : {},
  hiddenJobDescriptionIds: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hiddenJobDescriptionIds') || '[]') : [],
  inlineDiff: {
    tempCV: null,
    suggestions: [],
    isApplyingAll: false,
    isPanelOpen: false,
    highlightMode: 'all',
  },
  drafts: {
    drafts: [],
    isLoading: false,
  },
};

export const useAIStore = createWithEqualityFn<AIStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Feature status actions
      checkFeatureStatus: async () => {
        try {
          const isEnabled = await aiService.checkAIFeatureStatus();
          set((state) => ({
            featureStatus: {
              ...state.featureStatus,
              isEnabled,
              lastChecked: new Date(),
              error: undefined,
            },
          }));
        } catch (error) {
          set((state) => ({
            featureStatus: {
              ...state.featureStatus,
              isEnabled: false,
              lastChecked: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          }));
        }
      },

      setFeatureStatus: (status) => {
        set((state) => ({
          featureStatus: { ...state.featureStatus, ...status },
        }));
      },

      // Job fit analysis actions
      analyzeJobFit: async (cvId: string, jobDescriptionId: string): Promise<DraftResponse> => {
        set((state) => ({
          jobFitAnalysis: { ...state.jobFitAnalysis, isAnalyzing: true, error: undefined },
        }));

        try {
          const result = await aiService.analyzeJobFit(cvId, { job_description_id: jobDescriptionId });
          
          // Extract job fit analysis data from draft_data
          const analysisData = result.draft_data || {};
          
          set((state) => ({
            jobFitAnalysis: {
              ...state.jobFitAnalysis,
              isAnalyzing: false,
              lastAnalysis: {
                ...result,
                confidence_score: analysisData.confidence_score || 0,
                fit_analysis: analysisData.fit_analysis || '',
                key_matches: analysisData.key_matches || [],
                missing_skills: analysisData.missing_skills || [],
                strengths: analysisData.strengths || [],
                weaknesses: analysisData.weaknesses || [],
                suggested_improvements: analysisData.suggested_improvements || [],
                tokens_used: result.tokens_used || 0,
                generation_time: result.generation_time || 0,
                model_used: result.ai_model || 'gpt-4o-mini',
              },
              error: undefined,
            },
          }));
          
          return result;
        } catch (error) {
          set((state) => ({
            jobFitAnalysis: {
              ...state.jobFitAnalysis,
              isAnalyzing: false,
              error: error instanceof Error ? error.message : 'Failed to analyze job fit',
            },
          }));
          throw error;
        }
      },

      clearJobFitAnalysis: () => {
        set((state) => ({
          jobFitAnalysis: { ...state.jobFitAnalysis, lastAnalysis: undefined, error: undefined },
        }));
      },

      // Draft management actions

      getCVDrafts: async (cvId: string) => {
        set((state) => ({
          drafts: { ...state.drafts, isLoading: true, error: undefined },
        }));

        try {
          const drafts = await aiService.getCVDrafts(cvId);
          
          set((state) => {
            // Clear existing drafts for this CV and add new ones
            // This ensures we don't accumulate drafts from different CVs
            const otherCVDrafts = state.drafts.drafts.filter(draft => draft.cv_id !== cvId);
            
            return {
              drafts: {
                ...state.drafts,
                drafts: [...otherCVDrafts, ...drafts],
                isLoading: false,
                error: undefined,
              },
            };
          });
          
          return drafts;
        } catch (error) {
          set((state) => ({
            drafts: {
              ...state.drafts,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to get drafts',
            },
          }));
          throw error;
        }
      },

      approveWhyGoodFitDraft: async (cvId: string, draftId: string) => {
        try {
          const result = await aiService.approveWhyGoodFitDraft(cvId, draftId);

          // Remove the approved draft from the drafts list
          set((state) => ({
            drafts: {
              ...state.drafts,
              drafts: state.drafts.drafts.filter(draft => draft.id !== draftId),
            },
          }));

          // Return the full result including updated CV data
          return result;
        } catch (error) {
          set((state) => ({
            drafts: {
              ...state.drafts,
              error: error instanceof Error ? error.message : 'Failed to approve draft',
            },
          }));
          throw error;
        }
      },

      deleteWhyGoodFitDraft: async (cvId: string) => {
        try {
          await aiService.deleteWhyGoodFitDraft(cvId);

          // Remove the draft from the drafts list
          set((state) => ({
            drafts: {
              ...state.drafts,
              drafts: state.drafts.drafts.filter(draft =>
                !(draft.cv_id === cvId && draft.section_type === 'why_good_fit')
              ),
            },
          }));
        } catch (error) {
          set((state) => ({
            drafts: {
              ...state.drafts,
              error: error instanceof Error ? error.message : 'Failed to delete draft',
            },
          }));
          throw error;
        }
      },

      clearDrafts: () => {
        set((state) => ({
          drafts: { ...state.drafts, drafts: [], error: undefined },
        }));
      },

      // ATS optimization actions
      analyzeATSOptimization: async (cvId: string, jobDescriptionId: string) => {
        set((state) => ({
          atsOptimization: { ...state.atsOptimization, isAnalyzing: true, error: undefined },
        }));

        try {
          const result = await aiService.analyzeATSOptimization(cvId, { job_description_id: jobDescriptionId });
          set((state) => ({
            atsOptimization: {
              ...state.atsOptimization,
              isAnalyzing: false,
              lastAnalysis: result,
              error: undefined,
            },
          }));
        } catch (error) {
          set((state) => ({
            atsOptimization: {
              ...state.atsOptimization,
              isAnalyzing: false,
              error: error instanceof Error ? error.message : 'Failed to analyze ATS optimization',
            },
          }));
        }
      },

      clearATSOptimization: () => {
        set((state) => ({
          atsOptimization: { ...state.atsOptimization, lastAnalysis: undefined, error: undefined },
        }));
      },

      // Content enhancement actions

      clearSuggestions: () => {
        set({ suggestions: {} });
      },

      acceptSuggestion: (suggestionId: string, suggestionIndex: number) => {
        set((state) => {
          const suggestion = state.suggestions[suggestionId];
          if (suggestion) {
            return {
              suggestions: {
                ...state.suggestions,
                [suggestionId]: {
                  ...suggestion,
                  isAccepted: true,
                  selectedSuggestion: suggestionIndex,
                },
              },
            };
          }
          return state;
        });
      },

      rejectSuggestion: (suggestionId: string) => {
        set((state) => {
          const suggestion = state.suggestions[suggestionId];
          if (suggestion) {
            return {
              suggestions: {
                ...state.suggestions,
                [suggestionId]: {
                  ...suggestion,
                  isAccepted: false,
                  selectedSuggestion: undefined,
                },
              },
            };
          }
          return state;
        });
      },

      // Job description actions
      loadJobDescriptions: async (cvId: string) => {
        try {
          const jobDescriptions = await aiService.getJobDescriptions(cvId);
          
          // Replace job descriptions for this CV only (CV-scoped)
          set((state) => {
            // Remove old job descriptions for this CV and add new ones
            const otherCVJobDescriptions = state.jobDescriptions.filter(jd => jd.cv_id !== cvId);
            const newJobDescriptions = [...otherCVJobDescriptions, ...jobDescriptions];
            
            // Restore the CV-specific active job description selection
            const activeIdForCV = state.activeJobDescriptionIdPerCV[cvId];
            const isActiveIdValid = activeIdForCV && jobDescriptions.some(jd => jd.id === activeIdForCV);
            
            return {
              jobDescriptions: newJobDescriptions,
              activeJobDescriptionId: isActiveIdValid ? activeIdForCV : state.activeJobDescriptionId,
            };
          });
        } catch (error) {
          console.error('Failed to load job descriptions:', error);
        }
      },

      createJobDescription: async (cvId: string, jobDescription) => {
        try {
          const newJobDescription = await aiService.createJobDescription(cvId, jobDescription);
          set((state) => ({
            jobDescriptions: [...state.jobDescriptions, newJobDescription],
          }));
          return newJobDescription;
        } catch (error) {
          console.error('Failed to create job description:', error);
          throw error;
        }
      },

      updateJobDescription: async (jobDescriptionId: string, jobDescription) => {
        try {
          const updatedJobDescription = await aiService.updateJobDescription(jobDescriptionId, jobDescription);
          set((state) => ({
            jobDescriptions: state.jobDescriptions.map(jd =>
              jd.id === jobDescriptionId ? updatedJobDescription : jd
            ),
          }));
          return updatedJobDescription;
        } catch (error) {
          console.error('Failed to update job description:', error);
          throw error;
        }
      },

      deleteJobDescription: async (jobDescriptionId: string) => {
        try {
          await aiService.deleteJobDescription(jobDescriptionId);
          set((state) => {
            // Find the CV this job description belongs to
            const jobDescription = state.jobDescriptions.find(jd => jd.id === jobDescriptionId);
            const cvId = jobDescription?.cv_id;
            
            // Clean up per-CV map if this was the active selection for that CV
            const newMap = { ...state.activeJobDescriptionIdPerCV };
            if (cvId && newMap[cvId] === jobDescriptionId) {
              delete newMap[cvId];
              localStorage.setItem('activeJobDescriptionIdPerCV', JSON.stringify(newMap));
            }
            
            return {
              jobDescriptions: state.jobDescriptions.filter(jd => jd.id !== jobDescriptionId),
              activeJobDescriptionId: state.activeJobDescriptionId === jobDescriptionId 
                ? undefined 
                : state.activeJobDescriptionId,
              activeJobDescriptionIdPerCV: newMap,
            };
          });
        } catch (error) {
          console.error('Failed to delete job description:', error);
          throw error;
        }
      },

      setActiveJobDescription: (jobDescriptionId) => {
        set((state) => {
          // Find the CV this job description belongs to
          let cvId: string | undefined;

          if (jobDescriptionId) {
            // Setting a new active job description - find its CV
            const jobDescription = state.jobDescriptions.find(jd => jd.id === jobDescriptionId);
            cvId = jobDescription?.cv_id;
          } else {
            // Clearing active job description - find CV from current active
            const currentActive = state.jobDescriptions.find(jd => jd.id === state.activeJobDescriptionId);
            cvId = currentActive?.cv_id;
          }

          // Update both the current active and the per-CV map
          const newMap = { ...state.activeJobDescriptionIdPerCV };
          if (jobDescriptionId && cvId) {
            newMap[cvId] = jobDescriptionId;
          } else if (!jobDescriptionId && cvId) {
            delete newMap[cvId];
          }

          // Persist per-CV map to localStorage
          localStorage.setItem('activeJobDescriptionIdPerCV', JSON.stringify(newMap));

          return {
            activeJobDescriptionId: jobDescriptionId,
            activeJobDescriptionIdPerCV: newMap,
          };
        });
      },

      hideJobDescriptionFromSidebar: (jobDescriptionId: string) => {
        set((state) => {
          // Prevent duplicates - return early if already hidden
          if (state.hiddenJobDescriptionIds.includes(jobDescriptionId)) {
            return state;
          }

          const newHiddenIds = [...state.hiddenJobDescriptionIds, jobDescriptionId];
          // Persist to localStorage
          localStorage.setItem('hiddenJobDescriptionIds', JSON.stringify(newHiddenIds));
          return { hiddenJobDescriptionIds: newHiddenIds };
        });
      },

      showJobDescriptionInSidebar: (jobDescriptionId: string) => {
        set((state) => {
          const newHiddenIds = state.hiddenJobDescriptionIds.filter(id => id !== jobDescriptionId);
          // Persist to localStorage
          localStorage.setItem('hiddenJobDescriptionIds', JSON.stringify(newHiddenIds));
          return { hiddenJobDescriptionIds: newHiddenIds };
        });
      },

      // Background task actions
      parseJobDescriptionUrl: async (cvId: string, url: string) => {
        try {
          const response = await aiService.parseJobDescriptionUrl(cvId, url);
          
          // Clear cache to ensure fresh data on next load
          aiService.clearCacheForCV(cvId);
          aiService.clearAllCache(); // Clear global job descriptions cache
          
          // Always create a placeholder job description immediately
          if (response.job_description_id) {
            const placeholderJobDescription: JobDescription = {
              id: response.job_description_id,
              title: 'Parsing job description...',
              company: 'Unknown Company',
              location: 'Unknown Location',
              content: 'Parsing job description from URL...',
              source_url: url,
              is_parsing: true,
              parse_error: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cv_id: cvId
            };

            set((state) => {
              // Update per-CV map
              const newMap = { ...state.activeJobDescriptionIdPerCV };
              newMap[cvId] = placeholderJobDescription.id;
              localStorage.setItem('activeJobDescriptionIdPerCV', JSON.stringify(newMap));
              
              return {
                jobDescriptions: [...state.jobDescriptions, placeholderJobDescription],
                activeJobDescriptionId: placeholderJobDescription.id,
                activeJobDescriptionIdPerCV: newMap,
              };
            });

            // If parsing is complete immediately, update the placeholder
            if (!response.is_parsing) {
              const jobDescription = await aiService.getJobDescriptionStatus(response.job_description_id);
              set((state) => ({
                jobDescriptions: state.jobDescriptions.map(jd => 
                  jd.id === response.job_description_id ? jobDescription : jd
                ),
              }));
            }
          }
          
          return response;
        } catch (error) {
          console.error('Failed to parse job description URL:', error);
          throw error;
        }
      },

      enhanceContent: async (cvId: string, content: string, contentType: string) => {
        try {
          const response = await aiService.enhanceContent(cvId, { 
            original_content: content, 
            content_type: contentType 
          });
          
          // If generation is complete immediately, add to suggestions
          if (!response.is_generating && response.enhancement_id) {
            const enhancement = await aiService.getContentEnhancementStatus(response.enhancement_id);
            const suggestionId = `${contentType}-${content.substring(0, 20)}`;
            set((state) => ({
              suggestions: {
                ...state.suggestions,
                [suggestionId]: {
                  id: suggestionId,
                  originalContent: content,
                  suggestions: enhancement.suggestions || [],
                  overall_improvements: enhancement.overall_improvements || [],
                  isLoading: false,
                  error: undefined,
                },
              },
            }));
          }
          
          return response;
        } catch (error) {
          console.error('Failed to enhance content:', error);
          throw error;
        }
      },

      createJobFitDraft: async (cvId: string, jobDescriptionId: string) => {
        try {
          const response = await aiService.createJobFitDraft(cvId, jobDescriptionId);

          // Backend deletes any existing why_good_fit draft before creating a new one
          // So we need to remove any existing why_good_fit drafts from the store
          set((state) => {
            // Remove any existing why_good_fit drafts for this CV
            const filteredDrafts = state.drafts.drafts.filter(
              draft => !(draft.cv_id === cvId && draft.section_type === 'why_good_fit')
            );

            // If generation is complete immediately, add the new draft
            const newDrafts = response.is_generating
              ? filteredDrafts
              : [...filteredDrafts, response];

            return {
              drafts: {
                ...state.drafts,
                drafts: newDrafts,
              },
            };
          });

          return response;
        } catch (error) {
          console.error('Failed to create job fit draft:', error);
          throw error;
        }
      },

      updateJobDescriptionStatus: async (jobDescriptionId: string) => {
        try {
          const updatedJobDescription = await aiService.getJobDescriptionStatus(jobDescriptionId);
          
          // If parsing failed, delete the job description from backend and remove from store
          if (updatedJobDescription.parse_error) {
            try {
              // Delete from backend
              await aiService.deleteJobDescription(jobDescriptionId);
            } catch (deleteError) {
              console.error('Failed to delete failed job description from backend:', deleteError);
              // Continue with frontend cleanup even if backend deletion fails
            }
            
            // Remove from store
            set((state) => {
              // Find the CV this job description belongs to
              const jobDescription = state.jobDescriptions.find(jd => jd.id === jobDescriptionId);
              const cvId = jobDescription?.cv_id;
              
              // Clean up per-CV map if this was the active selection for that CV
              const newMap = { ...state.activeJobDescriptionIdPerCV };
              if (cvId && newMap[cvId] === jobDescriptionId) {
                delete newMap[cvId];
                localStorage.setItem('activeJobDescriptionIdPerCV', JSON.stringify(newMap));
              }
              
              return {
                jobDescriptions: state.jobDescriptions.filter(jd => jd.id !== jobDescriptionId),
                activeJobDescriptionId: state.activeJobDescriptionId === jobDescriptionId 
                  ? undefined 
                  : state.activeJobDescriptionId,
                activeJobDescriptionIdPerCV: newMap,
              };
            });
          } else {
            // Update the job description in the store
            set((state) => ({
              jobDescriptions: state.jobDescriptions.map(jd => 
                jd.id === jobDescriptionId ? updatedJobDescription : jd
              ),
            }));
          }
          
          return updatedJobDescription;
        } catch (error) {
          console.error('Failed to update job description status:', error);
          throw error;
        }
      },

      updateDraftStatus: async (draftId: string) => {
        try {
          const updatedDraft = await aiService.getDraftStatus(draftId);

          // Update or add the draft in the store
          set((state) => {
            const existingDraftIndex = state.drafts.drafts.findIndex(draft => draft.id === draftId);

            let newDrafts;
            if (existingDraftIndex >= 0) {
              // Draft exists - update it
              newDrafts = state.drafts.drafts.map(draft =>
                draft.id === draftId ? updatedDraft : draft
              );
            } else {
              // Draft doesn't exist - add it (this happens when background task completes)
              newDrafts = [...state.drafts.drafts, updatedDraft];
            }

            return {
              drafts: {
                ...state.drafts,
                drafts: newDrafts,
              },
            };
          });

          return updatedDraft;
        } catch (error) {
          console.error('Failed to update draft status:', error);
          throw error;
        }
      },

      updateContentEnhancementStatus: async (enhancementId: string) => {
        try {
          const updatedEnhancement = await aiService.getContentEnhancementStatus(enhancementId);
          
          // Update the enhancement in the store if it exists
          set((state) => ({
            suggestions: {
              ...state.suggestions,
              [enhancementId]: {
                ...state.suggestions[enhancementId],
                isLoading: updatedEnhancement.is_generating,
                error: updatedEnhancement.generation_error,
                suggestions: updatedEnhancement.suggestions || [],
                overall_improvements: updatedEnhancement.overall_improvements || [],
              },
            },
          }));
          
          return updatedEnhancement;
        } catch (error) {
          console.error('Failed to update content enhancement status:', error);
          throw error;
        }
      },

      clearJobDescriptionsForCV: (cvId: string) => {
        set((state) => {
          // Check if current active job description belongs to this CV
          const currentActiveJD = state.jobDescriptions.find(jd => jd.id === state.activeJobDescriptionId);
          const shouldClearActive = currentActiveJD?.cv_id === cvId;
          
          // Don't remove from activeJobDescriptionIdPerCV - keep it for restoration later
          return {
            jobDescriptions: state.jobDescriptions.filter(jd => jd.cv_id !== cvId),
            activeJobDescriptionId: shouldClearActive ? undefined : state.activeJobDescriptionId,
          };
        });
      },

      clearDraftsForCV: (cvId: string) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            drafts: state.drafts.drafts.filter(draft => draft.cv_id !== cvId),
          },
        }));
      },

      clearAllDrafts: () => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            drafts: [],
          },
        }));
      },

      // Utility actions
      clearAllData: () => {
        set(initialState);
        aiService.clearAllCache();
        // Clear per-CV map from localStorage
        localStorage.removeItem('activeJobDescriptionIdPerCV');
      },

      clearCacheForCV: (cvId: string) => {
        aiService.clearCacheForCV(cvId);
        set((state) => ({
          jobFitAnalysis: { ...state.jobFitAnalysis, lastAnalysis: undefined },
          atsOptimization: { ...state.atsOptimization, lastAnalysis: undefined },
          jobDescriptions: state.jobDescriptions.filter(jd => jd.cv_id !== cvId),
          // Don't clear drafts here to allow background tasks to complete
          // Drafts will be refreshed from backend when loading the CV
        }));
      },

      // Inline diff actions
      generateInlineSuggestions: async (cvId: string, jobDescriptionId: string) => {
        set((state) => ({
          inlineDiff: {
            ...state.inlineDiff,
            isApplyingAll: true,
            error: undefined,
          },
        }));

        try {
          // First, get ATS optimization suggestions
          const atsOptimization = await aiService.analyzeATSOptimization(cvId, { job_description_id: jobDescriptionId });
          
          // Transform ATS suggestions into inline diff format
          const suggestions: any[] = [];
          const processedKeywords = new Set<string>(); // Track processed keywords to avoid duplicates
          let suggestionIndex = 0;

          // Add missing keywords as suggestions
          atsOptimization.missing_keywords.forEach((keyword) => {
            // Skip if we've already processed this keyword
            if (processedKeywords.has(keyword.keyword.toLowerCase())) {
              return;
            }
            
            // Parse suggested_placement to determine section and field
            let section = 'skills';
            let fieldPath = 'technical';
            
            if (keyword.suggested_placement) {
              const placement = keyword.suggested_placement.toLowerCase();
              if (placement.includes('skills') || placement.includes('technical')) {
                section = 'skills';
                fieldPath = 'technical';
              } else if (placement.includes('soft') || placement.includes('interpersonal')) {
                section = 'skills';
                fieldPath = 'soft';
              } else if (placement.includes('professional') || placement.includes('summary')) {
                section = 'professional_summary';
                fieldPath = 'content';
              } else if (placement.includes('work') || placement.includes('experience')) {
                section = 'work_experience';
                fieldPath = '';
              }
            }

            // Generate more specific description based on section and field
            let description = '';
            if (section === 'skills') {
              if (fieldPath === 'technical') {
                description = `Add "${keyword.keyword}" to technical skills`;
              } else if (fieldPath === 'soft') {
                description = `Add "${keyword.keyword}" to soft skills`;
              } else {
                description = `Add "${keyword.keyword}" to skills section`;
              }
            } else if (section === 'work_experience') {
              description = `Integrate "${keyword.keyword}" into work experience descriptions`;
            } else if (section === 'professional_summary') {
              description = `Add "${keyword.keyword}" to professional summary`;
            } else {
              description = `Add "${keyword.keyword}" to ${section}`;
            }

            const suggestion = {
              id: `keyword-${suggestionIndex++}`,
              section,
              type: 'add_keyword' as const,
              description,
              originalValue: '',
              suggestedValue: keyword.keyword,
              status: 'pending' as const,
              changeType: 'addition' as const,
              fieldPath,
            };
            
            suggestions.push(suggestion);
            processedKeywords.add(keyword.keyword.toLowerCase());
          });

          // Add content optimization suggestions
          // Handle both old and new response formats
          const contentOptimizations = atsOptimization.content_optimization || [];
          contentOptimizations.forEach((optimization) => {
            suggestions.push({
              id: `content-${suggestionIndex++}`,
              section: optimization.section,
              type: 'enhance_content',
              description: optimization.suggestion,
              originalValue: '', // Will be filled when applied
              suggestedValue: optimization.suggestion,
              status: 'pending',
              changeType: 'modification',
              fieldPath: optimization.section === 'professional_summary' ? 'content' : undefined,
            });
          });

          // Also create suggestions from the general suggestions array
          if (atsOptimization.suggestions && atsOptimization.suggestions.length > 0) {
            atsOptimization.suggestions.forEach((suggestionText) => {
              // For general suggestions, only create section-specific suggestions when they would be meaningful
              const lowerText = suggestionText.toLowerCase();
              
              // Extract keyword from suggestion for meaningful content creation
              const keywordMatch = suggestionText.match(/['"]([^'"]+)['"]/);
              const keyword = keywordMatch ? keywordMatch[1] : null;
              
              // Skip if we've already processed this keyword from missing_keywords
              if (keyword && processedKeywords.has(keyword.toLowerCase())) {
                return;
              }
              
              // Skills section: Only if the suggestion is about enhancing skills content specifically
              if (lowerText.includes('skills') && (lowerText.includes('enhance') || lowerText.includes('improve') || lowerText.includes('add'))) {
                const meaningfulContent = keyword ? 
                  `Enhanced technical skills including ${keyword.toLowerCase()} and related competencies.` :
                  'Enhanced technical skills and competencies.';
                  
                suggestions.push({
                  id: `skills-general-${suggestionIndex++}`,
                  section: 'skills',
                  type: 'enhance_content',
                  description: suggestionText,
                  originalValue: '',
                  suggestedValue: meaningfulContent,
                  status: 'pending',
                  changeType: 'modification',
                  fieldPath: 'technical',
                });
              }
              
              // Work Experience: Only if the suggestion is about enhancing work experience content specifically
              if ((lowerText.includes('work experience') || lowerText.includes('employment')) && 
                  (lowerText.includes('enhance') || lowerText.includes('improve') || lowerText.includes('descriptions'))) {
                const meaningfulContent = keyword ?
                  `Enhanced work experience descriptions highlighting ${keyword.toLowerCase()} expertise and achievements.` :
                  'Enhanced work experience descriptions with improved detail and impact.';
                  
                suggestions.push({
                  id: `work-general-${suggestionIndex++}`,
                  section: 'work_experience',
                  type: 'enhance_content',
                  description: suggestionText,
                  originalValue: '',
                  suggestedValue: meaningfulContent,
                  status: 'pending',
                  changeType: 'modification',
                  fieldPath: undefined,
                });
              }
              
              // Professional Summary: Only if the suggestion is about enhancing professional summary content
              if ((lowerText.includes('professional') || lowerText.includes('summary') || 
                   lowerText.includes('profile') || lowerText.includes('overview')) &&
                  (lowerText.includes('enhance') || lowerText.includes('improve') || lowerText.includes('content'))) {
                const meaningfulContent = keyword ?
                  `Experienced professional with strong ${keyword.toLowerCase()} skills and diverse problem-solving capabilities.` :
                  'Enhanced professional summary highlighting key strengths and expertise.';
                  
                suggestions.push({
                  id: `professional-general-${suggestionIndex++}`,
                  section: 'professional_summary',
                  type: 'enhance_content',
                  description: suggestionText,
                  originalValue: '',
                  suggestedValue: meaningfulContent,
                  status: 'pending',
                  changeType: 'modification',
                  fieldPath: 'content',
                });
              }
            });
          }


          set((state) => ({
            inlineDiff: {
              ...state.inlineDiff,
              suggestions,
              isApplyingAll: false,
              isPanelOpen: true,
            },
          }));
        } catch (error) {
          set((state) => ({
            inlineDiff: {
              ...state.inlineDiff,
              isApplyingAll: false,
              error: error instanceof Error ? error.message : 'Failed to generate suggestions',
            },
          }));
        }
      },

      applyAllSuggestions: (cvData: any) => {
        const { suggestions } = get().inlineDiff;
        
        // Create a deep copy of the original CV data
        const tempData = JSON.parse(JSON.stringify(cvData));
        
        // Apply all suggestions to create temp state
        // NOTE: We don't actually apply suggestions to temp data here
        // Instead, we let the UI components handle displaying suggestions
        // and only apply them when the user explicitly accepts them
        suggestions.forEach((suggestion) => {
          if (suggestion.type === 'add_keyword') {
            // For keyword suggestions, we don't add them to temp data
            // They will be shown as pending suggestions in the UI
            // and only added when user accepts them
            if (suggestion.section === 'skills' && suggestion.fieldPath) {
              // Ensure the skills structure exists but don't add the keyword yet
              if (!tempData.skills) {
                tempData.skills = { technical: [], soft: [] };
              }
              if (!tempData.skills[suggestion.fieldPath]) {
                tempData.skills[suggestion.fieldPath] = [];
              }
            }
          } else if (suggestion.type === 'enhance_content') {
            // Handle content enhancement suggestions
            if (suggestion.section === 'professional_summary' && suggestion.fieldPath === 'content') {
              // For professional summary, we don't modify content yet
              // The UI will show the suggestion and let user accept/reject
              if (!tempData.professional_summary) {
                tempData.professional_summary = { content: '', keywords: [] };
              }
            }
          }
        });

        const tempCV: TempCVState = {
          originalCV: cvData,
          appliedSuggestions: suggestions,
          tempData,
          isDiffMode: true,
        };

        set((state) => ({
          inlineDiff: {
            ...state.inlineDiff,
            tempCV,
            isPanelOpen: true,
            cvId, // Store cvId for cache clearing when exiting
          },
        }));
      },

      acceptInlineSuggestion: (suggestionId: string) => {
        
        set((state) => {
          const updatedSuggestions = state.inlineDiff.suggestions.map((suggestion) =>
            suggestion.id === suggestionId
              ? { ...suggestion, status: 'approved' as const }
              : suggestion
          );
          

          // Update temp CV with accepted changes
          let updatedTempData = state.inlineDiff.tempCV?.tempData;
          const acceptedSuggestion = updatedSuggestions.find(s => s.id === suggestionId);

          if (acceptedSuggestion && updatedTempData) {
            // Apply the accepted suggestion to temp data
            if (acceptedSuggestion.type === 'add_keyword' && acceptedSuggestion.section === 'skills') {
              // Ensure skills object exists before accessing it
              if (!updatedTempData.skills) {
                updatedTempData.skills = { technical: [], soft: [] };
              }
              // Ensure field path array exists
              if (acceptedSuggestion.fieldPath && !updatedTempData.skills[acceptedSuggestion.fieldPath]) {
                updatedTempData.skills[acceptedSuggestion.fieldPath] = [];
              }
              // Add the skill if not already present
              if (acceptedSuggestion.fieldPath && !updatedTempData.skills[acceptedSuggestion.fieldPath].includes(acceptedSuggestion.suggestedValue)) {
                updatedTempData.skills[acceptedSuggestion.fieldPath].push(acceptedSuggestion.suggestedValue);
              }
            } else if (acceptedSuggestion.type === 'enhance_content' && acceptedSuggestion.section === 'professional_summary') {
              // Apply content enhancement to professional summary
              if (acceptedSuggestion.fieldPath === 'content') {
                if (!updatedTempData.professional_summary) {
                  updatedTempData.professional_summary = { content: '', keywords: [] };
                }
                updatedTempData.professional_summary.content = acceptedSuggestion.suggestedValue;
              }
            }
          }

          return {
            inlineDiff: {
              ...state.inlineDiff,
              suggestions: updatedSuggestions,
              tempCV: state.inlineDiff.tempCV ? {
                ...state.inlineDiff.tempCV,
                tempData: updatedTempData,
                appliedSuggestions: updatedSuggestions,
              } : null,
            },
          };
        });
      },

      rejectInlineSuggestion: (suggestionId: string) => {
        set((state) => {
          const updatedSuggestions = state.inlineDiff.suggestions.map((suggestion) =>
            suggestion.id === suggestionId
              ? { ...suggestion, status: 'rejected' as const }
              : suggestion
          );

          return {
            inlineDiff: {
              ...state.inlineDiff,
              suggestions: updatedSuggestions,
              tempCV: state.inlineDiff.tempCV ? {
                ...state.inlineDiff.tempCV,
                appliedSuggestions: updatedSuggestions,
              } : null,
            },
          };
        });
      },

      toggleSuggestionPanel: (isOpen?: boolean) => {
        set((state) => ({
          inlineDiff: {
            ...state.inlineDiff,
            isPanelOpen: isOpen !== undefined ? isOpen : !state.inlineDiff.isPanelOpen,
          },
        }));
      },

      setHighlightMode: (mode: 'all' | 'pending' | 'approved') => {
        set((state) => ({
          inlineDiff: {
            ...state.inlineDiff,
            highlightMode: mode,
          },
        }));
      },

      exitDiffMode: () => {
        // Clear ATS optimization cache when exiting diff mode
        // This prevents suggestions from reappearing after rejection
        const cvId = get().inlineDiff.cvId;
        if (cvId) {
          aiService.clearCacheForCV(cvId);
        }

        set(() => ({
          inlineDiff: {
            ...initialState.inlineDiff,
          },
        }));
      },

      commitApprovedChanges: () => {
        const { tempCV, suggestions } = get().inlineDiff;
        if (!tempCV) return;

        // Get only approved suggestions
        const approvedSuggestions = suggestions.filter(s => s.status === 'approved');
        
        // Apply approved changes to original CV
        const finalData = JSON.parse(JSON.stringify(tempCV.originalCV));
        
        approvedSuggestions.forEach((suggestion) => {
          if (suggestion.type === 'add_keyword' && suggestion.section === 'skills') {
            if (suggestion.fieldPath) {
              if (!finalData.skills[suggestion.fieldPath]) {
                finalData.skills[suggestion.fieldPath] = [];
              }
              if (!finalData.skills[suggestion.fieldPath].includes(suggestion.suggestedValue)) {
                finalData.skills[suggestion.fieldPath].push(suggestion.suggestedValue);
              }
            }
          } else if (suggestion.type === 'enhance_content' && suggestion.section === 'professional_summary') {
            // Apply content enhancement to professional summary
            if (suggestion.fieldPath === 'content') {
              if (!finalData.professional_summary) {
                finalData.professional_summary = { content: '', keywords: [] };
              }
              finalData.professional_summary.content = suggestion.suggestedValue;
            }
          }
        });

        // Clear diff mode
        get().exitDiffMode();
        
        return finalData;
      },
    }),
    {
      name: 'ai-store',
    }
  )
);

// Selectors for common use cases
export const useAIFeatureStatus = () => useAIStore((state) => state.featureStatus);
export const useJobFitAnalysis = () => useAIStore((state) => state.jobFitAnalysis);
export const useATSOptimization = () => useAIStore((state) => state.atsOptimization);
export const useJobDescriptions = () => useAIStore((state) => state.jobDescriptions);
export const useCVJobDescriptions = (cvId: string) => useAIStore((state) => 
  state.jobDescriptions.filter(jd => jd.cv_id === cvId), shallow
);
export const useVisibleJobDescriptions = () => useAIStore((state) => 
  state.jobDescriptions.filter(jd => !state.hiddenJobDescriptionIds.includes(jd.id))
);
export const useVisibleCVJobDescriptions = (cvId: string) => useAIStore((state) => 
  state.jobDescriptions.filter(jd => jd.cv_id === cvId && !state.hiddenJobDescriptionIds.includes(jd.id)), shallow
);
export const useActiveJobDescription = () => useAIStore((state) => {
  const activeId = state.activeJobDescriptionId;
  if (!activeId) return undefined;
  
  const jobDescription = state.jobDescriptions.find(jd => jd.id === activeId);
  // If the active job description is hidden, return undefined
  if (jobDescription && state.hiddenJobDescriptionIds.includes(activeId)) {
    return undefined;
  }
  
  return jobDescription;
});
export const useSuggestions = () => useAIStore((state) => state.suggestions);

// Inline diff selectors
export const useInlineDiff = () => useAIStore((state) => state.inlineDiff);
export const useInlineDiffSuggestions = () => useAIStore((state) => state.inlineDiff.suggestions);
export const useTempCV = () => useAIStore((state) => state.inlineDiff.tempCV);
export const useIsDiffMode = () => useAIStore((state) => !!state.inlineDiff.tempCV?.isDiffMode);
export const useSuggestionPanel = () => useAIStore((state) => state.inlineDiff.isPanelOpen);

// Draft selectors
export const useDrafts = () => useAIStore((state) => state.drafts);
export const useCVDrafts = (cvId: string) => {
  const drafts = useAIStore((state) => 
    state.drafts.drafts.filter(draft => draft.cv_id === cvId)
  , shallow);
  return drafts;
};
export const useWhyGoodFitDraft = (cvId: string) => useAIStore((state) => 
  state.drafts.drafts.find(draft => draft.cv_id === cvId && draft.section_type === 'why_good_fit')
);
