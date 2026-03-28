/**
 * useUserActions - Custom hook for managing user actions and details
 *
 * This hook handles user detail loading, CV management, activity tracking,
 * and impersonation functionality for the admin dashboard.
 *
 * Key responsibilities:
 * - Load user details and CVs
 * - Manage user activities and errors
 * - Handle impersonation logic
 * - Provide loading states for actions
 *
 * Usage context:
 * - Used in admin dashboard for user management
 * - Integrates with user API endpoints
 * - Supports complex user operations
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../packages/notifications";
import { useImpersonation } from "./useImpersonation";
import {
  impersonationService,
  ImpersonationError,
} from "../services/impersonationService";
import api, { normalizeApiError } from "../services/api";
import { reloadScopedDashboardDataAfterIdentityChange } from "../utils/impersonationScopedDataRefresh";
import { UserDetail, UserCV, UserSummary } from "../types/admin";

interface UseUserActionsReturn {
  selectedUser: UserDetail | null;
  userCVs: UserCV[];
  userActivities: any[];
  userErrors: any[];
  actionLoading: string | null;
  activitiesLoading: boolean;
  activitiesPage: number;
  activitiesLimit: number;
  activitiesTotal: number;
  activityTypeFilter: string;
  selectedUserId: string;
  impersonationDialogOpen: boolean;
  impersonationTarget: UserSummary | null;
  impersonationJustification: string;
  userDetailOpen: boolean;
  userCVsOpen: boolean;
  activitiesOpen: boolean;
  errorsOpen: boolean;
  loadUserDetail: (userId: string) => Promise<void>;
  loadUserCVs: (userId: string) => Promise<void>;
  loadUserActivities: (
    userId: string,
    page?: number,
    limit?: number,
    activityType?: string,
  ) => Promise<void>;
  loadUserErrors: (userId: string) => Promise<void>;
  clearUserActivities: (userId: string) => Promise<void>;
  startImpersonation: (user: UserSummary) => void;
  confirmImpersonation: () => Promise<void>;
  setUserDetailOpen: (open: boolean) => void;
  setUserCVsOpen: (open: boolean) => void;
  setActivitiesOpen: (open: boolean) => void;
  setErrorsOpen: (open: boolean) => void;
  setImpersonationDialogOpen: (open: boolean) => void;
  setImpersonationJustification: (justification: string) => void;
  setActivityTypeFilter: (filter: string) => void;
  setActionLoading: (userId: string | null) => void;
}

export const useUserActions = (): UseUserActionsReturn => {
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userCVs, setUserCVs] = useState<UserCV[]>([]);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [userErrors, setUserErrors] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [activitiesLimit, setActivitiesLimit] = useState(50);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [impersonationDialogOpen, setImpersonationDialogOpen] = useState(false);
  const [impersonationTarget, setImpersonationTarget] =
    useState<UserSummary | null>(null);
  const [impersonationJustification, setImpersonationJustification] =
    useState("");
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userCVsOpen, setUserCVsOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const navigate = useNavigate();
  const { showSuccess } = useNotifications();
  const { forceStatusCheck } = useImpersonation();

  const loadUserDetail = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await api.get(`/admin/users/${userId}`);
      setSelectedUser(response.data);
      setUserDetailOpen(true);
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail || "Failed to load user details",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const loadUserCVs = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await api.get(`/admin/users/${userId}/cvs`);
      setUserCVs(response.data.cvs);
      setUserCVsOpen(true);
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || "Failed to load user CVs");
    } finally {
      setActionLoading(null);
    }
  };

  const loadUserActivities = async (
    userId: string,
    page: number = 0,
    limit: number = 50,
    activityType?: string,
  ) => {
    try {
      setActionLoading(userId);
      setActivitiesLoading(true);
      setSelectedUserId(userId);
      setActivitiesPage(page);
      setActivitiesLimit(limit);

      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", (page * limit).toString());
      if (activityType) {
        params.append("activity_type", activityType);
      }

      const response = await api.get(
        `/admin/users/${userId}/activities?${params.toString()}`,
      );
      setUserActivities(response.data.activities);
      setActivitiesTotal(response.data.total || 0);
      setActivitiesOpen(true);
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail || "Failed to load user activities",
      );
    } finally {
      setActionLoading(null);
      setActivitiesLoading(false);
    }
  };

  const clearUserActivities = async (userId: string) => {
    try {
      const response = await api.delete(`/admin/users/${userId}/activities`);
      showSuccess("Success", response.data.message);

      if (selectedUserId === userId) {
        loadUserActivities(
          userId,
          activitiesPage,
          activitiesLimit,
          activityTypeFilter,
        );
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail || "Failed to clear user activities",
      );
    }
  };

  const loadUserErrors = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await api.get(`/admin/users/${userId}/errors`);
      setUserErrors(response.data.errors);
      setErrorsOpen(true);
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail || "Failed to load user errors",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const startImpersonation = (user: UserSummary) => {
    setImpersonationTarget(user);
    setImpersonationDialogOpen(true);
  };

  const confirmImpersonation = async () => {
    if (!impersonationTarget) return;

    try {
      setActionLoading(impersonationTarget.id);
      await impersonationService.startImpersonation({
        target_user_id: impersonationTarget.id,
        justification: impersonationJustification || undefined,
      });

      await reloadScopedDashboardDataAfterIdentityChange();

      setImpersonationDialogOpen(false);
      setImpersonationJustification("");
      showSuccess(
        "Success",
        `Started impersonating ${impersonationTarget.email}`,
      );

      await forceStatusCheck();
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof ImpersonationError) {
        throw new Error(error.message);
      }
      throw new Error(normalizeApiError(error));
    } finally {
      setActionLoading(null);
    }
  };

  return {
    selectedUser,
    userCVs,
    userActivities,
    userErrors,
    actionLoading,
    activitiesLoading,
    activitiesPage,
    activitiesLimit,
    activitiesTotal,
    activityTypeFilter,
    selectedUserId,
    impersonationDialogOpen,
    impersonationTarget,
    impersonationJustification,
    userDetailOpen,
    userCVsOpen,
    activitiesOpen,
    errorsOpen,
    loadUserDetail,
    loadUserCVs,
    loadUserActivities,
    loadUserErrors,
    clearUserActivities,
    startImpersonation,
    confirmImpersonation,
    setUserDetailOpen,
    setUserCVsOpen,
    setActivitiesOpen,
    setErrorsOpen,
    setImpersonationDialogOpen,
    setImpersonationJustification,
    setActivityTypeFilter,
    setActionLoading,
  };
};
