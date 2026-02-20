/**
 * API Service Module
 *
 * This module provides centralized HTTP client configuration and API functions including:
 * - Axios instance with base URL configuration
 * - Request/response interceptors for authentication
 * - Automatic token refresh handling
 * - Error normalization utilities
 * - CV-specific API endpoints (upload, CRUD operations)
 */
import axios from "axios";
import { ClerkWindow, isClerkAvailable } from "../types/clerk";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add authentication token
api.interceptors.request.use(
  async (config) => {
    // Use Clerk token
    if (!config.headers.Authorization) {
      // Fall back to Clerk token from the global Clerk instance
      if (typeof window !== "undefined" && isClerkAvailable(window)) {
        const clerk = (window as ClerkWindow).Clerk;
        if (!clerk) {
          return Promise.reject(
            new Error("Authentication service not available"),
          );
        }

        try {
          const token = await clerk.session?.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            // No token available, reject the request to prevent 403 errors
            return Promise.reject(
              new Error("No authentication token available"),
            );
          }
        } catch (error) {
          // Authentication token not available, reject the request
          return Promise.reject(
            new Error("Authentication token not available"),
          );
        }
      } else {
        // Clerk not available, reject the request
        return Promise.reject(
          new Error("Authentication service not available"),
        );
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Don't redirect for impersonation status checks - these can fail benignly
      // Don't redirect for Quick Start preview - it's meant to work without auth
      if (
        error.config?.url?.includes('/api/auth/impersonation/status') ||
        error.config?.url?.includes('/api/quick-start/preview')
      ) {
        return Promise.reject(error);
      }

      // Handle unauthorized errors - user needs to re-authenticate
      // Redirect to sign-in if Clerk is available
      if (typeof window !== "undefined" && isClerkAvailable(window)) {
        const clerk = (window as ClerkWindow).Clerk;
        if (clerk) {
          try {
            await clerk.redirectToSignIn();
          } catch {
            // Redirect failed - ignore error
          }
        }
      }
    }

    // For rate limit (429) errors, return a cleaner error object
    // to reduce console noise - these are expected and handled gracefully
    if (error.response?.status === 429) {
      // Create a minimal error without axios's verbose logging
      return Promise.reject({
        response: error.response,
        config: error.config,
        message: 'Rate limit reached',
        code: '429',
      });
    }

    return Promise.reject(error);
  },
);

/**
 * API Error Response interfaces for type safety
 */
interface ApiErrorDetail {
  message?: string;
  errors?: string[];
}

interface ApiErrorResponse {
  status: number;
  data?:
    | string
    | {
        message?: string;
        detail?: string | ApiErrorDetail;
      };
}

interface ApiError {
  message?: string;
  response?: ApiErrorResponse;
}

/**
 * Normalize API errors to a predictable message
 * @param error - Error object from API call
 * @returns User-friendly error message
 */
export const normalizeApiError = (error: unknown): string => {
  if (!error) return "Unknown error";

  const apiError = error as ApiError;
  const response = apiError.response;

  if (!response) return apiError.message || "Network error";

  const data = response.data;
  if (!data) return `HTTP ${response.status}`;

  // Handle 422 validation errors with array-shaped Pydantic errors
  if (response.status === 422) {
    if (Array.isArray(data)) {
      // Direct array of Pydantic validation errors
      return "Validation failed. Please fix the highlighted fields.";
    }
    if (typeof data === "object" && Array.isArray(data.detail)) {
      // FastAPI format: { detail: [...] }
      return "Validation failed. Please fix the highlighted fields.";
    }
  }

  if (typeof data === "string") return data;
  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (typeof data.detail === "object" && data.detail.message) {
        // Handle validation errors with detailed field information
        if (data.detail.errors && Array.isArray(data.detail.errors)) {
          const errorList = data.detail.errors.join("\n• ");
          return `${data.detail.message}:\n• ${errorList}`;
        }
        return data.detail.message;
      }
      try {
        return JSON.stringify(data.detail);
      } catch {
        return "Request failed";
      }
    }
  }
  return "Request failed";
};

// CV API functions
export const cvApi = {
  // Get all CVs for the current user with pagination support
  getCVs: async (page: number = 1, limit: number = 100) => {
    const response = await api.get("/api/cvs/", {
      params: { page, limit },
    });
    return response.data;
  },

  // Get a specific CV by ID
  getCV: async (cvId: string) => {
    const response = await api.get(`/api/cvs/${cvId}`);
    return response.data;
  },

  // Delete a CV
  deleteCV: async (cvId: string) => {
    const response = await api.delete(`/api/cvs/${cvId}`);
    return response.data;
  },

  // Update CV data
  updateCV: async (
    cvId: string,
    data: { parsed_data: Record<string, unknown> },
  ) => {
    // Do not send top-level why_good_fit; content lives in custom_sections
    if (data.parsed_data && "why_good_fit" in data.parsed_data) {
      const { why_good_fit: _dropped, ...rest } =
        data.parsed_data as Record<string, unknown> & { why_good_fit?: unknown };
      data.parsed_data = rest;
    }

    const response = await api.put(`/api/cvs/${cvId}`, data);
    return response.data;
  },

  // Upload CV file
  uploadCV: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/api/cvs/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Create blank CV from scratch
  createBlankCV: async () => {
    const response = await api.post("/api/cvs/create-blank");
    return response.data;
  },

  // Update CV title
  updateCVTitle: async (cvId: string, title: string) => {
    const response = await api.put(`/api/cvs/${cvId}/title`, { title });
    return response.data;
  },

  // Download CV file
  downloadCV: async (cvId: string, filename: string) => {
    const response = await api.get(`/api/cvs/${cvId}/download`, {
      responseType: "blob",
    });

    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Duplicate CV
  duplicateCV: async (cvId: string) => {
    const response = await api.post(`/api/cvs/${cvId}/duplicate`);
    return response.data;
  },

  // Export CV as PDF (LaTeX compiled) in a new tab using server filename
  exportCVAsPDF: async (cvId: string, template?: string) => {
    // Get Clerk token to authorize the public export endpoint
    if (typeof window === "undefined" || !isClerkAvailable(window)) {
      throw new Error("Authentication service not available");
    }
    const clerk = (window as ClerkWindow).Clerk;
    const token = await clerk.session?.getToken();
    if (!token) throw new Error("No authentication token available");

    // If template is specified, use template-based export endpoint
    if (template) {
      const path = `/api/cvs/${cvId}/export/pdf?template=${encodeURIComponent(template)}`;
      // For template-based export, we need to get the PDF via blob download
      try {
        const response = await api.get(path, {
          responseType: "blob",
          headers: {
            'Accept': 'application/pdf',
          }
        });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Extract filename from response headers - use same logic as backend generates
        const contentDisposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
        let filename = `CV_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`; // fallback

        if (contentDisposition) {
          // Try multiple regex patterns to match different header formats
          let filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (!filenameMatch) {
            filenameMatch = contentDisposition.match(/filename=([^;]+)/);
          }
          if (!filenameMatch) {
            filenameMatch = contentDisposition.match(/filename[^=]*=\s*"?([^";\s]+)"?/);
          }

          if (filenameMatch) {
            filename = filenameMatch[1].trim();
          }
        }

        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to export CV with template:", error);
        throw error;
      }
    } else {
      // Use public endpoint for default (quick) export
    const path = `/api/cvs/${cvId}/export/pdf/public`;
    const base = api.getUri({ url: path });
    const url = `${base}?token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
    }
  },

  // Get available templates
  getAvailableTemplates: async () => {
    const response = await api.get("/api/cvs/templates");
    return response.data.templates;
  },

  // Start preview generation
  startPreviewGeneration: async (cvId: string, templateName: string) => {
    const response = await api.post(`/api/cvs/${cvId}/export/preview/start?template=${encodeURIComponent(templateName)}`);
    return response.data;
  },

  // Check preview status
  checkPreviewStatus: async (cvId: string, jobId: string) => {
    const response = await api.get(`/api/cvs/${cvId}/export/preview/status?job_id=${encodeURIComponent(jobId)}`);
    return response.data;
  },

    // Fetch preview image (specific page)
    fetchPreviewImage: async (cvId: string, jobId: string, page: number = 1) => {
      const response = await api.get(`/api/cvs/${cvId}/export/preview/image?job_id=${encodeURIComponent(jobId)}&page=${page}`, {
        responseType: "blob",
      });
      return window.URL.createObjectURL(new Blob([response.data]));
    },

    // Fetch all preview images (all pages)
    fetchAllPreviewImages: async (cvId: string, jobId: string, pageCount: number) => {
      const urls: string[] = [];
      for (let page = 1; page <= pageCount; page++) {
        const url = await cvApi.fetchPreviewImage(cvId, jobId, page);
        urls.push(url);
      }
      return urls;
    },

    // Fetch LaTeX source for CV (as plain text)
    getLatexSource: async (cvId: string, template?: string): Promise<string> => {
      const path = `/api/cvs/${cvId}/export/latex${template ? `?template=${encodeURIComponent(template)}` : ''}`;
      try {
        const response = await api.get(path, {
          responseType: "text",
          headers: { Accept: "text/plain" },
        });
        // Axios may still return data as a Blob/string depending on adapter; normalize to string
        const data = response.data as unknown;
        if (typeof data === "string") return data;
        if (data instanceof Blob) return await data.text();
        return String(data ?? "");
      } catch (error) {
        console.error("Failed to fetch LaTeX source:", error);
        throw error;
      }
    },
  };

// Auth API functions
export const authApi = {
  // Delete user account
  deleteAccount: async () => {
    const response = await api.delete("/auth/account");
    return response.data;
  },
};

// Admin API functions
export const adminApi = {
  // Delete user account (admin only)
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
};

// Export the API client for direct use
export const apiClient = api;

export default api;
