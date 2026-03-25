/**
 * ProfileUsageCard - Displays current user's AI usage and quota on the Profile page.
 *
 * Shows tokens used/limit, cost used/limit, rolling period, and at-limit state.
 */
import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import MonetizationOn from "@mui/icons-material/MonetizationOn";
import { useUsage } from "../../hooks/useUsage";
import {
  formatTokens,
  formatCost,
  getUsagePercent,
} from "../../utils/usageFormatters";

const cardSx = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: 2,
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: 6,
    borderColor: "primary.light",
  },
};

export const ProfileUsageCard: React.FC = () => {
  const { usage, loading, error, refetch } = useUsage();

  if (loading) {
    return (
      <Card sx={cardSx}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <MonetizationOn sx={{ mr: 2, color: "primary.main", fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AI usage
            </Typography>
          </Box>
          <Skeleton variant="text" width="60%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1, mb: 2 }} />
          <Skeleton variant="text" width="40%" height={24} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={cardSx}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <MonetizationOn sx={{ mr: 2, color: "primary.main", fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AI usage
            </Typography>
          </Box>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="outlined" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  const tokenProgress = getUsagePercent(usage.used_tokens, usage.limit_tokens);

  return (
    <Card sx={cardSx}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <MonetizationOn sx={{ mr: 2, color: "primary.main", fontSize: 32 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "-0.025em",
            }}
          >
            AI usage
          </Typography>
        </Box>

        {!usage.allowed && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You&apos;ve reached your free tier limit. AI features will be available again when your rolling period resets.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Tokens
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          {formatTokens(usage.used_tokens)} / {formatTokens(usage.limit_tokens)} tokens
        </Typography>
        <LinearProgress
          variant="determinate"
          value={tokenProgress}
          sx={{ mb: 3, borderRadius: 1, height: 8 }}
          color={usage.allowed ? "primary" : "error"}
        />

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Cost (rolling period)
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          ${formatCost(usage.used_cost)} / ${formatCost(usage.limit_cost)}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Rolling {usage.period_days} days
        </Typography>
      </CardContent>
    </Card>
  );
};
