/**
 * OverviewTab - Admin dashboard overview tab component
 *
 * This component displays system statistics and user overview data.
 * Shows key metrics, user distribution, and recent activity.
 *
 * Key responsibilities:
 * - Display system statistics cards
 * - Show user distribution information
 * - Display recent activity metrics
 * - Handle loading and error states
 *
 * Usage context:
 * - Used in admin dashboard as the first tab
 * - Integrates with useAdminStats hook
 * - Uses StatCard components for consistent display
 */

import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  People,
  Description,
  SmartToy,
  CheckCircle,
} from "@mui/icons-material";
import { SystemStats } from "../../../types/admin";
import StatCard from "../StatCard";

interface OverviewTabProps {
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats, loading, error }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No statistics available
      </Alert>
    );
  }

  return (
    <Box>
      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.total_users ?? 0}
            icon={<People />}
            trend={{
              value: Math.round(
                ((stats.users_last_7_days ?? 0) / (stats.total_users || 1)) * 100,
              ),
              label: "new this week",
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={stats.active_users ?? 0}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total CVs"
            value={stats.total_cvs ?? 0}
            icon={<Description />}
            trend={{
              value: Math.round(
                ((stats.cvs_last_7_days ?? 0) / (stats.total_cvs || 1)) * 100,
              ),
              label: "new this week",
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="AI Sections"
            value={stats.total_ai_sections ?? 0}
            icon={<SmartToy />}
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* Additional Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Distribution
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Clerk Users</Typography>
                <Typography variant="h6">{stats.clerk_users}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Legacy Users</Typography>
                <Typography variant="h6">{stats.legacy_users}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography>Job Descriptions</Typography>
                <Typography variant="h6">
                  {stats.total_job_descriptions}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Users (7 days)</Typography>
                <Typography variant="h6">{stats.users_last_7_days}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Users (30 days)</Typography>
                <Typography variant="h6">{stats.users_last_30_days}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography>CVs (7 days)</Typography>
                <Typography variant="h6">{stats.cvs_last_7_days}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewTab;
