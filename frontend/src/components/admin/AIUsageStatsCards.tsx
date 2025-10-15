/**
 * AI Usage Statistics Cards Component.
 *
 * This component displays key AI usage statistics in a card format,
 * including total tokens, costs, success rates, and operation counts.
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Grid,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Speed,
  CheckCircle,
  Error,
  Cached,
  Savings,
} from "@mui/icons-material";
import { SystemAIStats } from "../../types/admin";
import {
  formatCost,
  formatNumber,
  formatTokens,
  formatPercentage,
} from "../../utils/formatters";

interface AIUsageStatsCardsProps {
  stats: SystemAIStats | null;
  loading: boolean;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "secondary" | "success" | "error" | "warning";
}> = ({ title, value, subtitle, icon, trend, color = "primary" }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp color="success" fontSize="small" />;
      case "down":
        return <TrendingDown color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (color) {
      case "success":
        return "success.main";
      case "error":
        return "error.main";
      case "warning":
        return "warning.main";
      case "secondary":
        return "secondary.main";
      default:
        return "primary.main";
    }
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6" component="div" color="text.secondary">
            {title}
          </Typography>
          <Box color={getColor()}>{icon}</Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="h4" component="div" color={getColor()}>
            {value}
          </Typography>
          {getTrendIcon()}
        </Box>

        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const AIUsageStatsCards: React.FC<AIUsageStatsCardsProps> = ({
  stats,
  loading,
}) => {
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const successRate =
    stats.total_operations > 0
      ? (stats.successful_operations / stats.total_operations) * 100
      : 0;

  const failureRate =
    stats.total_operations > 0
      ? (stats.failed_operations / stats.total_operations) * 100
      : 0;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Total Tokens"
          value={formatTokens(stats.total_tokens)}
          subtitle={`${formatNumber(stats.total_tokens)} tokens consumed`}
          icon={<Speed />}
          color="primary"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Input Tokens"
          value={formatTokens(stats.total_prompt_tokens)}
          subtitle={`${formatNumber(stats.total_prompt_tokens)} prompt tokens`}
          icon={<Speed />}
          color="primary"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Cached Tokens"
          value={formatTokens(stats.total_cached_tokens)}
          subtitle={`${formatPercentage(stats.cache_hit_rate)} cache hit rate`}
          icon={<Cached />}
          color="success"
          trend={stats.cache_hit_rate > 0 ? "up" : "neutral"}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Total Cost"
          value={formatCost(stats.total_cost)}
          subtitle={`Saved ${formatCost(stats.estimated_cache_savings)} from caching`}
          icon={<AttachMoney />}
          color="success"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Operations"
          value={formatNumber(stats.total_operations)}
          subtitle={`${formatNumber(stats.successful_operations)} successful, ${formatNumber(stats.failed_operations)} failed`}
          icon={<CheckCircle />}
          color="secondary"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Success Rate"
          value={formatPercentage(successRate)}
          subtitle={`${formatPercentage(failureRate)} failure rate`}
          icon={successRate >= 90 ? <CheckCircle /> : <Error />}
          color={successRate >= 90 ? "success" : "warning"}
          trend={successRate >= 90 ? "up" : "down"}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Cache Savings"
          value={formatCost(stats.estimated_cache_savings)}
          subtitle={`${formatPercentage(stats.cache_hit_rate)} avg cache rate`}
          icon={<Savings />}
          color="success"
          trend={stats.estimated_cache_savings > 0 ? "up" : "neutral"}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Most Expensive"
          value={stats.most_expensive_operation_type || "N/A"}
          subtitle={`${formatTokens(stats.average_tokens_per_operation)} avg tokens/op`}
          icon={<TrendingUp />}
          color="warning"
        />
      </Grid>
    </Grid>
  );
};

export default AIUsageStatsCards;
