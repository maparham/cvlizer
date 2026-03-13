/**
 * useUsage - Fetches and exposes current user's AI usage and quota.
 *
 * Used on Profile page (and optionally header). Provides loading, error, and refetch.
 */
import { useState, useEffect, useCallback } from "react";
import { getUsage } from "../services/usageService";
import type { Usage } from "../types/usage";
import { normalizeApiError } from "../services/api";

interface UseUsageReturn {
  usage: Usage | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUsage = (enabled: boolean = true): UseUsageReturn => {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getUsage();
      setUsage(data);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    usage,
    loading,
    error,
    refetch,
  };
};
