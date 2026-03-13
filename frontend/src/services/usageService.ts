/**
 * User AI usage API service.
 *
 * Fetches current user's usage and quota from GET /usage (baseURL includes /api).
 */
import api from "./api";
import type { Usage } from "../types/usage";

/**
 * Get current user's AI usage and quota for the rolling period.
 */
export const getUsage = async (): Promise<Usage> => {
  const response = await api.get<Usage>("/usage");
  return response.data;
};
