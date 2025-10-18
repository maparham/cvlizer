/**
 * Job Description Summary Component
 *
 * This component provides a compact summary of job descriptions in the sidebar,
 * showing the active job description and a button to open the full management modal.
 *
 * Key responsibilities:
 * - Display active job description summary
 * - Show count of saved job descriptions
 * - Provide button to open full job description modal
 * - Show quick actions for the active job description
 *
 * Usage:
 * - Used in the CV editor sidebar for compact job description display
 * - Requires cvId prop to associate with specific CV
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  Work as WorkIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import {
  useAIStore,
  useVisibleJobDescriptions,
  useJobDescriptions,
  useActiveJobDescription,
} from "../../../stores/aiStore";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { JobDescription } from "../../../types/ai";
import { useNotifications } from "../../../packages/notifications";
import { useJobDescriptionPolling } from "../../../hooks/useJobDescriptionPolling";
import { useAITaskPollingContext } from "../../../contexts/AITaskPollingContext";
import JobDescriptionsModal from "./JobDescriptionsModal";
import JobDescriptionCard from "./JobDescriptionCard";

interface JobDescriptionSummaryProps {
  cvId: string;
  onJobDescriptionSelect?: (jobDescription: JobDescription | null) => void;
  onGenerateSuggestions?: () => void;
  suggestionsLoading?: boolean;
  onAddToCV?: (content: string, sectionType: string) => void;
}

const JobDescriptionSummary: React.FC<JobDescriptionSummaryProps> = ({
  cvId,
  onJobDescriptionSelect,
  onGenerateSuggestions,
  suggestionsLoading = false,
  onAddToCV,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] =
    useState<JobDescription | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    company: "",
    location: "",
    content: "",
  });
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isGeneratingJobFit, setIsGeneratingJobFit] = useState(false);

  const {
    hideJobDescriptionFromSidebar,
    updateJobDescription,
    createJobFitDraft,
  } = useAIStore();
  const { suggestionsError, clearSuggestionsError } = useAISuggestionsStore();
  const { showSuccess, showError } = useNotifications();
  const { addTask, removeTask, activeTasks } = useAITaskPollingContext();

  // Use refs to store notification functions to prevent infinite loops
  const showSuccessRef = useRef(showSuccess);
  const showErrorRef = useRef(showError);
  const removeTaskRef = useRef(removeTask);
  const processedTasksRef = useRef<Set<string>>(new Set());

  // Update refs when functions change
  useEffect(() => {
    showSuccessRef.current = showSuccess;
    showErrorRef.current = showError;
    removeTaskRef.current = removeTask;
  }, [showSuccess, showError, removeTask]);

  const jobDescriptions = useVisibleJobDescriptions();
  const allJobDescriptions = useJobDescriptions();
  const activeJobDescription = useActiveJobDescription();

  // Debug log when component mounts and restore button state from global polling
  useEffect(() => {
    // Check if there's an active generating task for this CV and restore button state
    const hasGeneratingTask = Array.from(activeTasks.values()).some(
      (task) =>
        task.type === "draft" && task.cvId === cvId && task.isGenerating,
    );
    if (hasGeneratingTask && !isGeneratingJobFit) {
      setIsGeneratingJobFit(true);
    }

    // Clear processed tasks when cvId changes
    processedTasksRef.current.clear();
  }, [cvId, activeJobDescription, addTask, activeTasks, isGeneratingJobFit]);

  // Use the centralized polling hook for job descriptions
  useJobDescriptionPolling(allJobDescriptions, {
    onParsingComplete: () => {
      showSuccess("Job description parsed successfully");
    },
    onParsingError: () => {
      // Error is displayed in the sidebar card - no need for temporary alert
    },
  });

  // Monitor active tasks for job fit analysis completion
  useEffect(() => {
    for (const [taskId, task] of activeTasks) {
      if (task.type === "draft" && task.cvId === cvId && !task.isGenerating) {
        // Check if we've already processed this task to prevent duplicate notifications
        if (processedTasksRef.current.has(taskId)) {
          continue;
        }

        // Mark task as processed
        processedTasksRef.current.add(taskId);

        if (task.generationError) {
          showErrorRef.current(
            "Error",
            `Job fit analysis failed: ${task.generationError}`,
          );
          setIsGeneratingJobFit(false);
        } else {
          // Task completed successfully
          showSuccessRef.current(
            "Job fit analysis completed! Please review and approve the draft in the CV editor.",
          );
          setIsGeneratingJobFit(false);

          // Note: No need to reload drafts here - the polling mechanism already updated the draft in the store
          // Calling getCVDrafts here would remove the just-updated draft and replace with potentially stale API data
        }
        removeTaskRef.current(taskId);
      }
    }
  }, [activeTasks, cvId]); // Remove notification functions from dependencies to prevent infinite loops

  const handleJobDescriptionHide = useCallback(
    (jobDescriptionId: string) => {
      hideJobDescriptionFromSidebar(jobDescriptionId);
      showSuccess("Job description removed from sidebar");
    },
    [hideJobDescriptionFromSidebar, showSuccess],
  );

  const handleEditJobDescription = useCallback(
    (jobDescription: JobDescription) => {
      setEditingJobDescription(jobDescription);
      setEditForm({
        title: jobDescription.title || "",
        company: jobDescription.company || "",
        location: jobDescription.location || "",
        content: jobDescription.content,
      });
      setEditDialogOpen(true);
    },
    [],
  );

  const handleEditSubmit = useCallback(async () => {
    if (!editingJobDescription || !editForm.content.trim()) {
      return;
    }

    setIsEditLoading(true);

    try {
      // Update the job description using the proper update API
      await updateJobDescription(editingJobDescription.id, {
        content: editForm.content,
        title: editForm.title || "Manual Job Description",
        company: editForm.company || "Unknown Company",
        location: editForm.location || "Unknown Location",
      });

      setEditDialogOpen(false);
      setEditingJobDescription(null);
      setEditForm({ title: "", company: "", location: "", content: "" });
      showSuccess("Job description updated successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update job description";
      showError("Error", errorMessage);
    } finally {
      setIsEditLoading(false);
    }
  }, [
    editingJobDescription,
    editForm,
    updateJobDescription,
    showSuccess,
    showError,
  ]);

  const handleGenerateJobFit = useCallback(async () => {
    if (!activeJobDescription) {
      showError("Error", "Please select a job description first");
      return;
    }
    setIsGeneratingJobFit(true);
    try {
      // Backend automatically deletes existing why_good_fit draft and store mirrors this
      const response = await createJobFitDraft(cvId, activeJobDescription.id);

      // Add the task to global polling if it's still generating
      if (response.is_generating) {
        const taskToAdd = {
          id: response.id,
          type: "draft" as const,
          cvId: cvId,
          isGenerating: true,
          data: response,
        };
        addTask(taskToAdd);
        showSuccess("Job fit analysis started, generating in background...");
      } else {
        // Task completed immediately
        setIsGeneratingJobFit(false);
        showSuccess("Job fit analysis completed successfully");
      }
    } catch (err) {
      console.error("Error in handleGenerateJobFit:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate job fit analysis";
      showError("Error", errorMessage);
      setIsGeneratingJobFit(false);
    }
  }, [
    activeJobDescription,
    cvId,
    createJobFitDraft,
    showSuccess,
    showError,
    addTask,
  ]);

  return (
    <>
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <WorkIcon />
            Job Description
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setModalOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Manage ({allJobDescriptions.length})
          </Button>
        </Box>

        {jobDescriptions.length === 0 ? (
          <Card
            variant="outlined"
            sx={{
              mb: 2,
              border: "2px dashed #e0e0e0",
              backgroundColor: "rgba(0,0,0,0.02)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "primary.light",
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <WorkIcon
                sx={{
                  fontSize: 64,
                  color: "primary.light",
                  mb: 2,
                  opacity: 0.7,
                }}
              />
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 600, color: "text.primary" }}
              >
                No Job Description Yet
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ mb: 3, maxWidth: 280, mx: "auto" }}
              >
                Add a job description to get personalized AI suggestions and
                enhance your CV
              </Typography>
              <Button
                variant="contained"
                size="medium"
                onClick={() => setModalOpen(true)}
                startIcon={<WorkIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  boxShadow: 2,
                  "&:hover": {
                    boxShadow: 4,
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                Add Job Description
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {/* Active Job Description */}
            {activeJobDescription ? (
              <Box
                sx={{
                  backgroundColor: "transparent",
                  borderRadius: 2,
                  p: 0,
                }}
              >
                <JobDescriptionCard
                  jobDescription={activeJobDescription}
                  isActive={true}
                  onEdit={handleEditJobDescription}
                  onHide={handleJobDescriptionHide}
                  variant="sidebar"
                  maxChipWidth={120}
                />

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  {onGenerateSuggestions && (
                    <>
                      <Button
                        variant="contained"
                        startIcon={
                          suggestionsLoading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <AutoAwesomeIcon
                              sx={{
                                animation: suggestionsLoading
                                  ? "pulse 1.5s ease-in-out infinite"
                                  : "none",
                                "@keyframes pulse": {
                                  "0%": { transform: "scale(1)" },
                                  "50%": { transform: "scale(1.1)" },
                                  "100%": { transform: "scale(1)" },
                                },
                              }}
                            />
                          )
                        }
                        onClick={onGenerateSuggestions}
                        disabled={
                          suggestionsLoading || activeJobDescription?.is_parsing
                        }
                        fullWidth
                        sx={{
                          textTransform: "none",
                          backgroundColor: "transparent",
                          color: "#1976d2",
                          border: "1px solid #1976d2",
                          fontWeight: 600,
                          py: 1.5,
                          px: 2,
                          height: 48,
                          "&:hover": {
                            backgroundColor: "rgba(25, 118, 210, 0.08)",
                            borderColor: "#1565c0",
                            transform: "translateY(-1px)",
                            boxShadow: 2,
                          },
                          "&:disabled": {
                            opacity: 0.7,
                            transform: "none",
                          },
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        {suggestionsLoading
                          ? "Enhancing..."
                          : "Enhance CV for this Job"}
                      </Button>
                      {suggestionsError && (
                        <Alert
                          severity="error"
                          onClose={() => clearSuggestionsError()}
                          sx={{ mt: 1 }}
                        >
                          {suggestionsError}
                        </Alert>
                      )}
                    </>
                  )}

                  {onAddToCV && (
                    <Button
                      variant="outlined"
                      startIcon={
                        isGeneratingJobFit ? (
                          <CircularProgress size={16} />
                        ) : (
                          <AutoAwesomeIcon
                            sx={{
                              animation: isGeneratingJobFit
                                ? "pulse 1.5s ease-in-out infinite"
                                : "none",
                              "@keyframes pulse": {
                                "0%": { transform: "scale(1)" },
                                "50%": { transform: "scale(1.1)" },
                                "100%": { transform: "scale(1)" },
                              },
                            }}
                          />
                        )
                      }
                      onClick={handleGenerateJobFit}
                      disabled={
                        isGeneratingJobFit || activeJobDescription?.is_parsing
                      }
                      fullWidth
                      sx={{
                        textTransform: "none",
                        backgroundColor: "transparent",
                        color: "#1976d2",
                        border: "1px solid #1976d2",
                        fontWeight: 600,
                        py: 1.5,
                        px: 2,
                        height: 48,
                        "&:hover": {
                          backgroundColor: "rgba(25, 118, 210, 0.08)",
                          borderColor: "#1565c0",
                          transform: "translateY(-1px)",
                          boxShadow: 2,
                        },
                        "&:disabled": {
                          opacity: 0.7,
                          transform: "none",
                        },
                        transition: "all 0.2s ease-in-out",
                      }}
                    >
                      {isGeneratingJobFit
                        ? "Generating..."
                        : "Generate Job Fit Section"}
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  border: "1px dashed #e0e0e0",
                  backgroundColor: "rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.light",
                    backgroundColor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
              >
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <WorkIcon
                    sx={{
                      fontSize: 48,
                      color: "text.secondary",
                      mb: 1.5,
                      opacity: 0.6,
                    }}
                  />
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
                    No job description selected
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setModalOpen(true)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                      "&:hover": {
                        backgroundColor: "primary.light",
                        borderColor: "primary.main",
                        color: "primary.contrastText",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    Select Job Description
                  </Button>
                </CardContent>
              </Card>
            )}
          </Stack>
        )}
      </Box>

      <JobDescriptionsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cvId={cvId}
        onJobDescriptionSelect={onJobDescriptionSelect}
      />

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Job Description</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Job Title"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, title: e.target.value }))
              }
              fullWidth
              disabled={isEditLoading}
            />
            <TextField
              label="Company"
              value={editForm.company}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, company: e.target.value }))
              }
              fullWidth
              disabled={isEditLoading}
            />
            <TextField
              label="Location"
              value={editForm.location}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, location: e.target.value }))
              }
              fullWidth
              disabled={isEditLoading}
            />
            <TextField
              label="Job Description"
              value={editForm.content}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, content: e.target.value }))
              }
              multiline
              rows={8}
              fullWidth
              disabled={isEditLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditDialogOpen(false)}
            disabled={isEditLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isEditLoading || !editForm.content.trim()}
            startIcon={
              isEditLoading ? <CircularProgress size={20} /> : <CheckIcon />
            }
          >
            {isEditLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobDescriptionSummary;
