/**
 * UsageChip - Compact AI usage indicator for headers.
 *
 * Shows token percentage badge, color-coded by usage. Tooltip on hover
 * with full details; click navigates to Profile.
 */
import React from "react";
import { Chip, Tooltip, Typography, Box, Skeleton } from "@mui/material";
import { MonetizationOn, Error as ErrorIcon } from "@mui/icons-material";
import { useUsage } from "../../hooks/useUsage";
import {
  getUsagePercent,
  getUsageColor,
  getUsageTooltipContent,
  formatTokens,
  formatCost,
} from "../../utils/usageFormatters";

interface UsageChipProps {
  size?: "small" | "medium";
  showLabel?: boolean;
  onClick?: () => void;
  sx?: object;
}

function TooltipContent({ usage }: { usage: { used_tokens: number; limit_tokens: number; used_cost: number; limit_cost: number; period_days: number } }) {
  const percent = getUsagePercent(usage.used_tokens, usage.limit_tokens);
  return (
    <Box component="span" sx={{ display: "block" }}>
      <Typography variant="caption" component="span" display="block">
        Tokens: {formatTokens(usage.used_tokens)} / {formatTokens(usage.limit_tokens)} ({percent}%)
      </Typography>
      <Typography variant="caption" component="span" display="block">
        Cost: ${formatCost(usage.used_cost)} / ${formatCost(usage.limit_cost)}
      </Typography>
      <Typography variant="caption" component="span" display="block">
        Rolling {usage.period_days} days
      </Typography>
      <Typography variant="caption" component="span" display="block" sx={{ mt: 0.5 }}>
        Click to view details
      </Typography>
    </Box>
  );
}

export const UsageChip: React.FC<UsageChipProps> = ({
  size = "small",
  showLabel = false,
  onClick,
  sx = {},
}) => {
  const { usage, loading, error } = useUsage();

  if (loading) {
    return (
      <Skeleton
        variant="rounded"
        width={64}
        height={28}
        sx={{ borderRadius: 2, ...sx }}
      />
    );
  }

  if (error) {
    return (
      <Tooltip title={error}>
        <Chip
          icon={<ErrorIcon sx={{ fontSize: 18 }} />}
          label="Usage"
          size={size}
          variant="outlined"
          sx={{
            borderColor: "divider",
            color: "text.secondary",
            cursor: onClick ? "pointer" : "default",
            ...sx,
          }}
          onClick={onClick}
        />
      </Tooltip>
    );
  }

  if (!usage) {
    return null;
  }

  const percent = getUsagePercent(usage.used_tokens, usage.limit_tokens);
  const color = getUsageColor(percent);
  const label = showLabel ? `Usage ${percent}%` : `${percent}%`;

  return (
    <Tooltip title={<TooltipContent usage={usage} />}>
      <Chip
        icon={<MonetizationOn sx={{ fontSize: 18 }} />}
        label={label}
        size={size}
        color={color}
        variant="outlined"
        onClick={onClick}
        sx={{
          cursor: onClick ? "pointer" : "default",
          fontWeight: 600,
          ...sx,
        }}
      />
    </Tooltip>
  );
};
