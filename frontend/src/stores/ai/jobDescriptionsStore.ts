/**
 * Job Descriptions Store - Job description management
 *
 * Manages job descriptions including CRUD operations, CV associations,
 * active selection per CV, and sidebar visibility control. Handles
 * background parsing tasks and localStorage persistence.
 */

import { StateCreator } from "zustand";
import type { AIStore } from "./types";
import { JobDescription } from "../../types/ai";
import { aiService } from "../../services/ai";
import { Logger } from "../../utils/logger";
import { ErrorHandler } from "../../utils/errorHandler";

export interface JobDescriptionsSliceState {
  jobDescriptions: JobDescription[];
  // Dedicated loading state for dashboard job applications skeleton.
  isJobDescriptionsLoading: boolean;
  hasLoadedJobDescriptions: boolean;
  activeJobDescriptionIdPerCV: Record<string, string>;
  hiddenJobDescriptionIds: string[];
}

export interface JobDescriptionsSliceActions {
  loadJobDescriptions: (cvId?: string) => Promise<void>;
  createJobDescription: (
    cvId: string,
    jobDescription: Omit<
      JobDescription,
      "id" | "cv_id" | "cv_ids" | "created_at" | "updated_at"
    >,
  ) => Promise<JobDescription>;
  updateJobDescription: (
    jobDescriptionId: string,
    jobDescription: Partial<
      Omit<JobDescription, "id" | "cv_id" | "cv_ids" | "created_at" | "updated_at">
    >,
  ) => Promise<JobDescription>;
  deleteJobDescription: (jobDescriptionId: string) => Promise<void>;
  associateJobDescriptionWithCV: (jobDescriptionId: string, cvId: string) => Promise<void>;
  disassociateJobDescriptionFromCV: (jobDescriptionId: string, cvId: string) => Promise<void>;
  setActiveJobDescription: (jobDescriptionId: string | undefined, cvId: string) => void;
  hideJobDescriptionFromSidebar: (jobDescriptionId: string) => void;
  showJobDescriptionInSidebar: (jobDescriptionId: string) => void;
  clearJobDescriptionsForCV: (cvId: string) => void;
  parseJobDescriptionUrl: (cvId: string, url: string) => Promise<any>;
  updateJobDescriptionStatus: (jobDescriptionId: string) => Promise<JobDescription>;
}

export type JobDescriptionsSlice = JobDescriptionsSliceState & JobDescriptionsSliceActions;

// Initialize localStorage state
const loadFromLocalStorage = () => {
  if (typeof window === "undefined") {
    return { activeJobDescriptionIdPerCV: {}, hiddenJobDescriptionIds: [] };
  }

  return {
    activeJobDescriptionIdPerCV: JSON.parse(
      localStorage.getItem("activeJobDescriptionIdPerCV") || "{}",
    ),
    hiddenJobDescriptionIds: JSON.parse(
      localStorage.getItem("hiddenJobDescriptionIds") || "[]",
    ),
  };
};

export const createJobDescriptionsSlice: StateCreator<
  AIStore,
  [],
  [],
  JobDescriptionsSlice
> = (set, get) => {
  const stored = loadFromLocalStorage();

  return {
    jobDescriptions: [],
    isJobDescriptionsLoading: false,
    hasLoadedJobDescriptions: false,
    activeJobDescriptionIdPerCV: stored.activeJobDescriptionIdPerCV,
    hiddenJobDescriptionIds: stored.hiddenJobDescriptionIds,

    loadJobDescriptions: async (cvId?: string) => {
      // Skip loading for temporary CVs (not yet saved to backend)
      if (cvId && cvId.startsWith("temp-")) {
        return;
      }

      set({
        isJobDescriptionsLoading: true,
        // Keep existing data visible during reload to prevent flicker/data loss.
      });

      try {
        // Load ALL user job descriptions (user-scoped, not CV-specific)
        const jobDescriptions = await aiService.getJobDescriptions();

        set(() => ({
          jobDescriptions,
          isJobDescriptionsLoading: false,
          hasLoadedJobDescriptions: true,
        }));
      } catch (error) {
        set(() => ({
          isJobDescriptionsLoading: false,
          hasLoadedJobDescriptions: true,
        }));
        ErrorHandler.handleSilent(error, {
          feature: "job-descriptions",
          action: "load",
          metadata: { cvId },
        });
      }
    },

    createJobDescription: async (cvId: string, jobDescription) => {
      try {
        // Create job description with CV association
        const newJobDescription = await aiService.createJobDescription(
          jobDescription,
          cvId, // Associate with this CV
        );
        set((state) => ({
          jobDescriptions: [...state.jobDescriptions, newJobDescription],
        }));
        return newJobDescription;
      } catch (error) {
        ErrorHandler.handle(error, {
          feature: "job-descriptions",
          action: "create",
          userMessage: "Failed to create job description",
          metadata: { cvId },
        });
        throw error;
      }
    },

    updateJobDescription: async (jobDescriptionId: string, jobDescription) => {
      try {
        const updatedJobDescription = await aiService.updateJobDescription(
          jobDescriptionId,
          jobDescription,
        );
        set((state) => ({
          jobDescriptions: state.jobDescriptions.map((jd) =>
            jd.id === jobDescriptionId ? updatedJobDescription : jd,
          ),
        }));
        return updatedJobDescription;
      } catch (error) {
        ErrorHandler.handle(error, {
          feature: "job-descriptions",
          action: "update",
          userMessage: "Failed to update job description",
          metadata: { jobDescriptionId },
        });
        throw error;
      }
    },

    deleteJobDescription: async (jobDescriptionId: string) => {
      try {
        await aiService.deleteJobDescription(jobDescriptionId);
        set((state) => {
          // Find the CV this job description belongs to
          const jobDescription = state.jobDescriptions.find(
            (jd) => jd.id === jobDescriptionId,
          );
          const cvId = jobDescription?.cv_id;

          // Clean up per-CV map if this was the active selection for that CV
          const newMap = { ...state.activeJobDescriptionIdPerCV };
          if (cvId && newMap[cvId] === jobDescriptionId) {
            delete newMap[cvId];
            localStorage.setItem(
              "activeJobDescriptionIdPerCV",
              JSON.stringify(newMap),
            );
          }

            return {
              jobDescriptions: state.jobDescriptions.filter(
                (jd) => jd.id !== jobDescriptionId,
              ),
              activeJobDescriptionIdPerCV: newMap,
            };
        });
      } catch (error) {
        ErrorHandler.handle(error, {
          feature: "job-descriptions",
          action: "delete",
          userMessage: "Failed to delete job description",
          metadata: { jobDescriptionId },
        });
        throw error;
      }
    },

    associateJobDescriptionWithCV: async (
      jobDescriptionId: string,
      cvId: string,
    ) => {
      try {
        await aiService.associateJobDescriptionWithCV(jobDescriptionId, cvId);

        // Reload job descriptions to get updated associations
        await get().loadJobDescriptions();
      } catch (error) {
        ErrorHandler.handle(error, {
          feature: "job-descriptions",
          action: "associate",
          userMessage: "Failed to associate job description with CV",
          metadata: { jobDescriptionId, cvId },
        });
        throw error;
      }
    },

    disassociateJobDescriptionFromCV: async (
      jobDescriptionId: string,
      cvId: string,
    ) => {
      try {
        await aiService.disassociateJobDescriptionFromCV(
          jobDescriptionId,
          cvId,
        );

        // Reload job descriptions to get updated associations
        await get().loadJobDescriptions();
      } catch (error) {
        ErrorHandler.handle(error, {
          feature: "job-descriptions",
          action: "disassociate",
          userMessage: "Failed to remove job description association",
          metadata: { jobDescriptionId, cvId },
        });
        throw error;
      }
    },

    setActiveJobDescription: (
      jobDescriptionId: string | undefined,
      cvId: string,
    ) => {
      if (!cvId || cvId === "undefined") {
        return;
      }

      set((state) => {
        const newMap = { ...state.activeJobDescriptionIdPerCV };
        if (jobDescriptionId) {
          newMap[cvId] = jobDescriptionId;
        } else {
          delete newMap[cvId];
        }

        localStorage.setItem(
          "activeJobDescriptionIdPerCV",
          JSON.stringify(newMap),
        );

        return {
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

        const newHiddenIds = [
          ...state.hiddenJobDescriptionIds,
          jobDescriptionId,
        ];
        // Persist to localStorage
        localStorage.setItem(
          "hiddenJobDescriptionIds",
          JSON.stringify(newHiddenIds),
        );
        return { hiddenJobDescriptionIds: newHiddenIds };
      });
    },

    showJobDescriptionInSidebar: (jobDescriptionId: string) => {
      set((state) => {
        const newHiddenIds = state.hiddenJobDescriptionIds.filter(
          (id) => id !== jobDescriptionId,
        );
        // Persist to localStorage
        localStorage.setItem(
          "hiddenJobDescriptionIds",
          JSON.stringify(newHiddenIds),
        );
        return { hiddenJobDescriptionIds: newHiddenIds };
      });
    },

    clearJobDescriptionsForCV: (cvId: string) => {
      set((state) => ({
        jobDescriptions: state.jobDescriptions.filter(
          (jd) => jd.cv_id !== cvId,
        ),
      }));
    },

    parseJobDescriptionUrl: async (cvId: string, url: string) => {
      try {
        Logger.info("Parsing job description from URL", { cvId, url });
        // Pass url first, then cvId for association
        const response = await aiService.parseJobDescriptionUrl(url, cvId);

        // Clear cache to ensure fresh data on next load
        aiService.clearAllCache();

        // Always create a placeholder job description immediately
        if (response.job_description_id) {
          const placeholderJobDescription: JobDescription = {
            id: response.job_description_id,
            title: "Parsing job description...",
            company: "Unknown Company",
            location: "Unknown Location",
            content: "Parsing job description from URL...",
            source_url: url,
            is_parsing: true,
            parse_error: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cv_id: cvId,
            cv_ids: [cvId], // Initially associated with this CV
          };

          set((state) => {
            // Update per-CV map
            const newMap = { ...state.activeJobDescriptionIdPerCV };
            newMap[cvId] = placeholderJobDescription.id;
            localStorage.setItem(
              "activeJobDescriptionIdPerCV",
              JSON.stringify(newMap),
            );

            return {
              jobDescriptions: [
                ...state.jobDescriptions,
                placeholderJobDescription,
              ],
              activeJobDescriptionIdPerCV: newMap,
            };
          });

          // If parsing is complete immediately, update the placeholder
          if (!response.is_parsing) {
            const jobDescription = await aiService.getJobDescriptionStatus(
              response.job_description_id,
            );
            set((state) => ({
              jobDescriptions: state.jobDescriptions.map((jd) =>
                jd.id === response.job_description_id ? jobDescription : jd,
              ),
            }));
          }
        }

        return response;
      } catch (error) {
        ErrorHandler.handle(error, {
          feature: "job-descriptions",
          action: "parse-url",
          userMessage: "Failed to parse job description from URL",
          metadata: { cvId, url },
        });
        throw error;
      }
    },

    updateJobDescriptionStatus: async (jobDescriptionId: string) => {
      try {
        const updatedJobDescription =
          await aiService.getJobDescriptionStatus(jobDescriptionId);

        // If parsing failed, delete the job description from backend and remove from store
        if (updatedJobDescription.parse_error) {
          try {
            // Delete from backend
            await aiService.deleteJobDescription(jobDescriptionId);
          } catch (deleteError) {
            console.error(
              "Failed to delete failed job description from backend:",
              deleteError,
            );
            // Continue with frontend cleanup even if backend deletion fails
          }

          // Remove from store
          set((state) => {
            // Find the CV this job description belongs to
            const jobDescription = state.jobDescriptions.find(
              (jd) => jd.id === jobDescriptionId,
            );
            const cvId = jobDescription?.cv_id;

            // Clean up per-CV map if this was the active selection for that CV
            const newMap = { ...state.activeJobDescriptionIdPerCV };
            if (cvId && newMap[cvId] === jobDescriptionId) {
              delete newMap[cvId];
              localStorage.setItem(
                "activeJobDescriptionIdPerCV",
                JSON.stringify(newMap),
              );
            }

            return {
              jobDescriptions: state.jobDescriptions.filter(
                (jd) => jd.id !== jobDescriptionId,
              ),
              activeJobDescriptionIdPerCV: newMap,
            };
          });
        } else {
          // Update the job description in the store
          set((state) => ({
            jobDescriptions: state.jobDescriptions.map((jd) =>
              jd.id === jobDescriptionId ? updatedJobDescription : jd,
            ),
          }));
        }

        return updatedJobDescription;
      } catch (error) {
        console.error("Failed to update job description status:", error);
        throw error;
      }
    },
  };
};
