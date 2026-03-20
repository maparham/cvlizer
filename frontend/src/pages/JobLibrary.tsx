/**
 * Job Library Page Component
 *
 * This component provides a dedicated page for managing job descriptions independently
 * of the CV editor. Features include:
 * - Grid view of all user's job descriptions
 * - Search by title, company, or location
 * - Filter by status (open, applied, archived)
 * - Sort by date, company, or title
 * - Create, edit, and delete operations
 *
 * Key responsibilities:
 * - Display all job descriptions in a searchable grid
 * - Provide filtering and sorting capabilities
 * - Enable status tracking workflow
 * - Integrate with existing JobDescriptionCard and modal components
 *
 * Usage:
 * - Accessible via /applications route
 * - Linked from Dashboard
 * - Uses AI store for state management
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import { useAIStore } from "../stores/ai";
import { JobDescription, JobDescriptionStatusUpdate } from "../types/ai";
import { useNotifications } from "../packages/notifications";
import {
  JobLibraryHeader,
  JobLibraryStats,
  JobLibrarySearch,
  JobLibraryGrid,
  JobLibraryDialogs,
} from "../components/job-library";

const JobLibrary: React.FC = () => {
  const { showSuccess, showError } = useNotifications();

  // AI Store state and actions
  const {
    jobDescriptions,
    loadJobDescriptions,
    deleteJobDescription,
    updateJobDescription,
  } = useAIStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] =
    useState<JobDescription | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusEditingJobDescription, setStatusEditingJobDescription] =
    useState<JobDescription | null>(null);

  // Load job descriptions on mount
  useEffect(() => {
    loadJobDescriptions();
  }, [loadJobDescriptions]);

  // Filter and sort job descriptions
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = [...jobDescriptions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (jd) =>
          jd.title?.toLowerCase().includes(query) ||
          jd.company?.toLowerCase().includes(query) ||
          jd.location?.toLowerCase().includes(query) ||
          jd.content.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((jd) => (jd.status || "open") === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "company":
          return (a.company || "").localeCompare(b.company || "");
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobDescriptions, searchQuery, statusFilter, sortBy]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      total: jobDescriptions.length,
      open: jobDescriptions.filter((jd) => (jd.status || "open") === "open").length,
      applied: jobDescriptions.filter((jd) => jd.status === "applied").length,
      archived: jobDescriptions.filter((jd) => jd.status === "archived").length,
    };
  }, [jobDescriptions]);

  const handleEditJobDescription = useCallback((jd: JobDescription) => {
    setEditingJobDescription(jd);
    setIsModalOpen(true);
  }, []);

  const handleDeleteJobDescription = useCallback(
    async (jd: JobDescription) => {
      if (
        window.confirm(
          `Delete "${jd.title || "this job description"}"?`
        )
      ) {
        try {
          await deleteJobDescription(jd.id);
          showSuccess("Job description deleted successfully");
        } catch (error) {
          showError("Error", "Failed to delete job description");
        }
      }
    },
    [deleteJobDescription, showSuccess, showError]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingJobDescription(null);
  }, []);

  const handleUpdateStatus = useCallback((jd: JobDescription) => {
    setStatusEditingJobDescription(jd);
    setStatusDialogOpen(true);
  }, []);

  const handleStatusDialogClose = useCallback(() => {
    setStatusDialogOpen(false);
    setStatusEditingJobDescription(null);
  }, []);

  const handleStatusSave = useCallback(
    async (updates: JobDescriptionStatusUpdate) => {
      if (!statusEditingJobDescription) return;

      try {
        await updateJobDescription(statusEditingJobDescription.id, updates);
        showSuccess("Status updated successfully");
        handleStatusDialogClose();
      } catch (error) {
        showError("Error", "Failed to update status");
      }
    },
    [statusEditingJobDescription, updateJobDescription, showSuccess, showError, handleStatusDialogClose]
  );

  const handleAddJob = useCallback(() => {
    setEditingJobDescription(null);
    setIsModalOpen(true);
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <JobLibraryHeader onAddJob={handleAddJob} />

      <JobLibraryStats
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <JobLibrarySearch
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
      />

      <JobLibraryGrid
        jobs={filteredAndSortedJobs}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onEdit={handleEditJobDescription}
        onDelete={handleDeleteJobDescription}
        onUpdateStatus={handleUpdateStatus}
        onAddJob={handleAddJob}
      />

      <JobLibraryDialogs
        isModalOpen={isModalOpen}
        editingJobDescription={editingJobDescription}
        statusDialogOpen={statusDialogOpen}
        statusEditingJobDescription={statusEditingJobDescription}
        onModalClose={handleModalClose}
        onStatusDialogClose={handleStatusDialogClose}
        onStatusSave={handleStatusSave}
      />
    </Box>
  );
};

export default JobLibrary;
