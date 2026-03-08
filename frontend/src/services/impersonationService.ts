/**
 * Impersonation Service
 *
 * This module provides client-side functionality for admin impersonation features.
 * It handles API communication for starting, ending, and monitoring impersonation
 * sessions with proper error handling and type safety.
 *
 * Key responsibilities:
 * - Start and end impersonation sessions
 * - Monitor impersonation status with polling
 * - Handle impersonation-related API errors
 * - Provide type-safe interfaces for impersonation data
 * - Manage session state and expiration
 */
import { apiClient } from "./api";

export interface ImpersonationSession {
  id: string;
  target_user_id: string;
  target_user_email: string;
  started_at: string;
  expires_at: string;
  remaining_seconds: number;
  justification?: string;
}

export interface ImpersonationStatus {
  active: boolean;
  target_user?: {
    id: string;
    email: string;
  };
  expires_at?: string;
  remaining_seconds?: number;
  session_id?: string;
}

export interface StartImpersonationRequest {
  target_user_id: string;
  justification?: string;
}

export interface ActiveSession {
  id: string;
  admin_id: string;
  admin_email: string;
  target_user_id: string;
  target_user_email: string;
  started_at: string;
  expires_at: string;
  remaining_seconds: number;
  justification?: string;
}

export class ImpersonationError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ImpersonationError";
  }
}

class ImpersonationService {
  /**
   * Start a new impersonation session
   */
  async startImpersonation(
    request: StartImpersonationRequest,
  ): Promise<ImpersonationSession> {
    try {
      const response = await apiClient.post(
        "/admin/impersonations/start",
        request,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new ImpersonationError(
          "Admin privileges required",
          403,
          "ADMIN_REQUIRED",
        );
      } else if (error.response?.status === 429) {
        throw new ImpersonationError(
          "Rate limit exceeded",
          429,
          "RATE_LIMITED",
        );
      } else if (error.response?.data?.detail) {
        throw new ImpersonationError(
          error.response.data.detail,
          error.response.status,
        );
      }
      throw new ImpersonationError("Failed to start impersonation session");
    }
  }

  /**
   * End the current impersonation session
   */
  async endImpersonation(): Promise<void> {
    try {
      await apiClient.post("/admin/impersonations/end");
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Session not found - this is okay, might already be ended
        return;
      } else if (error.response?.data?.detail) {
        throw new ImpersonationError(
          error.response.data.detail,
          error.response.status,
        );
      }
      throw new ImpersonationError("Failed to end impersonation session");
    }
  }

  /**
   * Get current impersonation status
   */
  async getImpersonationStatus(): Promise<ImpersonationStatus> {
    try {
      const response = await apiClient.get("/auth/impersonation/status");
      return response.data;
    } catch (error: any) {
      // Return inactive status on error to avoid breaking the UI
      return { active: false };
    }
  }

  /**
   * Get active impersonation sessions for the current admin
   */
  async getActiveSessions(limit = 100, offset = 0): Promise<ActiveSession[]> {
    try {
      const response = await apiClient.get("/admin/impersonations/active", {
        params: { limit, offset },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new ImpersonationError(
          error.response.data.detail,
          error.response.status,
        );
      }
      throw new ImpersonationError("Failed to get active sessions");
    }
  }

  /**
   * Revoke a specific impersonation session
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await apiClient.post(`/admin/impersonations/revoke/${sessionId}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new ImpersonationError(
          "Session not found or already ended",
          404,
          "SESSION_NOT_FOUND",
        );
      } else if (error.response?.data?.detail) {
        throw new ImpersonationError(
          error.response.data.detail,
          error.response.status,
        );
      }
      throw new ImpersonationError("Failed to revoke session");
    }
  }

  /**
   * Format remaining time as a human-readable string
   */
  formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  /**
   * Check if a session is about to expire (less than 5 minutes remaining)
   */
  isSessionExpiringSoon(remainingSeconds: number): boolean {
    return remainingSeconds > 0 && remainingSeconds < 300; // 5 minutes
  }
}

export const impersonationService = new ImpersonationService();
