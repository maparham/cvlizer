/**
 * Dashboard Actions Hook
 *
 * This module provides centralized action handlers for the Dashboard component,
 * including CV operations, job description management, and user menu interactions.
 *
 * Key responsibilities:
 * - Handle CV CRUD operations (duplicate, delete, title save, download)
 * - Manage job description editing and status updates
 * - Control dialog open/close states
 * - Handle navigation and logout
 * - Create new CVs from templates or scratch
 *
 * Usage:
 * - Used in Dashboard component to manage all user interactions
 * - Provides consistent error handling and notification feedback
 * - Maintains proper loading states for async operations
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCVStore } from "../../stores/cv";
import { useAIStore } from "../../stores/ai";
import { useNotifications } from "../../packages/notifications";
import { useActivityLogger } from "../../hooks/useActivityLogger";
import { cvApi } from "../../services/api";
import { CV } from "../../types";
import { JobDescription } from "../../types/ai";

/**
 * Hook that provides all dashboard action handlers
 */
export const useDashboardActions = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const { logUserAction } = useActivityLogger();
  const { deleteCV: deleteCVFromStore, duplicateCV: duplicateCVFromStore, updateCVTitle, createTemporaryCV } = useCVStore();

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    handleMenuClose();
  };

  // Delete handlers
  const _handleDeleteCancel = () => {
    // This will be managed by parent component
  };

  const handleDeleteConfirm = async (cvToDelete: CV | null) => {
    if (!cvToDelete) return;

    try {
      await deleteCVFromStore(cvToDelete.id);
      logUserAction("cv_delete", `User deleted CV: ${cvToDelete.original_filename}`, {
        cvId: cvToDelete.id,
        filename: cvToDelete.original_filename,
      });
      showSuccess("Success", `${cvToDelete.original_filename} deleted successfully`);
    } catch (error) {
      showError("Error", "Failed to delete CV");
    }
  };

  const handleDuplicate = async (cv: CV) => {
    try {
      await duplicateCVFromStore(cv.id);
      showSuccess("Success", `CV "${cv.original_filename}" duplicated successfully`);
    } catch (error) {
      showError("Error", "Failed to duplicate CV");
    }
  };

  const handleTitleSave = async (cv: CV, newTitle: string) => {
    try {
      await updateCVTitle(cv.id, newTitle);
      showSuccess("Success", "CV title updated successfully");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || "Failed to update CV title";
      showError("Error", errorMessage);
    }
  };

  const handleEditJobDescription = () => {
    // This will be managed by parent component
  };

  const handleJobDescriptionModalClose = () => {
    // This will be managed by parent component
  };

  const handleUpdateStatus = () => {
    // This will be managed by parent component
  };

  const handleStatusDialogClose = () => {
    // This will be managed by parent component
  };

  const handleStatusSave = async (updates: { status?: string; application_date?: string; notes?: string }, statusEditingJobDescription: JobDescription | null) => {
    if (!statusEditingJobDescription) return;

    try {
      const { updateJobDescription } = useAIStore.getState();
      await updateJobDescription(statusEditingJobDescription.id, updates);
      showSuccess("Status updated successfully");
    } catch (error) {
      showError("Error", "Failed to update status");
    }
  };

  const handleDownloadCV = async (cv: CV) => {
    try {
      await cvApi.exportCVAsPDF(cv.id);
      showSuccess("Success", "CV exported successfully");
      logUserAction("cv_exported", { cv_id: cv.id });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to export CV";
      showError("Error", errorMessage);
    }
  };

  const handleCreateFromTemplate = () => {
    // This will be managed by parent component
  };

  const handleStartFromScratch = async () => {
    try {
      const newCV = await createTemporaryCV();
      navigate(`/cv/${newCV.id}`);
    } catch (error) {
      console.error("Error creating blank CV:", error);
      showError("Error", "Failed to create new CV");
    }
  };

  const handleTemplateSelect = async (template: any) => {
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
      showError("Error", "Failed to create new CV");
    }
  };

  return {
    anchorEl,
    handleMenuOpen,
    handleMenuClose,
    handleLogout,
    handleDeleteConfirm,
    handleDuplicate,
    handleTitleSave,
    handleEditJobDescription,
    handleJobDescriptionModalClose,
    handleUpdateStatus,
    handleStatusDialogClose,
    handleStatusSave,
    handleDownloadCV,
    handleCreateFromTemplate,
    handleStartFromScratch,
    handleTemplateSelect,
  };
};
