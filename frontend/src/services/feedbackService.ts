/**
 * Feedback API service for submitting and managing feedback.
 * Uses the shared axios instance; admin list/update/stats require admin role.
 */
import api from "./api";
import type {
  FeedbackCreate,
  Feedback,
  FeedbackListResponse,
  FeedbackStats,
} from "../types/feedback";

export const feedbackService = {
  async submitFeedback(data: FeedbackCreate): Promise<Feedback> {
    const response = await api.post<Feedback>("/feedback", data);
    return response.data;
  },

  async listFeedback(
    page = 1,
    pageSize = 50,
    status?: string,
    type?: string,
  ): Promise<FeedbackListResponse> {
    const response = await api.get<FeedbackListResponse>("/feedback", {
      params: { page, page_size: pageSize, status, type },
    });
    return response.data;
  },

  async updateFeedback(
    feedbackId: string,
    data: { status?: string; admin_notes?: string },
  ): Promise<Feedback> {
    const response = await api.patch<Feedback>(`/feedback/${feedbackId}`, data);
    return response.data;
  },

  async getStats(): Promise<FeedbackStats> {
    const response = await api.get<FeedbackStats>("/feedback/stats");
    return response.data;
  },
};
