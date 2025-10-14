/**
 * useAIUsageData - Custom hook for managing AI usage data
 *
 * This hook handles loading and managing AI usage statistics, charts, and logs.
 * Provides date range management, filtering, and export/delete functionality.
 *
 * Key responsibilities:
 * - Load AI usage statistics and charts
 * - Manage date range and filters
 * - Handle export and delete operations
 * - Provide pagination for logs
 *
 * Usage context:
 * - Used in admin dashboard AI usage tab
 * - Integrates with AI usage API endpoints
 * - Supports complex filtering and data management
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../stores/uiStore";
import {
  getAIUsageStats,
  getAIUsageByUser,
  getAIUsageByOperation,
  getAIUsageTimeline,
  getAIUsageLogs,
  getDefaultDateRange,
} from "../services/adminAIUsageService";
import {
  SystemAIStats,
  UserAIUsage,
  OperationAIUsage,
  TimelineData,
  PaginatedAIUsageLogs,
  AIUsageFilters,
} from "../types/admin";
import api from "../services/api";

interface UseAIUsageDataReturn {
  aiStats: SystemAIStats | null;
  aiUserUsage: UserAIUsage[];
  aiOperationUsage: OperationAIUsage[];
  aiTimeline: TimelineData[];
  aiLogs: PaginatedAIUsageLogs | null;
  loading: boolean;
  error: string | null;
  dateRange: { start: string; end: string };
  granularity: "day" | "week" | "month" | "hour";
  filters: AIUsageFilters;
  logsPage: number;
  logsLimit: number;
  setDateRange: (start: string, end: string) => void;
  setGranularity: (granularity: "day" | "week" | "month" | "hour") => void;
  setFilters: (filters: Partial<AIUsageFilters>) => void;
  setLogsPage: (page: number) => void;
  setLogsLimit: (limit: number) => void;
  loadAIUsageData: () => Promise<void>;
  loadAILogs: (filters?: AIUsageFilters) => Promise<void>;
  handleUserClick: (userId: string) => void;
  handleFilterChange: (newFilters: Partial<AIUsageFilters>) => void;
  handleClearAllFilters: () => void;
  handleExportLogs: () => Promise<void>;
  handleExportAllLogs: () => Promise<void>;
  handleDeleteAllLogs: () => Promise<void>;
  handlePaginationChange: (page: number, rowsPerPage: number) => void;
  handleGranularityChange: (
    granularity: "day" | "week" | "month" | "hour",
  ) => void;
}

export const useAIUsageData = (): UseAIUsageDataReturn => {
  const [aiStats, setAiStats] = useState<SystemAIStats | null>(null);
  const [aiUserUsage, setAiUserUsage] = useState<UserAIUsage[]>([]);
  const [aiOperationUsage, setAiOperationUsage] = useState<OperationAIUsage[]>(
    [],
  );
  const [aiTimeline, setAiTimeline] = useState<TimelineData[]>([]);
  const [aiLogs, setAiLogs] = useState<PaginatedAIUsageLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRangeState] = useState(getDefaultDateRange());
  const [granularity, setGranularityState] = useState<
    "day" | "week" | "month" | "hour"
  >("day");
  const [filters, setFiltersState] = useState<AIUsageFilters>({});
  const [logsPage, setLogsPageState] = useState(0);
  const [logsLimit, setLogsLimitState] = useState(50);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useNotifications();

  const loadAIStats = async () => {
    try {
      const stats = await getAIUsageStats(dateRange.start, dateRange.end);
      setAiStats(stats);
    } catch (err) {
      console.error("Failed to load AI stats:", err);
    }
  };

  const loadAIUserUsage = async () => {
    try {
      const users = await getAIUsageByUser(
        dateRange.start,
        dateRange.end,
        20,
        0,
      );
      setAiUserUsage(users);
    } catch (err) {
      console.error("Failed to load AI user usage:", err);
    }
  };

  const loadAIOperationUsage = async () => {
    try {
      const operations = await getAIUsageByOperation(
        dateRange.start,
        dateRange.end,
      );
      setAiOperationUsage(operations);
    } catch (err) {
      console.error("Failed to load AI operation usage:", err);
    }
  };

  // Load AI timeline data with granularity support
  const loadAITimeline = async () => {
    try {
      const timeline = await getAIUsageTimeline(
        dateRange.start,
        dateRange.end,
        granularity,
      );
      setAiTimeline(timeline);
    } catch (err) {
      console.error("Failed to load AI timeline:", err);
    }
  };

  const loadAILogs = async (filtersToUse = filters) => {
    try {
      const filtersWithDateRange = {
        ...filtersToUse,
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      const logs = await getAIUsageLogs(
        filtersWithDateRange,
        logsLimit,
        logsPage * logsLimit,
      );
      setAiLogs(logs);
    } catch (err) {
      console.error("Failed to load AI logs:", err);
    }
  };

  const loadAIUsageData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAIStats(),
        loadAIUserUsage(),
        loadAIOperationUsage(),
        loadAITimeline(),
        loadAILogs(),
      ]);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load AI usage data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dateRange.start,
    dateRange.end,
    granularity,
    filters.user_id,
    filters.operation_type,
    filters.success,
    logsPage,
    logsLimit,
  ]);

  /**
   * Handle user click to filter logs by specific user
   * @param userId - The ID of the user to filter by
   */
  const handleUserClick = (userId: string) => {
    const newFilters = { ...filters, user_id: userId };
    setFiltersState(newFilters);
    setLogsPageState(0);
    loadAILogs(newFilters);
  };

  /**
   * Handle filter changes for AI usage data
   * @param newFilters - Partial filter object to update
   */
  const handleFilterChange = (newFilters: Partial<AIUsageFilters>) => {
    const updatedFilters =
      Object.keys(newFilters).length === 0 ? {} : { ...filters, ...newFilters };

    setFiltersState(updatedFilters);
    setLogsPageState(0);
    loadAILogs(updatedFilters);
  };

  /**
   * Clear all filters and reset to default state
   */
  const handleClearAllFilters = () => {
    setFiltersState({});
    setLogsPageState(0);
    loadAILogs({});
  };

  const handleExportLogs = async () => {
    try {
      if (!aiLogs || aiLogs.logs.length === 0) {
        showSuccess("Info", "No data to export");
        return;
      }

      const headers = [
        "Timestamp",
        "User Email",
        "User ID",
        "Operation Type",
        "Model Used",
        "Prompt Tokens",
        "Completion Tokens",
        "Total Tokens",
        "Estimated Cost",
        "Generation Time (ms)",
        "Success",
      ];

      const csvContent = [
        headers.join(","),
        ...aiLogs.logs.map((log) =>
          [
            log.timestamp ? new Date(log.timestamp).toISOString() : "",
            `"${log.user_email}"`,
            log.user_id,
            log.operation_type,
            log.model_used,
            log.prompt_tokens,
            log.completion_tokens,
            log.total_tokens,
            log.estimated_cost,
            log.generation_time,
            log.success,
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);

      const dateStr = new Date().toISOString().split("T")[0];
      const userStr = filters.user_id
        ? `_user_${filters.user_id.slice(0, 8)}`
        : "";
      const operationStr = filters.operation_type
        ? `_${filters.operation_type}`
        : "";
      link.setAttribute(
        "download",
        `ai_usage_logs_${dateStr}${userStr}${operationStr}.csv`,
      );

      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess("Success", `Exported ${aiLogs.logs.length} AI usage logs`);
    } catch (err) {
      console.error("Failed to export AI logs:", err);
      setError("Failed to export AI logs");
    }
  };

  const handleExportAllLogs = async () => {
    try {
      setLoading(true);

      // Use current date range filter instead of hardcoded dates
      const response = await api.get("/admin/ai-usage/logs/export", {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
          ...(filters.user_id && { user_id: filters.user_id }),
          ...(filters.operation_type && {
            operation_type: filters.operation_type,
          }),
          ...(filters.success !== undefined && { success: filters.success }),
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let filename = `ai_usage_logs_complete_export_${new Date().toISOString().split("T")[0]}.csv`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess("Success", "AI usage logs exported successfully");
    } catch (err) {
      console.error("Failed to export all AI logs:", err);
      setError("Failed to export all AI logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    try {
      setLoading(true);

      const response = await api.delete("/admin/ai-usage/logs/all");
      const deletedCount = response.data?.deleted_count || 0;

      await loadAIUsageData();

      showSuccess(
        "Success",
        `Successfully deleted ${deletedCount} AI usage log entries`,
      );
    } catch (err: any) {
      console.error("Failed to delete all AI logs:", err);
      setError(
        err.response?.data?.detail || "Failed to delete all AI usage logs",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pagination changes for AI logs table
   * @param page - New page number
   * @param rowsPerPage - Number of rows per page
   */
  const handlePaginationChange = async (page: number, rowsPerPage: number) => {
    setLogsPageState(page);
    setLogsLimitState(rowsPerPage);
    // Load with new pagination values directly to avoid stale state
    try {
      const filtersWithDateRange = {
        ...filters,
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      const logs = await getAIUsageLogs(
        filtersWithDateRange,
        rowsPerPage,
        page * rowsPerPage,
      );
      setAiLogs(logs);
    } catch (err) {
      console.error("Failed to load AI logs:", err);
    }
  };

  /**
   * Handle granularity changes for timeline chart
   * @param newGranularity - New granularity level
   */
  const handleGranularityChange = async (
    newGranularity: "day" | "week" | "month" | "hour",
  ) => {
    setGranularityState(newGranularity);
    // Load with new granularity directly to avoid stale state
    try {
      const timeline = await getAIUsageTimeline(
        dateRange.start,
        dateRange.end,
        newGranularity,
      );
      setAiTimeline(timeline);
    } catch (err) {
      console.error("Failed to load AI timeline:", err);
    }
  };

  /**
   * Set date range for AI usage data
   * @param start - Start date string
   * @param end - End date string
   */
  const setDateRange = (start: string, end: string) => {
    setDateRangeState({ start, end });
    // Data will reload via useEffect watching dateRange.start/end
  };

  /**
   * Set granularity for timeline chart
   * @param newGranularity - New granularity level
   */
  const setGranularity = (
    newGranularity: "day" | "week" | "month" | "hour",
  ) => {
    setGranularityState(newGranularity);
    // Data will reload via useEffect watching granularity
  };

  /**
   * Set filters for AI usage data
   * @param newFilters - Partial filter object to merge with existing filters
   */
  const setFilters = (newFilters: Partial<AIUsageFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  /**
   * Set current page for AI logs table
   * @param page - Page number to set
   */
  const setLogsPage = (page: number) => {
    setLogsPageState(page);
  };

  /**
   * Set limit for AI logs table
   * @param limit - Number of rows per page
   */
  const setLogsLimit = (limit: number) => {
    setLogsLimitState(limit);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Load AI usage data when component mounts and user is authenticated
    loadAIUsageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    navigate,
    dateRange.start,
    dateRange.end,
    granularity,
    logsPage,
    logsLimit,
  ]);

  return {
    aiStats,
    aiUserUsage,
    aiOperationUsage,
    aiTimeline,
    aiLogs,
    loading,
    error,
    dateRange,
    granularity,
    filters,
    logsPage,
    logsLimit,
    setDateRange,
    setGranularity,
    setFilters,
    setLogsPage,
    setLogsLimit,
    loadAIUsageData,
    loadAILogs,
    handleUserClick,
    handleFilterChange,
    handleClearAllFilters,
    handleExportLogs,
    handleExportAllLogs,
    handleDeleteAllLogs,
    handlePaginationChange,
    handleGranularityChange,
  };
};
