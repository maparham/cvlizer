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
  Feedback as FeedbackIcon,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useImpersonation } from "../hooks/useImpersonation";
import { useAdminStats } from "../hooks/useAdminStats";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { useAIUsageData } from "../hooks/useAIUsageData";
import { useUserActions } from "../hooks/useUserActions";
import { adminApi, normalizeApiError } from "../services/api";
import { resetUserAIUsage } from "../services/adminAIUsageService";
import OverviewTab from "../components/admin/tabs/OverviewTab";
import UsersTab from "../components/admin/tabs/UsersTab";
import AIUsageTab from "../components/admin/tabs/AIUsageTab";
import FeedbackTab from "../components/admin/tabs/FeedbackTab";

/** Centralized admin tab configuration: single source of truth for indices and URL params. */
const ADMIN_TABS = {
  OVERVIEW: { index: 0, param: "overview", label: "Overview" },
  USERS: { index: 1, param: "users", label: "Users" },
  AI_USAGE: { index: 2, param: "ai-usage", label: "AI Usage" },
  FEEDBACK: { index: 3, param: "feedback", label: "Feedback" },
} as const;

const TAB_BY_PARAM: Record<string, (typeof ADMIN_TABS)[keyof typeof ADMIN_TABS]> =
  Object.fromEntries(
    Object.values(ADMIN_TABS).map((tab) => [tab.param, tab])
  );

const TAB_ICONS = [Dashboard, People, Analytics, FeedbackIcon];

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
    const tab = tabParam ? TAB_BY_PARAM[tabParam] : ADMIN_TABS.OVERVIEW;
    if (tab) {
      setCurrentTab(tab.index);
    }
  }, [searchParams]);

  // Handle tab changes and data loading
  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);
    const tab = Object.values(ADMIN_TABS).find((t) => t.index === newValue);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", tab?.param ?? "overview");
    setSearchParams(newSearchParams);
  };

  const [feedbackRefreshTrigger, setFeedbackRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    if (currentTab === ADMIN_TABS.OVERVIEW.index) {
      adminStats.loadStats();
    } else if (currentTab === ADMIN_TABS.USERS.index) {
      adminUsers.loadUsers();
    } else if (currentTab === ADMIN_TABS.AI_USAGE.index) {
      aiUsageData.loadAIUsageData();
    } else if (currentTab === ADMIN_TABS.FEEDBACK.index) {
      setFeedbackRefreshTrigger((t) => t + 1);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      // Refresh the users list after successful deletion
      adminUsers.loadUsers();
    } catch (error: any) {
      const errorMessage = normalizeApiError(error);
      throw new Error(errorMessage);
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

  const handleResetUserUsage = async (userId: string) => {
    try {
      userActions.setActionLoading(userId);
      await resetUserAIUsage(userId);
      adminUsers.loadUsers();
    } catch (error: unknown) {
      const errorMessage = normalizeApiError(error);
      throw new Error(errorMessage);
    } finally {
      userActions.setActionLoading(null);
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
    <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            letterSpacing: "-0.025em"
          }}
        >
          Admin Dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/dashboard")}
            sx={{
              fontWeight: 600,
              textTransform: "none",
              px: 3,
              py: 1.5,
              borderRadius: 3,
              "&:hover": {
                backgroundColor: "action.hover"
              }
            }}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            sx={{
              fontWeight: 600,
              textTransform: "none",
              px: 3,
              py: 1.5,
              borderRadius: 3,
              boxShadow: 2,
              "&:hover": {
                boxShadow: 4,
                transform: "translateY(-1px)"
              },
              transition: "all 0.2s ease-in-out"
            }}
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
      <Paper
        sx={{
          mb: 4,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          overflow: "hidden"
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => handleTabChange(newValue)}
          sx={{
            "& .MuiTab-root": {
              fontWeight: 600,
              textTransform: "none",
              minHeight: 64,
              "&:hover": {
                backgroundColor: "action.hover"
              }
            },
            "& .Mui-selected": {
              color: "primary.main"
            }
          }}
        >
          {Object.values(ADMIN_TABS).map((tab, i) => {
            const Icon = TAB_ICONS[i];
            return (
              <Tab
                key={tab.param}
                icon={Icon ? <Icon /> : undefined}
                label={tab.label}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === ADMIN_TABS.OVERVIEW.index && (
        <OverviewTab
          stats={adminStats.stats}
          loading={adminStats.loading}
          error={adminStats.error}
        />
      )}

      {currentTab === ADMIN_TABS.USERS.index && (
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
          onDeleteUser={handleDeleteUser}
          onResetUserUsage={handleResetUserUsage}
        />
      )}

      {currentTab === ADMIN_TABS.AI_USAGE.index && (
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

      {currentTab === ADMIN_TABS.FEEDBACK.index && (
        <FeedbackTab refreshTrigger={feedbackRefreshTrigger} />
      )}
    </Container>
  );
};

export default AdminDashboard;
