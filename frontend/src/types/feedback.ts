/**
 * Types for the feedback feature: submission, list response, and admin stats.
 */

export type FeedbackType = "bug" | "suggestion" | "general";
export type FeedbackStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export interface FeedbackCreate {
  type: FeedbackType;
  title: string;
  body: string;
  page_url?: string;
  context?: Record<string, unknown>;
}

export interface Feedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  body: string;
  page_url?: string;
  context?: Record<string, unknown>;
  status: FeedbackStatus;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  submitter_email?: string;
}

export interface FeedbackListResponse {
  feedbacks: Feedback[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeedbackStats {
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  total: number;
}
