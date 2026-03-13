/**
 * Shared formatters for AI usage display (chip, profile card, tooltips).
 */
import type { Usage } from "../types/usage";

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function formatCost(c: number): string {
  return c.toFixed(2);
}

export function getUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function getUsageColor(
  percent: number,
): "success" | "warning" | "error" {
  if (percent <= 50) return "success";
  if (percent <= 80) return "warning";
  return "error";
}

export function getUsageTooltipContent(usage: Usage): string {
  const percent = getUsagePercent(usage.used_tokens, usage.limit_tokens);
  const tokenLine = `Tokens: ${formatTokens(usage.used_tokens)} / ${formatTokens(usage.limit_tokens)} (${percent}%)`;
  const costLine = `Cost: $${formatCost(usage.used_cost)} / $${formatCost(usage.limit_cost)}`;
  const periodLine = `Rolling ${usage.period_days} days`;
  return `${tokenLine}\n${costLine}\n${periodLine}\nClick to view details`;
}
