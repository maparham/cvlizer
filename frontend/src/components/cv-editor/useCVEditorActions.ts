/**
 * Custom hook for CV Editor action handlers
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCVStore } from "../../stores/cv";
import { useCVNotifications } from "../../packages/notifications";

export const useCVEditorActions = (_isAdmin: boolean, isNewCV: boolean, cvId: string | undefined, temporaryCV: any, _currentCV: any) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    updateCVTitle,
    setTemporaryCV,
    deleteCV,
    currentCV,
  } = useCVStore();
  const { showSuccess, showError } = useCVNotifications(cvId);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
    handleMenuClose();
  }, [logout, navigate, handleMenuClose]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!cvId || isNewCV) return;
    if (currentCV?.is_public_shared) {
      showError(
        "Cannot delete",
        "Turn off public sharing from the Share dialog before deleting this CV.",
      );
      return;
    }

    try {
      await deleteCV(cvId);
      showSuccess("Success", "CV deleted successfully");
      setDeleteDialogOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || "Failed to delete CV";
      showError("Error", errorMessage);
    }
  }, [cvId, isNewCV, currentCV?.is_public_shared, deleteCV, showSuccess, showError, navigate]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      if (isNewCV) {
        // For temporary CVs, just update the local state
        if (temporaryCV) {
          const updatedTemporaryCV = {
            ...temporaryCV,
            original_filename: newTitle,
          };
          setTemporaryCV(updatedTemporaryCV);
          showSuccess(
            "Success",
            "Title updated (will be saved when you save the CV)"
          );
        }
      } else {
        // For existing CVs, save to backend
        if (!cvId) {
          showError("Error", "Cannot update title: CV ID not found");
          return;
        }

        try {
          await updateCVTitle(cvId, newTitle);
          showSuccess("Success", "CV title updated successfully");
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || "Failed to update CV title";
          showError("Error", errorMessage);
        }
      }
    },
    [
      isNewCV,
      temporaryCV,
      setTemporaryCV,
      cvId,
      updateCVTitle,
      showSuccess,
      showError,
    ]
  );

  return {
    anchorEl,
    deleteDialogOpen,
    handleLogout,
    handleMenuOpen,
    handleMenuClose,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleTitleSave,
  };
};
