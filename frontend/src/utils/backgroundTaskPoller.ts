/**
 * Background Task Polling Utility
 *
 * This module provides utilities for polling background task status endpoints
 * to check when long-running operations complete.
 *
 * Key responsibilities:
 * - Poll job description parsing status
 * - Poll content enhancement status
 * - Poll draft generation status
 * - Handle polling intervals and timeouts
 * - Provide callbacks for completion and errors
 */

import { aiService } from "../services/ai";
import {
  JobDescription,
  ContentEnhancementResponse,
  DraftResponse,
} from "../types/ai";
import { POLLING_CONFIG } from "../config/constants";

export interface PollingOptions {
  interval?: number; // Polling interval in milliseconds
  timeout?: number; // Maximum time to poll in milliseconds
  onProgress?: (data: any) => void; // Called on each poll with current data
  onComplete?: (data: any) => void; // Called when task completes successfully
  onError?: (error: any) => void; // Called when task fails or times out
}

const DEFAULT_OPTIONS: Required<PollingOptions> = {
  interval: POLLING_CONFIG.DEFAULT_INTERVAL,
  timeout: POLLING_CONFIG.LONG_OPERATION_TIMEOUT,
  onProgress: () => {},
  onComplete: () => {},
  onError: () => {},
};

/**
 * Poll job description parsing status
 */
export async function pollJobDescriptionStatus(
  jobDescriptionId: string,
  options: PollingOptions = {},
): Promise<JobDescription> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > opts.timeout) {
          const error = new Error("Job description parsing timed out");
          opts.onError(error);
          reject(error);
          return;
        }

        // Get current status
        const status =
          await aiService.getJobDescriptionStatus(jobDescriptionId);

        // Call progress callback
        opts.onProgress(status);

        // Check if parsing is complete
        if (!status.is_parsing) {
          if (status.parse_error) {
            const error = new Error(status.parse_error);
            opts.onError(error);
            reject(error);
          } else {
            opts.onComplete(status);
            resolve(status);
          }
          return;
        }

        // Continue polling
        setTimeout(poll, opts.interval);
      } catch (error) {
        opts.onError(error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Poll content enhancement status
 */
export async function pollContentEnhancementStatus(
  enhancementId: string,
  options: PollingOptions = {},
): Promise<ContentEnhancementResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > opts.timeout) {
          const error = new Error("Content enhancement timed out");
          opts.onError(error);
          reject(error);
          return;
        }

        // Get current status
        const status =
          await aiService.getContentEnhancementStatus(enhancementId);

        // Call progress callback
        opts.onProgress(status);

        // Check if generation is complete
        if (!status.is_generating) {
          if (status.generation_error) {
            const error = new Error(status.generation_error);
            opts.onError(error);
            reject(error);
          } else {
            opts.onComplete(status);
            resolve(status);
          }
          return;
        }

        // Continue polling
        setTimeout(poll, opts.interval);
      } catch (error) {
        opts.onError(error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Poll draft generation status
 */
export async function pollDraftStatus(
  draftId: string,
  options: PollingOptions = {},
): Promise<DraftResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > opts.timeout) {
          const error = new Error("Draft generation timed out");
          opts.onError(error);
          reject(error);
          return;
        }

        // Get current status
        const status = await aiService.getDraftStatus(draftId);

        // Call progress callback
        opts.onProgress(status);

        // Check if generation is complete
        if (!status.is_generating) {
          if (status.generation_error) {
            const error = new Error(status.generation_error);
            opts.onError(error);
            reject(error);
          } else {
            opts.onComplete(status);
            resolve(status);
          }
          return;
        }

        // Continue polling
        setTimeout(poll, opts.interval);
      } catch (error) {
        opts.onError(error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Generic polling function for any background task
 */
export async function pollBackgroundTask<T>(
  pollFunction: () => Promise<T>,
  isComplete: (data: T) => boolean,
  options: PollingOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > opts.timeout) {
          const error = new Error("Background task timed out");
          opts.onError(error);
          reject(error);
          return;
        }

        // Get current status
        const data = await pollFunction();

        // Call progress callback
        opts.onProgress(data);

        // Check if task is complete
        if (isComplete(data)) {
          opts.onComplete(data);
          resolve(data);
          return;
        }

        // Continue polling
        setTimeout(poll, opts.interval);
      } catch (error) {
        opts.onError(error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}
