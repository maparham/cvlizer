/**
 * CV Editor Page Component
 *
 * This module provides the main CV editing interface where users can modify their CV content.
 * It includes section-based editing, validation, and integration with the CV store.
 *
 * Key responsibilities:
 * - Display CV content in editable sections
 * - Handle section-based editing and validation
 * - Manage unsaved changes and navigation warnings
 * - Provide export and delete functionality
 * - Integrate with CV store for data persistence
 *
 * Usage:
 * - Rendered as the "/cv/:id" route for CV editing
 * - Uses CVEditorContext for state management
 * - Provides responsive editing interface with Material-UI
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { cvApi } from "../services/api";
import { CVEditorProvider, useCVEditor } from "../contexts/CVEditorContext";
import { PDFCVEditor } from "../components/cv";
import { SaveWithValidationErrors } from "../components/cv/SaveWithValidationErrors";
import { InitialValidation } from "../components/cv/InitialValidation";
import { NotificationDrawer, NotificationToast, NotificationDrawerRef } from "../packages/notifications";
import { ErrorBoundary } from "../components/common";
import { CVProvider } from "../contexts/CVContext";
import { useCVStore } from "../stores/cvStore";
import { useCVNotifications } from "../packages/notifications";
import { useAIStore } from "../stores/aiStore";
import { CVData } from "../types";
import { parseValidationErrors } from "../utils/validationUtils";

// Extend window interface to include switchToAITools function
declare global {
  interface Window {
    switchToAITools?: () => void;
  }
}

// Component that handles back navigation with edit state checks
const CVEditorHeader: React.FC<{
  onLogout: () => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  anchorEl: null | HTMLElement;
  onExport: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  isNewCV: boolean;
}> = ({
  onLogout,
  onMenuOpen,
  onMenuClose,
  anchorEl,
  onExport,
  onDelete,
  isAdmin,
  isNewCV,
}) => {
  const navigate = useNavigate();
  const { editingSection, editingIndividualItem, hasUnsavedChanges } =
    useCVEditor();
  const [showBackDialog, setShowBackDialog] = useState(false);

  const handleBackClick = () => {
    // Check if any section is in edit mode or has unsaved changes
    if (editingSection || editingIndividualItem || hasUnsavedChanges) {
      setShowBackDialog(true);
    } else {
      navigate("/dashboard");
    }
  };

  const handleBackDialogClose = () => {
    setShowBackDialog(false);
  };

  const handleBackDialogConfirm = () => {
    setShowBackDialog(false);
    navigate("/dashboard");
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "background.paper",
          boxShadow: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          color: "text.primary",
        }}
      >
        <Toolbar sx={{ minHeight: "64px !important", px: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              edge="start"
              onClick={handleBackClick}
              data-testid="cv-editor-back-button"
              sx={{
                mr: 2,
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  color: "text.primary",
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Dashboard
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />

          {!isNewCV && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={onDelete}
              sx={{
                mr: 2,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                borderColor: "error.main",
                color: "error.main",
                "&:hover": {
                  backgroundColor: "error.light",
                  color: "error.contrastText",
                  borderColor: "error.dark",
                },
              }}
            >
              Delete
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={onExport}
            sx={{
              mr: 2,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "primary.light"
              },
            }}
          >
            Export
          </Button>
          <IconButton
            size="medium"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={onMenuOpen}
            data-testid="cv-editor-user-menu-button"
            sx={{
              color: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                color: "text.primary",
              },
            }}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={onMenuClose}
          >
            <MenuItem
              onClick={() => {
                navigate("/profile");
                onMenuClose();
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                onExport();
                onMenuClose();
              }}
            >
              Export as PDF
            </MenuItem>
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  navigate("/admin");
                  onMenuClose();
                }}
              >
                Admin
              </MenuItem>
            )}
            <MenuItem onClick={onLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Back navigation confirmation dialog */}
      <Dialog
        open={showBackDialog}
        onClose={handleBackDialogClose}
        aria-labelledby="back-dialog-title"
        aria-describedby="back-dialog-description"
        data-testid="unsaved-changes-dialog"
      >
        <DialogTitle id="back-dialog-title">Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText id="back-dialog-description">
            You have unsaved changes that will be lost if you go back. Are you
            sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleBackDialogClose}
            data-testid="unsaved-changes-stay-button"
          >
            Stay
          </Button>
          <Button
            onClick={handleBackDialogConfirm}
            color="error"
            autoFocus
            data-testid="unsaved-changes-leave-button"
          >
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Inner component that has access to CVEditor context and can clear unsaved changes
const CVEditorContent: React.FC<{
  cvId: string | undefined;
  activeCV: any;
  onLogout: () => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  anchorEl: null | HTMLElement;
  onTitleSave: (title: string) => Promise<void>;
  onDelete: () => void;
  isAdmin: boolean;
  isNewCV: boolean;
}> = ({
  cvId,
  activeCV,
  onLogout,
  onMenuOpen,
  onMenuClose,
  anchorEl,
  onTitleSave,
  onDelete,
  isAdmin,
  isNewCV,
}) => {
  const { showError } = useCVNotifications(cvId);

  const handleExport = async () => {
    try {
      if (!cvId || cvId === "new") {
        showError(
          "Export Unavailable",
          "Please save your CV before exporting."
        );
        return;
      }
      await cvApi.exportCVAsPDF(cvId);
    } catch (e) {
      showError("Export Failed", "Could not open PDF export in a new tab.");
    }
  };

  return (
    <>
      <CVEditorHeader
        onLogout={onLogout}
        onMenuOpen={onMenuOpen}
        onMenuClose={onMenuClose}
        anchorEl={anchorEl}
        onExport={handleExport}
        onDelete={onDelete}
        isAdmin={isAdmin}
        isNewCV={isNewCV}
      />
      <PDFCVEditor
        title={activeCV?.original_filename || "Untitled CV"}
        onTitleSave={onTitleSave}
        cvId={cvId !== "new" ? cvId : undefined}
      />
    </>
  );
};

const CVEditor: React.FC = () => {
  const { cvId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const notificationDrawerRef = useRef<NotificationDrawerRef>(null);

  const {
    showSuccess,
    showError,
    showValidationError,
    showInfo,
    notifications,
    removeNotification,
  } = useCVNotifications(cvId);

  // Use CV store instead of local state
  const {
    currentCV,
    temporaryCV,
    loading,
    error,
    fetchCV,
    updateCV,
    updateCVTitle,
    saveTemporaryCV,
    setCurrentCV,
    setTemporaryCV,
    createSnapshotOnUserAction,
    deleteCV,
  } = useCVStore();

  // Determine if this is a new/temporary CV
  const isNewCV = Boolean(
    cvId === "new" || cvId === undefined || (cvId && cvId.startsWith("temp-")),
  );

  // Get CV data from either current CV or temporary CV
  const activeCV = isNewCV ? temporaryCV : currentCV;
  const cvData = useMemo(() => activeCV?.parsed_data, [activeCV]);

  const { clearCacheForCV } = useAIStore();

  // Fetch CV data on component mount (only for existing CVs)
  useEffect(() => {
    if (cvId && cvId !== "new" && !cvId.startsWith("temp-")) {
      fetchCV(cvId);
    } else if (isNewCV && !temporaryCV) {
      // If we're on the new CV route but no temporary CV exists, redirect to dashboard
      navigate("/dashboard");
    }
  }, [cvId, isNewCV, temporaryCV, navigate]); // Only depend on cvId to prevent infinite loops

  // Clean up CV-specific state when leaving the editor
  useEffect(() => {
    return () => {
      if (cvId && cvId !== "new" && !cvId.startsWith("temp-")) {
        // Clear CV-specific job descriptions when navigating away
        // Note: We don't clear drafts here to allow background tasks to complete
        // Drafts will be refreshed from backend when loading the CV
        clearCacheForCV(cvId);
      }
    };
  }, [cvId, clearCacheForCV]);

  // Show error notifications (but skip validation errors as they're handled separately)
  useEffect(() => {
    if (error && !error.includes("CV validation failed:")) {
      showError("Error", error);
    }
  }, [error]); // Remove showError from dependencies to prevent infinite loop

  // Handle location state for auto-opening AI Tools
  useEffect(() => {
    if (location.state?.openAITools) {
      // Use setTimeout to ensure the PDFCVEditor has mounted and set window.switchToAITools
      setTimeout(() => {
        if (window.switchToAITools) {
          window.switchToAITools();
        } else {
          // Try again after a longer delay if not available
          setTimeout(() => {
            if (window.switchToAITools) {
              window.switchToAITools();
            }
          }, 500);
        }
      }, 100);
    }
  }, [location.state]);

  // Handle setting active job description from location state
  useEffect(() => {
    const { setActiveJobDescription, loadJobDescriptions } = useAIStore.getState();
    if (location.state?.jobDescriptionId && cvId) {
      // Load job descriptions first, then set active
      loadJobDescriptions(cvId).then(() => {
        setActiveJobDescription(location.state.jobDescriptionId, cvId);
      }).catch((error) => {
        console.error("Failed to load job descriptions:", error);
      });
    }
  }, [location.state?.jobDescriptionId, cvId]);

  // Auto-trigger AI enhancements when coming from quick start with both CV and JD
  // This simulates clicking the buttons to reuse all existing logic (polling, error handling, etc.)
  useEffect(() => {
    if (location.state?.autoTriggerEnhancements && cvId && location.state?.jobDescriptionId) {
      // Wait for UI to load, then simulate button clicks
      const timeoutId = setTimeout(() => {
        // Simulate clicking the "Enhance CV for this Job" button
        const enhanceButton = Array.from(document.querySelectorAll('button')).find(
          button => button.textContent?.includes('Enhance CV for this Job')
        ) as HTMLButtonElement;
        if (enhanceButton && !enhanceButton.disabled) {
          enhanceButton.click();
        }

        // Simulate clicking the "Generate Job Fit Section" button
        const jobFitButton = Array.from(document.querySelectorAll('button')).find(
          button => button.textContent?.includes('Generate Job Fit Section')
        ) as HTMLButtonElement;
        if (jobFitButton && !jobFitButton.disabled) {
          jobFitButton.click();
        }
      }, 1000); // Wait 1 second for UI to load

      return () => clearTimeout(timeoutId);
    }
  }, [location.state?.autoTriggerEnhancements, cvId, location.state?.jobDescriptionId]);

  const handleSave = useCallback(
    async (updatedData?: CVData, message?: string) => {
      const dataToSave = updatedData || cvData;
      if (!dataToSave) return;

      // Show immediate feedback that save is starting (toast-only)
      const savingNotificationId = showInfo(
        "Saving...",
        "Your changes are being saved.",
        true // toastOnly = true
      );

      try {
        if (isNewCV) {
          // Save temporary CV to the backend for the first time
          const savedCV = await saveTemporaryCV({ parsed_data: dataToSave });
          // Remove the saving notification and show success
          removeNotification(savingNotificationId);
          showSuccess(
            "Success",
            message || "CV created and saved successfully"
          );
          // Navigate to the saved CV's URL
          navigate(`/cv/${savedCV.id}`, { replace: true });
        } else {
          // Update existing CV
          if (!cvId) return;

          await updateCV(cvId, { parsed_data: dataToSave });

          // Create snapshot for user-initiated changes (when message is provided)
          // or when we can detect actual changes through diff comparison
          let shouldCreateSnapshot = false;

          if (message) {
            // If a message is provided, this is a user-initiated change (add, edit, delete, reorder)
            shouldCreateSnapshot = true;
          } else {
            // For saves without explicit messages, always create snapshot for now
            // Backend diff computation will determine if there are actual changes
            shouldCreateSnapshot = true;
          }

          if (shouldCreateSnapshot) {
            try {
              await createSnapshotOnUserAction(
                cvId,
                dataToSave,
                "manual_save",
                message,
              );
            } catch (error) {
              // Snapshot creation failed
            }
          }

          // Remove the saving notification and show success
          removeNotification(savingNotificationId);
          showSuccess("Success", message || "CV saved successfully");

          // Clear unsaved changes after successful save
          // We'll dispatch a custom event that the context can listen to
          // But skip for skills section auto-saves to prevent edit mode from closing
          const isSkillsAutoSave =
            message &&
            (message.includes("skill added") ||
              message.includes("skill removed") ||
              message.includes("AI suggested skill") ||
              message.includes("All AI suggested skills applied"));

          if (!isSkillsAutoSave) {
            window.dispatchEvent(new CustomEvent("cv-saved"));
          }
        }
      } catch (error: any) {
        // Remove the saving notification
        removeNotification(savingNotificationId);

        const errorMessage =
          error?.message ||
          error?.response?.data?.message ||
          "Failed to save CV";

        // Dispatch error event for validation error handler
        window.dispatchEvent(
          new CustomEvent("cv-save-error", { detail: error }),
        );

        // Check if this is a validation error
        const validationErrors = parseValidationErrors(errorMessage);
        if (validationErrors.length > 0) {
          // For validation errors, show a persistent notification
          showValidationError(
            "Validation Error",
            "Please fix the highlighted fields and try saving again.",
          );
        } else {
          // For other errors, show normal error notification
          showError("Error", errorMessage);
        }
      }
    },
    [
      cvId,
      cvData,
      isNewCV,
      updateCV,
      saveTemporaryCV,
      createSnapshotOnUserAction,
      showInfo,
      showSuccess,
      showError,
      removeNotification,
      navigate,
    ],
  );

  const handleUpdateCV = useCallback(
    (data: CVData) => {
      // Update the local CV state in the store
      if (isNewCV && temporaryCV) {
        // Update temporary CV
        const updatedTemporaryCV = {
          ...temporaryCV,
          parsed_data: data,
        };
        setTemporaryCV(updatedTemporaryCV);
      } else if (currentCV) {
        // Update existing CV
        const updatedCV = {
          ...currentCV,
          parsed_data: data,
        };
        setCurrentCV(updatedCV);
      } else {
      }
    },
    [isNewCV, temporaryCV, currentCV, setCurrentCV, setTemporaryCV],
  );

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


  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cvId || isNewCV) return;

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
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleTitleSave = async (newTitle: string) => {
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
  };

  if (loading && !activeCV) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Typography>Loading CV...</Typography>
      </Box>
    );
  }

  if (!cvData || !activeCV) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Typography>CV not found</Typography>
      </Box>
    );
  }

  return (
    <CVProvider cvId={cvId}>
      <ErrorBoundary>
        <Box
          sx={{
            flexGrow: 1,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <CVEditorProvider
              cvData={cvData}
              onUpdateCV={handleUpdateCV}
              onSave={handleSave}
          >
            <SaveWithValidationErrors onSaveError={() => {}}>
              <InitialValidation>
                <CVEditorContent
                  cvId={cvId}
                  activeCV={activeCV}
                  onLogout={handleLogout}
                  onMenuOpen={handleMenuOpen}
                  onMenuClose={handleMenuClose}
                  anchorEl={anchorEl}
                  onTitleSave={handleTitleSave}
                  onDelete={handleDeleteClick}
                  isAdmin={isAdmin}
                  isNewCV={isNewCV}
                />
              </InitialValidation>
            </SaveWithValidationErrors>
          </CVEditorProvider>
        </Box>

        {/* Notification Toast */}
        <NotificationToast
          onOpenDrawer={() => notificationDrawerRef.current?.openDrawer()}
          cvId={cvId}
        />

        {/* Notification Drawer */}
        <NotificationDrawer ref={notificationDrawerRef} cvId={cvId} />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{ fontWeight: 600, fontSize: "1.25rem", color: "error.main" }}
            >
              Delete CV
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{activeCV?.original_filename}"?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={handleDeleteCancel} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="contained"
              color="error"
              sx={{ borderRadius: 2 }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
    </CVProvider>
  );
};

export default CVEditor;
