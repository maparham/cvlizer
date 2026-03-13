/**
 * User AI usage and quota types.
 *
 * Matches backend GET /api/usage response (UsageResponse).
 */

export interface Usage {
  used_tokens: number;
  limit_tokens: number;
  used_cost: number;
  limit_cost: number;
  remaining_cost: number;
  period_days: number;
  allowed: boolean;
}
