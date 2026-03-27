import axios from "axios";

import { apiClient } from "./api";
import type {
  CVShareViewMode,
  PublicCVData,
  PublicJobDescriptionData,
  ShareAnalytics,
  ShareInfo,
} from "../types/share";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

class ShareService {
  async enableCVSharing(cvId: string): Promise<ShareInfo> {
    const response = await apiClient.post<ShareInfo>(`/cvs/${cvId}/share`, {
      view_mode: "shell" as CVShareViewMode,
    });
    return response.data;
  }

  async getCVShareInfo(cvId: string): Promise<ShareInfo> {
    const response = await apiClient.get<ShareInfo>(`/cvs/${cvId}/share`);
    return response.data;
  }

  async disableCVSharing(cvId: string): Promise<ShareInfo> {
    const response = await apiClient.delete<ShareInfo>(`/cvs/${cvId}/share`);
    return response.data;
  }

  async regenerateCVShareToken(cvId: string): Promise<ShareInfo> {
    const response = await apiClient.put<ShareInfo>(`/cvs/${cvId}/share/regenerate`);
    return response.data;
  }

  async getCVShareAnalytics(cvId: string): Promise<ShareAnalytics> {
    const response = await apiClient.get<ShareAnalytics>(`/cvs/${cvId}/share/analytics`);
    return response.data;
  }

  async enableJobDescriptionSharing(jobDescriptionId: string): Promise<ShareInfo> {
    const response = await apiClient.post<ShareInfo>(
      `/job-descriptions/${jobDescriptionId}/share`,
    );
    return response.data;
  }

  async getJobDescriptionShareInfo(jobDescriptionId: string): Promise<ShareInfo> {
    const response = await apiClient.get<ShareInfo>(
      `/job-descriptions/${jobDescriptionId}/share`,
    );
    return response.data;
  }

  async disableJobDescriptionSharing(jobDescriptionId: string): Promise<ShareInfo> {
    const response = await apiClient.delete<ShareInfo>(
      `/job-descriptions/${jobDescriptionId}/share`,
    );
    return response.data;
  }

  async regenerateJobDescriptionShareToken(
    jobDescriptionId: string,
  ): Promise<ShareInfo> {
    const response = await apiClient.put<ShareInfo>(
      `/job-descriptions/${jobDescriptionId}/share/regenerate`,
    );
    return response.data;
  }

  async getJobDescriptionShareAnalytics(
    jobDescriptionId: string,
  ): Promise<ShareAnalytics> {
    const response = await apiClient.get<ShareAnalytics>(
      `/job-descriptions/${jobDescriptionId}/share/analytics`,
    );
    return response.data;
  }

  async getPublicCV(token: string): Promise<PublicCVData> {
    const response = await publicApi.get<PublicCVData>(`/public/cv/${token}`);
    return response.data;
  }

  /**
   * Fetch profile image for a publicly shared CV. Caller must revoke the URL with
   * URL.revokeObjectURL when done.
   */
  async getPublicCVProfilePictureObjectUrl(token: string): Promise<string | null> {
    try {
      const response = await publicApi.get(`/public/cv/${token}/profile-picture`, {
        responseType: "blob",
      });
      const blob = response.data as Blob;
      return window.URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  async getPublicJobDescription(token: string): Promise<PublicJobDescriptionData> {
    const response = await publicApi.get<PublicJobDescriptionData>(
      `/public/job-description/${token}`,
    );
    return response.data;
  }

  async downloadPublicCVPDF(token: string): Promise<void> {
    const response = await publicApi.get(`/public/cv/${token}/pdf`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    const contentDisposition =
      response.headers["content-disposition"] ||
      response.headers["Content-Disposition"];
    let filename = "CV.pdf";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1];
      }
    }
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

export const shareService = new ShareService();
