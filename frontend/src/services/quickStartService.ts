/**
 * Quick Start Service
 *
 * API service for the Quick Start wizard feature.
 * Handles communication with the backend quick-start endpoint
 * for unauthenticated CV and job description preview.
 */

import axios from "axios";
import { API_CONFIG } from "../config/constants";
import { apiClient } from "./api";
import {
  QuickStartPreviewResponse,
  QuickStartClaimResponse,
  CVPreview,
  JobPreview
} from "../types/quickStart";

// Empty = same origin (prod). Dev sets VITE_API_BASE_URL=http://localhost:8000 in .env.local
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Submit CV file and job description for preview parsing
 *
 * @param cvFile - The CV file to upload
 * @param jobUrl - Optional job posting URL
 * @param jobText - Optional job description text
 * @returns Preview response with parsed data
 */
export const submitQuickStartPreview = async (
  cvFile?: File,
  jobUrl?: string,
  jobText?: string
): Promise<QuickStartPreviewResponse> => {
  // Validate inputs - at least one field must be provided
  if (!cvFile && !jobUrl && !jobText) {
    throw new Error("At least one field must be provided: CV file or job description");
  }

  if (jobText && jobText.length > 10000) {
    throw new Error("Job description text cannot exceed 10,000 characters");
  }

  // Create form data
  const formData = new FormData();

  if (cvFile) {
    formData.append("cv_file", cvFile);
  }

  if (jobUrl) {
    formData.append("job_url", jobUrl);
  }

  if (jobText) {
    formData.append("job_text", jobText);
  }

  try {
    const response = await axios.post<QuickStartPreviewResponse>(
      `${API_BASE_URL}/quick-start/preview`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: API_CONFIG.QUICK_START_PREVIEW_TIMEOUT_MS,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const errorMessage =
        error.response.data?.detail || error.response.data?.message;

      if (error.response.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please try again in a few minutes."
        );
      }

      throw new Error(errorMessage || "Failed to process quick start preview");
    } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "Parsing is taking longer than expected. Please try again or use a smaller CV."
      );
    } else if (error.request) {
      // Request made but no response
      throw new Error(
        "No response from server. Please check your connection."
      );
    } else {
      // Other errors
      throw new Error(error.message || "An unexpected error occurred");
    }
  }
};

/**
 * Claim quick start data from session without requiring file re-upload
 */
export const claimQuickStartFromSession = async (
  cvData: CVPreview | undefined,
  jobPreview: JobPreview | undefined,
  jobUrl?: string,
  jobText?: string
): Promise<{ cvId: string; jobDescriptionId: string }> => {
  // Combine CV data and job preview into a single object for the backend
  const sessionPayload = {
    ...(cvData || {}),
    job_preview: jobPreview,
  };

  // Create form data for the existing claim endpoint
  const formData = new FormData();
  formData.append("cv_data", JSON.stringify(sessionPayload));

  // Add base64 file data if available
  if (cvData && cvData.cvFileBase64) {
    formData.append("cv_file_base64", cvData.cvFileBase64);
  }

  if (jobUrl) formData.append("job_url", jobUrl);
  if (jobText) formData.append("job_text", jobText);

  try {
    const response = await apiClient.post<QuickStartClaimResponse>(
      `/quick-start/claim`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      cvId: response.data.cv_id || "",
      jobDescriptionId: response.data.job_description_id || "",
    };
  } catch (error: any) {
    // Check if this is a validation error (HTTP 400)
    if (error.response?.status === 400) {
      // Clear session immediately for validation errors
      clearQuickStartSession();

      // Extract specific error message from backend
      const errorMessage = error.response.data?.detail ||
                          error.response.data?.message ||
                          "Invalid data provided";

      throw new Error(errorMessage);
    }

    // For other errors, preserve session (user might retry)
    throw error;
  }
};

/**
 * Store quick start session data in sessionStorage
 */
export const storeQuickStartSession = async (data: {
  cvFile?: File;
  jobUrl?: string;
  jobText?: string;
  previewResponse?: QuickStartPreviewResponse;
}): Promise<void> => {
  try {
    let fileBase64: string | undefined;
    let cvFileName: string | undefined;
    let cvFileSize: number | undefined;
    let cvFileType: string | undefined;

    // Handle CV file if provided
    if (data.cvFile) {
      // Check file size BEFORE encoding (base64 increases size by ~33%)
      const MAX_FILE_SIZE_FOR_SESSION = 3 * 1024 * 1024; // 3MB limit
      if (data.cvFile.size > MAX_FILE_SIZE_FOR_SESSION) {
        throw new Error(
          'File too large to save for later. Please sign in first, then upload your CV (max 10MB).'
        );
      }

      // Convert file to base64
      fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(data.cvFile!);
      });

      cvFileName = data.cvFile.name;
      cvFileSize = data.cvFile.size;
      cvFileType = data.cvFile.type;
    }

    const sessionData = {
      cvFileName,
      cvFileSize,
      cvFileType,
      cvFileBase64: fileBase64,
      jobUrl: data.jobUrl,
      jobText: data.jobText,
      previewResponse: data.previewResponse,
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(sessionData);
    const sizeInMB = serialized.length / (1024 * 1024);

    // Warn if approaching quota (4MB safe limit)
    if (sizeInMB > 4) {
      console.warn(`Session data is ${sizeInMB.toFixed(2)}MB, may hit storage quota`);
    }

    sessionStorage.setItem("quickStartData", serialized);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('File too large for session storage. Please sign in first or use a smaller CV.');
    }
    if (error instanceof Error) {
      throw error; // Re-throw our custom error messages
    }
    console.error("Failed to store quick start session:", error);
    throw new Error("Failed to store session data. Please try again.");
  }
};

/**
 * Retrieve quick start session data from sessionStorage
 */
export const getQuickStartSession = ():
  | {
      cvFileName?: string;
      cvFileSize?: number;
      cvFileType?: string;
      cvFileBase64?: string;
      jobUrl?: string;
      jobText?: string;
      previewResponse?: QuickStartPreviewResponse;
      timestamp: number;
    }
  | null => {
  try {
    const stored = sessionStorage.getItem("quickStartData");

    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);

    // Check if data is too old (older than 1 hour)
    const age = Date.now() - data.timestamp;
    if (age > 3600000) {
      clearQuickStartSession();
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to retrieve quick start session:", error);
    return null;
  }
};

/**
 * Clear quick start session data from sessionStorage
 */
export const clearQuickStartSession = (): void => {
  try {
    sessionStorage.removeItem("quickStartData");
  } catch (error) {
    console.error("Failed to clear quick start session:", error);
  }
};
