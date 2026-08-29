/**
 * Common utilities for Zustand stores to reduce duplication and improve maintainability.
 */
import { normalizeApiError } from "../services/api";

/**
 * Common store state interface for loading/error states
 */
export interface BaseStoreState {
  loading: boolean;
  error: string | null;
}

/**
 * Common store actions interface for loading/error management
 */
export interface BaseStoreActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Common async action wrapper with error handling
 */
export function withAsyncErrorHandling<T extends any[], R>(
  actionName: string,
  asyncFn: (...args: T) => Promise<R>,
) {
  return async (set: any, _get: any, ...args: T): Promise<R | null> => {
    set({ loading: true, error: null });

    try {
      const result = await asyncFn(...args);
      set({ loading: false, error: null });
      return result;
    } catch (error: any) {
      const errorMessage = normalizeApiError(error) || `${actionName} failed`;
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  };
}

/**
 * Base store slice with common functionality
 */
export function createBaseStoreSlice() {
  return {
    loading: false as boolean,
    error: null as string | null,

    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    clearError: () => ({ error: null }),
  };
}

/**
 * Polling utilities for stores that need periodic updates
 */
export class PollingManager {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private pollingFn: () => Promise<void>,
    private intervalMs: number = 2000,
  ) {}

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(async () => {
      try {
        await this.pollingFn();
      } catch (error) {
        // Polling error occurred
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  isActive(): boolean {
    return this.interval !== null;
  }
}
