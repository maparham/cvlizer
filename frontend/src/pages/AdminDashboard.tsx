/**
 * Admin Dashboard - Administrative Interface and User Management
 *
 * This module provides a comprehensive administrative interface for managing users,
 * monitoring system statistics, and performing administrative actions such as
 * activity tracking.
 *
 * Key responsibilities:
 * - Tab management and routing
 * - Error boundary and authentication checks
 * - Layout wrapper with header and navigation
 * - Orchestrates child components
 *
 * Usage context:
 * - Accessible only to authenticated admin users
 * - Provides comprehensive user management functionality
 * - Integrates with backend admin API endpoints
 *
 * Dependencies:
 * - Custom hooks for data management
 * - Tab components for different views
 * - Authentication utilities for admin verification
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Dashboard,
  People,
  ArrowBack,
  Refresh,
  Analytics,
  BugReport,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useImpersonation } from "../hooks/useImpersonation";
import { useAdminStats } from "../hooks/useAdminStats";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { useAIUsageData } from "../hooks/useAIUsageData";
import { useUserActions } from "../hooks/useUserActions";
import OverviewTab from "../components/admin/tabs/OverviewTab";
import UsersTab from "../components/admin/tabs/UsersTab";
import AIUsageTab from "../components/admin/tabs/AIUsageTab";
import DiagnosticChatTab from "../components/admin/tabs/DiagnosticChatTab";

const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentTab, setCurrentTab] = useState(0);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isAuthenticated } = useAuth();
  const { isImpersonating } = useImpersonation();
  const navigate = useNavigate();

  // Custom hooks for data management
  const adminStats = useAdminStats();
  const adminUsers = useAdminUsers();
  const aiUsageData = useAIUsageData();
  const userActions = useUserActions();

  // Initialize tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "users") {
      setCurrentTab(1);
    } else if (tabParam === "ai-usage") {
      setCurrentTab(2);
    } else if (tabParam === "diagnostic") {
      setCurrentTab(3);
    } else if (tabParam === "overview") {
      setCurrentTab(0);
    }
  }, [searchParams]);

  // Handle tab changes and data loading
  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);
    // Update URL parameter
    const newSearchParams = new URLSearchParams(searchParams);
    if (newValue === 1) {
      newSearchParams.set("tab", "users");
    } else if (newValue === 2) {
      newSearchParams.set("tab", "ai-usage");
    } else if (newValue === 3) {
      newSearchParams.set("tab", "diagnostic");
    } else {
      newSearchParams.set("tab", "overview");
    }
    setSearchParams(newSearchParams);
  };

  const handleRefresh = () => {
    if (currentTab === 0) {
      adminStats.loadStats();
    } else if (currentTab === 1) {
      adminUsers.loadUsers();
    } else if (currentTab === 2) {
      aiUsageData.loadAIUsageData();
    }
  };

  const handleDeleteAllAILogs = async () => {
    try {
      setIsDeleting(true);
      await aiUsageData.handleDeleteAllLogs();
      setDeleteAllDialogOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  // Handle admin access errors from backend
  if (adminStats.error && adminStats.error.includes("Admin access required")) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Admin access required. You don't have permission to view this page.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  // Prevent access to admin dashboard during impersonation
  if (isImpersonating) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Admin dashboard is not available during impersonation. Please end the
          impersonation session to access admin features.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/dashboard")}
            sx={{ mr: 2 }}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {(adminStats.error || adminUsers.error || aiUsageData.error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {adminStats.error || adminUsers.error || aiUsageData.error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => handleTabChange(newValue)}
        >
          <Tab icon={<Dashboard />} label="Overview" />
          <Tab icon={<People />} label="Users" />
          <Tab icon={<Analytics />} label="AI Usage" />
          <Tab icon={<BugReport />} label="OpenAI Diagnostic" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && (
        <OverviewTab
          stats={adminStats.stats}
          loading={adminStats.loading}
          error={adminStats.error}
        />
      )}

      {currentTab === 1 && (
        <UsersTab
          users={adminUsers.users}
          loading={adminUsers.loading}
          error={adminUsers.error}
          filters={adminUsers.filters}
          onFiltersChange={adminUsers.setFilters}
          onRefresh={adminUsers.loadUsers}
          onToggleUserActive={adminUsers.toggleUserActive}
          onLoadUserDetail={userActions.loadUserDetail}
          onLoadUserCVs={userActions.loadUserCVs}
          onLoadUserActivities={userActions.loadUserActivities}
          onLoadUserErrors={userActions.loadUserErrors}
          onStartImpersonation={userActions.startImpersonation}
          onContactUser={(email) => window.open(`mailto:${email}`, "_blank")}
          actionLoading={userActions.actionLoading}
          selectedUser={userActions.selectedUser}
          userDetailOpen={userActions.userDetailOpen}
          onUserDetailClose={() => userActions.setUserDetailOpen(false)}
          userCVs={userActions.userCVs}
          userCVsOpen={userActions.userCVsOpen}
          onUserCVsClose={() => userActions.setUserCVsOpen(false)}
          userActivities={userActions.userActivities}
          activitiesOpen={userActions.activitiesOpen}
          onActivitiesClose={() => userActions.setActivitiesOpen(false)}
          activitiesTotal={userActions.activitiesTotal}
          activitiesPage={userActions.activitiesPage}
          activitiesLimit={userActions.activitiesLimit}
          activityTypeFilter={userActions.activityTypeFilter}
          activitiesLoading={userActions.activitiesLoading}
          selectedUserId={userActions.selectedUserId}
          onActivitiesPageChange={(page) => {
            userActions.setActivityTypeFilter(userActions.activityTypeFilter);
            if (userActions.selectedUserId) {
              userActions.loadUserActivities(
                userActions.selectedUserId,
                page,
                userActions.activitiesLimit,
                userActions.activityTypeFilter,
              );
            }
          }}
          onActivitiesLimitChange={(limit) => {
            userActions.setActivityTypeFilter(userActions.activityTypeFilter);
            if (userActions.selectedUserId) {
              userActions.loadUserActivities(
                userActions.selectedUserId,
                0,
                limit,
                userActions.activityTypeFilter,
              );
            }
          }}
          onActivityTypeFilterChange={(filter) => {
            userActions.setActivityTypeFilter(filter);
            if (userActions.selectedUserId) {
              userActions.loadUserActivities(
                userActions.selectedUserId,
                0,
                userActions.activitiesLimit,
                filter,
              );
            }
          }}
          onClearUserActivities={userActions.clearUserActivities}
          userErrors={userActions.userErrors}
          errorsOpen={userActions.errorsOpen}
          onErrorsClose={() => userActions.setErrorsOpen(false)}
          impersonationDialogOpen={userActions.impersonationDialogOpen}
          onImpersonationDialogClose={() =>
            userActions.setImpersonationDialogOpen(false)
          }
          impersonationTarget={userActions.impersonationTarget}
          impersonationJustification={userActions.impersonationJustification}
          onImpersonationJustificationChange={
            userActions.setImpersonationJustification
          }
          onConfirmImpersonation={userActions.confirmImpersonation}
        />
      )}

      {currentTab === 2 && (
        <AIUsageTab
          aiStats={aiUsageData.aiStats}
          aiUserUsage={aiUsageData.aiUserUsage}
          aiOperationUsage={aiUsageData.aiOperationUsage}
          aiTimeline={aiUsageData.aiTimeline}
          aiLogs={aiUsageData.aiLogs}
          loading={aiUsageData.loading}
          error={aiUsageData.error}
          dateRange={aiUsageData.dateRange}
          granularity={aiUsageData.granularity}
          filters={aiUsageData.filters}
          logsPage={aiUsageData.logsPage}
          logsLimit={aiUsageData.logsLimit}
          onDateRangeChange={aiUsageData.setDateRange}
          onGranularityChange={aiUsageData.setGranularity}
          onFilterChange={aiUsageData.handleFilterChange}
          onClearAllFilters={aiUsageData.handleClearAllFilters}
          onRefresh={aiUsageData.loadAIUsageData}
          onUserClick={aiUsageData.handleUserClick}
          onPaginationChange={aiUsageData.handlePaginationChange}
          onExportLogs={aiUsageData.handleExportLogs}
          onExportAllLogs={aiUsageData.handleExportAllLogs}
          onDeleteAllLogs={handleDeleteAllAILogs}
          deleteAllDialogOpen={deleteAllDialogOpen}
          onDeleteAllDialogClose={() => setDeleteAllDialogOpen(false)}
          onDeleteAllDialogOpen={() => setDeleteAllDialogOpen(true)}
          isDeleting={isDeleting}
        />
      )}

      {currentTab === 3 && <DiagnosticChatTab />}
    </Container>
  );
};

export default AdminDashboard;
