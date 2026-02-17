/**
 * CV CRUD Slice - CV Create, Read, Update, Delete operations
 *
 * Manages CV CRUD operations including fetching, uploading, updating,
 * deleting, and duplicating CVs. Handles temporary CV workflow,
 * pagination state, and basic state management.
 */

import { StateCreator } from "zustand";
import {
  CV,
  CVUpdateRequest,
} from "../../types";
import { cvApi, normalizeApiError } from "../../services/api";
import { CVValidationService } from "../../services/cvValidationService";
import { DEFAULT_CV_FILENAME, TEMP_CV_ID_PREFIX, DEFAULT_CV_DATA } from "./constants";
import type { CVStore } from "./types";
import { useEditedSinceAIStore } from "../editedSinceAIStore";

export interface CVCrudSliceState {
  // State
  cvs: CV[];
  currentCV: CV | null;
  temporaryCV: CV | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  saving: boolean;
  lastSavedAt: string | null;

  // Pagination state
  currentPage: number;
  totalPages: number;
  totalCVs: number;
  cvsPerPage: number;
}

export interface CVCrudSliceActions {
  // CRUD actions
  fetchCVs: (page?: number, limit?: number) => Promise<void>;
  fetchCV: (cvId: string) => Promise<CV | null>;
  uploadCV: (file: File) => Promise<CV>;
  createTemporaryCV: () => CV;
  saveTemporaryCV: (cvData: CVUpdateRequest) => Promise<CV>;
  updateCV: (cvId: string, data: CVUpdateRequest) => Promise<CV>;
  updateCVTitle: (cvId: string, title: string) => Promise<CV>;
  deleteCV: (cvId: string) => Promise<void>;
  duplicateCV: (cvId: string) => Promise<CV>;

  // Utility actions
  setCurrentCV: (cv: CV | null) => void;
  setTemporaryCV: (cv: CV | null) => void;
  clearError: () => void;
  setPage: (page: number) => void;

  // Internal actions
  addCV: (cv: CV) => void;
  updateCVInList: (cv: CV) => void;
  removeCVFromList: (cvId: string) => void;
  setLoading: (loading: boolean) => void;
  setUploading: (uploading: boolean) => void;
  setError: (error: string | null) => void;
  setSaving: (saving: boolean) => void;
}

export type CVCrudSlice = CVCrudSliceState & CVCrudSliceActions;

export const createCVCrudSlice: StateCreator<
  CVStore,
  [],
  [],
  CVCrudSlice
> = (set, get) => ({
  // Initial state
  cvs: [],
  currentCV: null,
  temporaryCV: null,
  loading: false,
  uploading: false,
  error: null,
  saving: false,
  lastSavedAt: null,
  currentPage: 1,
  totalPages: 1,
  totalCVs: 0,
  cvsPerPage: 100,

  // Actions
  fetchCVs: async (page: number = 1, limit: number = 100) => {
    const state = get();
    if (state.loading) return; // Prevent concurrent fetches

    set({ loading: true, error: null });

    try {
      const response = await cvApi.getCVs(page, limit);
      const cvs = response.cvs || [];

      // Check if there are unparsed CVs
      const hasUnparsedCVs = cvs.some(
        (cv: CV) => !cv.is_parsed && !cv.parse_error,
      );

      set({
        cvs,
        loading: false,
        hasUnparsedCVs,
        error: null,
        currentPage: response.page || page,
        totalPages: response.pages || 1,
        totalCVs: response.total || 0,
        cvsPerPage: response.limit || limit,
      });

      // Start polling if there are unparsed CVs
      const pollingManager = get().pollingManager;
      if (hasUnparsedCVs && !pollingManager?.isActive()) {
        get().startPolling();
      } else if (!hasUnparsedCVs && pollingManager?.isActive()) {
        get().stopPolling();
      }
    } catch (error: any) {
      const errorMessage =
        normalizeApiError(error) || "Failed to fetch CVs";
      set({
        error: errorMessage,
        loading: false,
        cvs: [],
      });
    }
  },

  fetchCV: async (cvId: string): Promise<CV | null> => {
    set({ loading: true, error: null });

    try {
      const cv = await cvApi.getCV(cvId);

      set({
        currentCV: cv,
        loading: false,
        error: null,
      });

      // Also update in the CVs list if it exists
      const existingIndex = get().cvs.findIndex((c) => c.id === cvId);
      if (existingIndex !== -1) {
        const updatedCVs = [...get().cvs];
        updatedCVs[existingIndex] = cv;
        set({ cvs: updatedCVs });
      }

      return cv;
    } catch (error: any) {
      const errorMessage = normalizeApiError(error) || "Failed to fetch CV";
      set({
        error: errorMessage,
        loading: false,
        currentCV: null,
      });
      return null;
    }
  },

  uploadCV: async (file: File): Promise<CV> => {
    set({ uploading: true, error: null });

    try {
      const cv = await cvApi.uploadCV(file);

      // Add to the CVs list
      set((state) => ({
        cvs: [...state.cvs, cv],
        uploading: false,
        error: null,
        hasUnparsedCVs: true, // New uploads typically need parsing
      }));

      // Start polling for parsing updates
      if (!get().pollingManager?.isActive()) {
        get().startPolling();
      }

      return cv;
    } catch (error: any) {
      const errorMessage =
        normalizeApiError(error) || "Failed to upload CV";
      set({
        error: errorMessage,
        uploading: false,
      });
      throw new Error(errorMessage);
    }
  },

  createTemporaryCV: (): CV => {
    // Create a temporary CV object that exists only in frontend state
    const temporaryCV: CV = {
      id: `${TEMP_CV_ID_PREFIX}${Date.now()}`, // Temporary ID
      user_id: "", // Will be set when saved
      original_filename: DEFAULT_CV_FILENAME,
      file_size: 0,
      file_type: "application/pdf",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_parsed: true,
      parsed_data: JSON.parse(JSON.stringify(DEFAULT_CV_DATA)), // Deep copy
      is_imported: false,
      has_been_edited: false,
    };

    set({ temporaryCV });
    return temporaryCV;
  },

  saveTemporaryCV: async (cvData: CVUpdateRequest): Promise<CV> => {
    const { temporaryCV } = get();
    if (!temporaryCV) {
      throw new Error("No temporary CV to save");
    }

    set({ loading: true, error: null });

    try {
      // Don't filter hidden sections - preserve all data for backend storage
      // Hidden sections are managed by section_config.visible flag
      const cleanedData = CVValidationService.cleanForBackend(cvData.parsed_data);
      const cleanedRequest = { parsed_data: cleanedData };

      // Create blank CV with the cleaned data
      const newCV = await cvApi.createBlankCV();

      // Batch the updates to minimize API calls
      const promises = [cvApi.updateCV(newCV.id, cleanedRequest)];

      // Only update title if it's different from default
      if (temporaryCV.original_filename !== DEFAULT_CV_FILENAME) {
        promises.push(
          cvApi.updateCVTitle(newCV.id, temporaryCV.original_filename),
        );
      }

      // Execute updates in parallel
      const results = await Promise.all(promises);
      const finalCV = results[results.length - 1]; // Get the last result (either updateCV or updateCVTitle)

      // Add to the CVs list and clear temporary CV
      set((state) => ({
        cvs: [...state.cvs, finalCV],
        currentCV: finalCV,
        temporaryCV: null,
        loading: false,
        error: null,
      }));

      return finalCV;
    } catch (error: any) {
      const errorMessage = normalizeApiError(error) || "Failed to save CV";
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  updateCV: async (cvId: string, data: CVUpdateRequest): Promise<CV> => {
    // Debounced save UX: do not toggle heavy loading; mark saving
    set({ error: null, saving: true });
    try {
      // Don't filter hidden sections - preserve all data for backend storage
      // Hidden sections are managed by section_config.visible flag
      // filterVisibleSections is only for AI/display operations, not for saving
      const cleanedData = CVValidationService.cleanForBackend(data.parsed_data);
      const validationErrors =
        CVValidationService.validateCVData(cleanedData);
      if (validationErrors.length > 0) {
        set({ saving: false });
        throw new Error(
          `CV validation failed:\n• ${validationErrors.join("\n• ")}`,
        );
      }
      const cleanedRequest = { parsed_data: cleanedData };
      const updatedCV = await cvApi.updateCV(cvId, cleanedRequest);
      set({
        currentCV:
          get().currentCV?.id === cvId ? updatedCV : get().currentCV,
        error: null,
        saving: false,
        lastSavedAt: new Date().toISOString(),
      });
      get().updateCVInList(updatedCV);
      return updatedCV;
    } catch (error: any) {
      // Parse 422 validation errors for better user feedback
      const apiError = error?.response?.data;
      let errorMessage = "Failed to update CV";

      if (error?.response?.status === 422) {
        // Handle array-shaped Pydantic validation errors
        let errorArray: any[] = [];

        if (Array.isArray(apiError)) {
          // Direct array of errors: [{ loc: [...], msg: "...", ... }, ...]
          errorArray = apiError;
        } else if (Array.isArray(apiError?.detail)) {
          // FastAPI format: { detail: [{ loc: [...], msg: "...", ... }, ...] }
          errorArray = apiError.detail;
        } else if (apiError?.detail?.errors && Array.isArray(apiError.detail.errors)) {
          // Nested errors format: { detail: { errors: [...] } }
          errorArray = apiError.detail.errors;
        }

        if (errorArray.length > 0) {
          // Map Pydantic loc paths to our format: "Section #N: Field message"
          const formattedErrors = errorArray.map((e: any) => {
            const loc = e.loc || [];
            const msg = e.msg || "Validation failed";

            // Skip leading ["body", "parsed_data"] if present
            const path = loc.slice();
            if (path[0] === "body") path.shift();
            if (path[0] === "parsed_data") path.shift();

            // Path should now be: [section, index?, field?]
            if (path.length === 0) return `Field: ${msg}`;

            const section = path[0];
            // Capitalize section name (e.g., "publications" -> "Publications")
            const sectionName = section.charAt(0).toUpperCase() + section.slice(1).replace(/_/g, " ");

            if (path.length === 1) {
              return `${sectionName}: ${msg}`;
            }

            // Check if second element is a number (index)
            const secondPart = path[1];
            const index = typeof secondPart === "number" ? secondPart : parseInt(secondPart);

            if (!isNaN(index) && index >= 0) {
              // Array item with index: "Publications #1: Journal is required"
              const itemNumber = index + 1; // Display as 1-based
              const field = path.length > 2 ? path[2] : "";

              // Extract field name from message if not provided
              let fieldName = field;
              if (!fieldName && msg.toLowerCase().includes("required")) {
                // Try to extract field name from message
                const fieldMatch = msg.match(/^(\w+(?:\s+\w+)*)\s+(?:is|are)\s+/i);
                if (fieldMatch) {
                  fieldName = fieldMatch[1];
                }
              }

              const fieldDisplay = fieldName
                ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, " ")
                : "";

              return `${sectionName} #${itemNumber}: ${fieldDisplay ? fieldDisplay + " " : ""}${msg}`;
            } else {
              // Non-indexed field: "Section: Field message"
              const field = secondPart;
              const fieldDisplay = field
                ? field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")
                : "";
              return `${sectionName}: ${fieldDisplay ? fieldDisplay + " " : ""}${msg}`;
            }
          });

          errorMessage = `CV validation failed:\n• ${formattedErrors.join("\n• ")}`;
        } else if (apiError?.detail?.message) {
          // Handle business rule validation errors
          errorMessage = apiError.detail.message;
        } else {
          errorMessage = normalizeApiError(error) || errorMessage;
        }
      } else {
        errorMessage = normalizeApiError(error) || errorMessage;
      }

      set({ error: errorMessage, saving: false });
      throw new Error(errorMessage);
    }
  },

  updateCVTitle: async (cvId: string, title: string): Promise<CV> => {
    set({ loading: true, error: null });

    try {
      const updatedCV = await cvApi.updateCVTitle(cvId, title);

      // Update in both currentCV and CVs list
      set({
        currentCV:
          get().currentCV?.id === cvId ? updatedCV : get().currentCV,
        loading: false,
        error: null,
      });

      get().updateCVInList(updatedCV);

      return updatedCV;
    } catch (error: any) {
      const errorMessage =
        normalizeApiError(error) || "Failed to update CV title";

      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  deleteCV: async (cvId: string): Promise<void> => {
    set({ loading: true, error: null });

    try {
      await cvApi.deleteCV(cvId);

      // Remove from state
      get().removeCVFromList(cvId);

      // Clear currentCV if it was the deleted one
      if (get().currentCV?.id === cvId) {
        set({ currentCV: null });
      }

      set({
        loading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        normalizeApiError(error) || "Failed to delete CV";
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  duplicateCV: async (cvId: string): Promise<CV> => {
    set({ loading: true, error: null });

    try {
      const duplicatedCV = await cvApi.duplicateCV(cvId);

      // Add to the CVs list
      set((state) => ({
        cvs: [...state.cvs, duplicatedCV],
        loading: false,
        error: null,
      }));

      return duplicatedCV;
    } catch (error: any) {
      const errorMessage =
        normalizeApiError(error) || "Failed to duplicate CV";
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  // Utility actions
  setCurrentCV: (cv: CV | null) => {
    const previousId = get().currentCV?.id ?? null;
    const newId = cv?.id ?? null;
    set({ currentCV: cv });
    if (previousId && previousId !== newId) {
      useEditedSinceAIStore.getState().clearEditedForCV(previousId);
    }
  },

  setTemporaryCV: (cv: CV | null) => {
    set({ temporaryCV: cv });
  },

  clearError: () => {
    set({ error: null });
  },

  // Internal actions
  addCV: (cv: CV) => {
    set((state) => ({
      cvs: [...state.cvs, cv],
    }));
  },

  updateCVInList: (updatedCV: CV) => {
    set((state) => ({
      cvs: state.cvs.map((cv) => (cv.id === updatedCV.id ? updatedCV : cv)),
    }));
  },

  removeCVFromList: (cvId: string) => {
    set((state) => ({
      cvs: state.cvs.filter((cv) => cv.id !== cvId),
    }));
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setUploading: (uploading: boolean) => {
    set({ uploading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setSaving: (saving: boolean) => {
    set({ saving });
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchCVs(page, get().cvsPerPage);
  },
});
