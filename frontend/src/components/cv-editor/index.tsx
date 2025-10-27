/**
 * CV Editor Main Component (Orchestrator)
 *
 * This module provides the main CV editing interface where users can modify their CV content.
 * It orchestrates state management, effects, and provider hierarchy.
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
import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { CVEditorProvider } from "../../contexts/CVEditorContext";
import { SaveWithValidationErrors } from "../cv/SaveWithValidationErrors";
import { InitialValidation } from "../cv/InitialValidation";
import { NotificationDrawer, NotificationToast, NotificationDrawerRef } from "../../packages/notifications";
import { ErrorBoundary } from "../common";
import { CVProvider } from "../../contexts/CVContext";
import { useCVStore } from "../../stores/cv";
import { useCVNotifications } from "../../packages/notifications";
import { useAIStore } from "../../stores/ai";
import { CVData } from "../../types";
import { parseValidationErrors } from "../../utils/validationUtils";
import { CVEditorContent } from "./CVEditorContent";
import { CVEditorDialogs } from "./CVEditorDialogs";
import { useCVEditorActions } from "./useCVEditorActions";

// Extend window interface to include switchToAITools function
declare global {
  interface Window {
    switchToAITools?: () => void;
  }
}

const CVEditor: React.FC = () => {
  const { cvId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const notificationDrawerRef = useRef<NotificationDrawerRef>(null);

  const {
    showSuccess,
    showError,
    showValidationError,
    showInfo,
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
    saveTemporaryCV,
    setCurrentCV,
    setTemporaryCV,
    createSnapshotOnUserAction,
  } = useCVStore();

  // Determine if this is a new/temporary CV
  const isNewCV = Boolean(
    cvId === "new" || cvId === undefined || (cvId && cvId.startsWith("temp-")),
  );

  // Get CV data from either current CV or temporary CV
  const activeCV = isNewCV ? temporaryCV : currentCV;
  const cvData = useMemo(() => activeCV?.parsed_data, [activeCV]);

  const { clearCacheForCV } = useAIStore();

  // Track if auto-trigger has already fired to prevent re-renders
  const hasAutoTriggeredRef = useRef(false);

  // Fetch CV data on component mount (only for existing CVs)
  useEffect(() => {
    if (cvId && cvId !== "new" && !cvId.startsWith("temp-")) {
      fetchCV(cvId);
    } else if (isNewCV && !temporaryCV) {
      // If we're on the new CV route but no temporary CV exists, redirect to dashboard
      navigate("/dashboard");
    }
  }, [cvId, isNewCV, temporaryCV, navigate, fetchCV]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]); // Only watch error, not showError to prevent infinite loop

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
    if (location.state?.autoTriggerEnhancements && cvId && location.state?.jobDescriptionId && !hasAutoTriggeredRef.current) {
      // Mark as triggered to prevent re-execution
      hasAutoTriggeredRef.current = true;

      // Clear the location state immediately to prevent re-trigger on refresh
      navigate(location.pathname, {
        replace: true,
        state: {
          openAITools: location.state.openAITools,
          jobDescriptionId: location.state.jobDescriptionId,
          // autoTriggerEnhancements is intentionally omitted to prevent re-trigger
        }
      });

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

  // Use action handlers from custom hook
  const actions = useCVEditorActions(isAdmin, isNewCV, cvId, temporaryCV, currentCV);

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
                    onLogout={actions.handleLogout}
                    onMenuOpen={actions.handleMenuOpen}
                    onMenuClose={actions.handleMenuClose}
                    anchorEl={actions.anchorEl}
                    onTitleSave={actions.handleTitleSave}
                    onDelete={actions.handleDeleteClick}
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
          <CVEditorDialogs
            deleteDialogOpen={actions.deleteDialogOpen}
            onDeleteCancel={actions.handleDeleteCancel}
            onDeleteConfirm={actions.handleDeleteConfirm}
            activeCV={activeCV}
          />
        </Box>
      </ErrorBoundary>
    </CVProvider>
  );
};

export default CVEditor;
