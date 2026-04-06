/**
 * Dashboard Page Component
 *
 * This module provides the main CV management interface where users can view,
 * manage, and organize their CV collection. It includes search, filtering,
 * and CRUD operations for CVs.
 *
 * Key responsibilities:
 * - Display user's CV collection with status indicators
 * - Provide search and filtering capabilities
 * - Handle CV creation, editing, deletion, and duplication
 * - Show CV processing status and error states
 * - Manage user authentication and admin access
 *
 * Usage:
 * - Rendered as the "/dashboard" route for authenticated users
 * - Uses CV store for state management and API operations
 * - Integrates with notification system for user feedback
 * - Provides responsive grid layout for CV cards
 */
import React, { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCVStore } from "../stores/cv";
import { useAIStore } from "../stores/ai";
import { useUIStore } from "../stores/uiStore";
import axios from "axios";
import { useNotifications } from "../packages/notifications";
import { cvApi } from "../services/api";
import { useActivityLogger } from "../hooks/useActivityLogger";
import { NotificationDrawer, NotificationToast, NotificationDrawerRef } from "../packages/notifications";
import { CV } from "../types";
import { JobDescription, JobDescriptionStatusUpdate } from "../types/ai";
import {
  DashboardHeader,
  JobApplicationsCard,
  CVsCard,
  CVCard,
  CVPlaceholderCard,
  DashboardDialogs,
  EmptyState,
  CVsSectionSkeleton,
  JobApplicationsSectionSkeleton,
} from "../components/dashboard";
import type { CVTableSortColumn } from "../components/dashboard/CVsTable";
import type { JobTableSortColumn } from "../components/dashboard/JobApplicationsTable";

const Dashboard: React.FC = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fromTextOpen, setFromTextOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<CV | null>(null);
  const [jobDescriptionModalOpen, setJobDescriptionModalOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] = useState<JobDescription | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusEditingJobDescription, setStatusEditingJobDescription] = useState<JobDescription | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const notificationDrawerRef = useRef<NotificationDrawerRef>(null);

  const {
    logout,
    isAdmin: authIsAdmin,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const { logUserAction } = useActivityLogger();

  // Use CV store instead of local state
  const {
    cvs,
    isCVsLoading,
    fetchCVs,
    createTemporaryCV,
    updateCVTitle,
    deleteCV: deleteCVFromStore,
    duplicateCV: duplicateCVFromStore,
  } = useCVStore();

  // Get job descriptions for the applications card
  const {
    jobDescriptions,
    isJobDescriptionsLoading,
    loadJobDescriptions,
  } = useAIStore();

  // Dashboard CV list view and table sort (persisted)
  const cvViewMode = useUIStore((s) => s.cvViewMode);
  const setCVViewMode = useUIStore((s) => s.setCVViewMode);
  const cvTableSortBy = useUIStore((s) => s.cvTableSortBy);
  const cvTableSortDirection = useUIStore((s) => s.cvTableSortDirection);
  const setCVTableSort = useUIStore((s) => s.setCVTableSort);

  // Dashboard Job Applications list view and table sort (persisted)
  const jobViewMode = useUIStore((s) => s.jobViewMode);
  const setJobViewMode = useUIStore((s) => s.setJobViewMode);
  const jobTableSortBy = useUIStore((s) => s.jobTableSortBy);
  const jobTableSortDirection = useUIStore((s) => s.jobTableSortDirection);
  const setJobTableSort = useUIStore((s) => s.setJobTableSort);

  const validSortColumns: CVTableSortColumn[] = [
    "original_filename",
    "status",
    "file_type",
    "created_at",
    "updated_at",
    "sections",
  ];
  const tableSortBy: CVTableSortColumn = validSortColumns.includes(
    cvTableSortBy as CVTableSortColumn
  )
    ? (cvTableSortBy as CVTableSortColumn)
    : "created_at";
  const tableSortDirection = cvTableSortDirection;
  const handleTableSortChange = (sortBy: CVTableSortColumn, sortDirection: "asc" | "desc") => {
    setCVTableSort(sortBy, sortDirection);
  };

  const validJobSortColumns: JobTableSortColumn[] = [
    "title",
    "company",
    "location",
    "status",
    "created_at",
    "application_date",
  ];
  const jobTableSortByValid: JobTableSortColumn = validJobSortColumns.includes(
    jobTableSortBy as JobTableSortColumn
  )
    ? (jobTableSortBy as JobTableSortColumn)
    : "created_at";
  const handleJobTableSortChange = (sortBy: JobTableSortColumn, sortDirection: "asc" | "desc") => {
    setJobTableSort(sortBy, sortDirection);
  };

  // Track CV to open editor after parsing completes
  const [pendingEditorCvId, setPendingEditorCvId] = useState<string | null>(null);

  // Navigate to editor after parsing completes successfully
  useEffect(() => {
    if (!pendingEditorCvId) return;
    const cv = cvs.find((c) => c.id === pendingEditorCvId);
    if (!cv) return;
    if (cv.parse_error) {
      showError("Parsing failed", cv.parse_error, true);
      setPendingEditorCvId(null);
      return;
    }
    if (cv.is_parsed) {
      navigate(`/cv/${pendingEditorCvId}`);
      showSuccess("CV ready", "Your CV is ready for editing", true);
      setPendingEditorCvId(null);
    }
  }, [cvs, pendingEditorCvId]);

  // Get CV status counts for filter badges (memoized to avoid repeated filtering)
  const cvStatusCounts = React.useMemo(
    () => ({
      all: cvs.length,
      parsed: cvs.filter((cv) => cv.is_parsed && !cv.parse_error).length,
      parsing: cvs.filter((cv) => !cv.is_parsed && !cv.parse_error).length,
      error: cvs.filter((cv) => !!cv.parse_error).length,
    }),
    [cvs]
  );

  // Get JD status counts (memoized to avoid repeated filtering)
  const jdStatusCounts = React.useMemo(
    () => ({
      open: jobDescriptions.filter((jd) => jd.status === "open").length,
      applied: jobDescriptions.filter((jd) => jd.status === "applied").length,
      archived: jobDescriptions.filter((jd) => jd.status === "archived").length,
    }),
    [jobDescriptions]
  );

  // Fetch CVs on component mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchCVs();
      loadJobDescriptions();
      // Log dashboard view (page view is already logged by useActivityLogger)
      logUserAction("dashboard_view", "User viewed dashboard");
    }
  }, [isAuthenticated, authLoading]); // Depend on auth state only

  // Handler functions
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCvToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!cvToDelete) return;

    try {
      await deleteCVFromStore(cvToDelete.id);
      // Log CV deletion
      logUserAction("cv_delete", `User deleted CV: ${cvToDelete.original_filename}`, {
        cvId: cvToDelete.id,
        filename: cvToDelete.original_filename,
      });
      showSuccess("Success", `${cvToDelete.original_filename} deleted successfully`);
      setDeleteDialogOpen(false);
      setCvToDelete(null);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleDuplicate = async (cv: CV) => {
    try {
      await duplicateCVFromStore(cv.id);
      showSuccess("Success", `CV "${cv.original_filename}" duplicated successfully`);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleTitleSave = async (cv: CV, newTitle: string) => {
    try {
      await updateCVTitle(cv.id, newTitle);
      showSuccess("Success", "CV title updated successfully");
    } catch (error: any) {
      // Error handled by store
    }
  };

  const handleEditJobDescription = (jd: JobDescription) => {
    setEditingJobDescription(jd);
    setJobDescriptionModalOpen(true);
  };

  const handleJobDescriptionModalClose = () => {
    setJobDescriptionModalOpen(false);
    setEditingJobDescription(null);
  };

  const handleUpdateStatus = (jd: JobDescription) => {
    setStatusEditingJobDescription(jd);
    setStatusDialogOpen(true);
  };

  const handleStatusDialogClose = () => {
    setStatusDialogOpen(false);
    setStatusEditingJobDescription(null);
  };

  const handleStatusSave = async (updates: JobDescriptionStatusUpdate) => {
    if (!statusEditingJobDescription) return;

    try {
      const { updateJobDescription } = useAIStore.getState();
      await updateJobDescription(statusEditingJobDescription.id, updates);
      showSuccess("Status updated successfully");
    } catch (error) {
      // Error handled by store
    }
  };

  const handleStartFromScratch = async () => {
    if (creating) return;

    setCreating(true);
    try {
      const newCV = await createTemporaryCV();
      navigate(`/cv/${newCV.id}`);
    } catch (error) {
      console.error("Error creating blank CV:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleTemplateSelect = async (template: any) => {
    if (creating) return;

    setCreating(true);
    try {
      const newCV = await createTemporaryCV();

      // If a template was selected, apply its data
      if (template) {
        // Update the temporary CV with template data
        newCV.parsed_data = { ...newCV.parsed_data, ...template.sampleData };
        newCV.original_filename = `${template.name} - New CV`;
      }

      navigate(`/cv/${newCV.id}`);
    } catch (error) {
      console.error("Error creating CV from template:", error);
    } finally {
      setCreating(false);
    }
  };

  const handlePlaceholderFileSelected = (file: File) => {
    setPendingUploadFile(file);
    setUploadOpen(true);
  };

  const handleUploadClose = () => {
    setUploadOpen(false);
    setPendingUploadFile(null);
  };

  const handleEdit = (cvId: string) => {
    navigate(`/cv/${cvId}`);
  };

  const handleDownload = async (cv: CV) => {
    try {
      await cvApi.exportCVAsPDF(cv.id);
      showSuccess("Success", "CV exported successfully");
    } catch (e) {
      showError("Download failed", "Unable to download CV file");
    }
  };

  const handleDownloadOriginal = async (cv: CV) => {
    try {
      await cvApi.downloadCV(cv.id, cv.original_filename || "cv");
      showSuccess("Success", "Original file downloaded");
    } catch (e: unknown) {
      let detail = "Unable to download the original file";
      if (axios.isAxiosError(e)) {
        const d = e.response?.data?.detail;
        if (typeof d === "string") {
          detail = d;
        }
      }
      showError("Download failed", detail);
    }
  };

  const handleDelete = (cv: CV) => {
    setCvToDelete(cv);
    setDeleteDialogOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const showCVsSkeleton = isCVsLoading;
  const showCVEmptyState = !isCVsLoading && cvs.length === 0;
  const showJobsSkeleton = isJobDescriptionsLoading;

  const handleLogoutClick = () => {
    handleLogout();
    handleMenuClose();
  };

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: "grey.100", minHeight: "100vh" }}>
      <DashboardHeader
        anchorEl={anchorEl}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        onLogout={handleLogoutClick}
        isAdmin={authIsAdmin}
        onNavigate={navigate}
      />

      <Container maxWidth="lg" sx={{ mt: 6, mb: 6, px: 3 }}>
        {/* CVs Section: empty state when no CVs, otherwise CV grid with placeholder card */}
        {showCVsSkeleton ? (
          <CVsSectionSkeleton />
        ) : showCVEmptyState ? (
          <EmptyState
            creating={creating}
            onCreateFromTemplate={() => setTemplateSelectorOpen(true)}
            onStartFromScratch={handleStartFromScratch}
            onFileDrop={handlePlaceholderFileSelected}
            onValidationError={(error) => showError("Invalid file", error)}
          />
        ) : (
          <CVsCard
            cvs={cvs}
            statusCounts={cvStatusCounts}
            creating={creating}
            viewMode={cvViewMode}
            onViewModeChange={setCVViewMode}
            tableSortBy={tableSortBy}
            tableSortDirection={tableSortDirection}
            onTableSortChange={handleTableSortChange}
            onCreateFromTemplate={() => setTemplateSelectorOpen(true)}
            onStartFromScratch={handleStartFromScratch}
            onUpload={() => setUploadOpen(true)}
            onPasteCV={() => setFromTextOpen(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onTitleSave={handleTitleSave}
            onDownload={handleDownload}
            onDownloadOriginal={handleDownloadOriginal}
            onFileSelected={handlePlaceholderFileSelected}
            onValidationError={(error) => showError("Invalid file", error)}
            onSharingMutation={() => void fetchCVs()}
          >
            {cvs.map((cv) => (
              <CVCard
                key={cv.id}
                cv={cv}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onTitleSave={handleTitleSave}
                onDownload={handleDownload}
                onDownloadOriginal={handleDownloadOriginal}
                onSharingMutation={() => void fetchCVs()}
              />
            ))}
            <CVPlaceholderCard
              onFileSelected={handlePlaceholderFileSelected}
              onValidationError={(error) => showError("Invalid file", error)}
            />
          </CVsCard>
        )}

        {/* Job Applications Card */}
        {showJobsSkeleton ? (
          <JobApplicationsSectionSkeleton />
        ) : (
          <JobApplicationsCard
            jobDescriptions={jobDescriptions}
            statusCounts={jdStatusCounts}
            viewMode={jobViewMode}
            onViewModeChange={setJobViewMode}
            tableSortBy={jobTableSortByValid}
            tableSortDirection={jobTableSortDirection}
            onTableSortChange={handleJobTableSortChange}
            onEditJobDescription={handleEditJobDescription}
            onUpdateStatus={handleUpdateStatus}
            onAddJob={() => setJobDescriptionModalOpen(true)}
            onViewAll={() => navigate("/applications")}
            onSharingMutation={() => void loadJobDescriptions()}
          />
        )}

        {/* Dialogs */}
        <DashboardDialogs
          uploadOpen={uploadOpen}
          onUploadClose={handleUploadClose}
          onUploadSuccess={(cvId: string) => {
            handleUploadClose();
            showSuccess("Success", "CV uploaded successfully and is being parsed");
            // Wait for parsing to complete before opening the editor
            setPendingEditorCvId(cvId);
          }}
          initialFile={pendingUploadFile}
          fromTextOpen={fromTextOpen}
          onFromTextClose={() => setFromTextOpen(false)}
          onFromTextSuccess={(cvId: string) => {
            showSuccess("Success", "CV created successfully and is being parsed");
            setPendingEditorCvId(cvId);
          }}
          templateSelectorOpen={templateSelectorOpen}
          onTemplateSelectorClose={() => setTemplateSelectorOpen(false)}
          onTemplateSelect={handleTemplateSelect}
          deleteDialogOpen={deleteDialogOpen}
          cvToDelete={cvToDelete}
          onDeleteCancel={handleDeleteCancel}
          onDeleteConfirm={handleDeleteConfirm}
          jobDescriptionModalOpen={jobDescriptionModalOpen}
          editingJobDescription={editingJobDescription}
          onJobDescriptionClose={handleJobDescriptionModalClose}
          onJobDescriptionCreated={() => {
            loadJobDescriptions();
          }}
          statusDialogOpen={statusDialogOpen}
          statusEditingJobDescription={statusEditingJobDescription}
          onStatusDialogClose={handleStatusDialogClose}
          onStatusSave={handleStatusSave}
        />

        {/* Notification Toast */}
        <NotificationToast
          onOpenDrawer={() => notificationDrawerRef.current?.openDrawer()}
        />

        {/* Notification Drawer */}
        <NotificationDrawer ref={notificationDrawerRef} />
      </Container>
    </Box>
  );
};

export default Dashboard;
