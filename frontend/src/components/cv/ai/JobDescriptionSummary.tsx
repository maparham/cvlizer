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

import React, { useState, useCallback, useMemo } from "react";
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
  Tooltip,
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
} from "../../../stores/ai";
import { JobDescription } from "../../../types/ai";
import { useNotifications } from "../../../packages/notifications";
import { useJobDescriptionPolling } from "../../../hooks/useJobDescriptionPolling";
import JobDescriptionsModal from "./job-descriptions-modal";
import JobDescriptionCard from "./JobDescriptionCard";
import { calculateCVCompleteness } from "../../../utils/cvCompleteness";
import CVCompletenessIndicator from "../../CVCompleteness/CVCompletenessIndicator";
import AIEnhancementLoadingState from "./AIEnhancementLoadingState";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import RotatingTips from "./RotatingTips";

interface JobDescriptionSummaryProps {
  cvId: string;
  cvData?: any; // Parsed CV data for completeness checking
  onJobDescriptionSelect?: (jobDescription: JobDescription | null) => void;
  onGenerateSuggestions?: () => void;
  suggestionsLoading?: boolean;
  onAddToCV?: (content: string, sectionType: string) => void;
  countdownSeconds?: number | null;
}

const JobDescriptionSummary: React.FC<JobDescriptionSummaryProps> = ({
  cvId,
  cvData,
  onJobDescriptionSelect,
  onGenerateSuggestions,
  suggestionsLoading = false,
  onAddToCV: _onAddToCV,
  countdownSeconds = null,
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

  const {
    hideJobDescriptionFromSidebar,
    updateJobDescription,
  } = useAIStore();

  // Calculate CV completeness
  const completeness = useMemo(() => {
    if (!cvData) {
      return {
        score: 0,
        isComplete: false,
        missing: ["CV data not available"],
        details: {
          hasWorkExperience: false,
          hasSkills: false,
          skillCount: 0,
          workExpCount: 0,
        },
      };
    }
    return calculateCVCompleteness(cvData);
  }, [cvData]);
  const { showSuccess, showError } = useNotifications();

  const jobDescriptions = useVisibleJobDescriptions();
  const allJobDescriptions = useJobDescriptions();
  const activeJobDescription = useActiveJobDescription();

  // Get AI suggestions to calculate total count
  const { allSuggestions } = useAISuggestionsStore();

  // Calculate total suggestions count (same logic as SectionManagerSidebar)
  const totalSuggestionsCount = useMemo(() => {
    if (!allSuggestions) return 0;
    return (
      (allSuggestions.skills?.technical?.length || 0) +
      (allSuggestions.skills?.soft?.length || 0) +
      (allSuggestions.professional_summary?.suggested_text?.trim() ? 1 : 0) +
      (allSuggestions.work_experience?.filter((s) => s.suggested).length || 0) +
      (allSuggestions.education?.filter((s) => s.suggested).length || 0)
    );
  }, [allSuggestions]);

  // Use the centralized polling hook for job descriptions
  useJobDescriptionPolling(allJobDescriptions, {
    onParsingComplete: () => {
      showSuccess("Job description parsed successfully");
    },
    onParsingError: () => {
      // Error is displayed in the sidebar card - no need for temporary alert
    },
  });

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
                      {suggestionsLoading ? (
                        <AIEnhancementLoadingState />
                      ) : (
                        <Tooltip
                          title={
                            !completeness.isComplete
                              ? `CV needs more content: ${completeness.missing.join(", ")}`
                              : ""
                          }
                          arrow
                        >
                          <Box
                            sx={{
                              width: "100%",
                              position: "relative",
                              padding: "2px",
                              borderRadius: "28px",
                              "--linear-aura-gradient":
                                "linear-gradient(to right in oklch,#f63b35 0%,#f63b35 3%,#1265f0 7%,#477dff 17%,#2caf4f 20%,#72bb44 25%,#ffe523 27%,#ffcc25 30%,#ea4335 33%,#ea4335 45%,#1265f0 49%,#477dff 68%,#34a853 72%,#2caf4f 79%,#ffe523 82%,#ffcc25 87%,#f63b35 90%,#f63b35 100%)",
                              "--emphasized-curve":
                                "linear(0,0.00245 1.753%,0.004 2.29%,0.00994 3.55%,0.01966 4.916%,0.03415 6.402%,0.05334 7.836%,0.07441 9.061%,0.07376 9.061%,0.10031 10.32%,0.12808 11.414%,0.15979 12.444%,0.19399 13.366%,0.23105 14.21%,0.27138 14.974%,0.34474 16.052%,0.34403 16.052%,0.47679 17.475%,0.54434 18.338%,0.60689 19.389%,0.66036 20.609%,0.68967 21.461%,0.71671 22.4%,0.74193 23.444%,0.76532 24.589%,0.78755 25.874%,0.80828 27.285%,0.82719 28.791%,0.84475 30.42%,0.86492 32.632%,0.86558 32.713%,0.8645 32.713%,0.86561 32.715%,0.86856 33.078%,0.88332 35.056%,0.88876 35.862%,0.88763 35.862%,0.88881 35.871%,0.9002 37.721%,0.90085 37.833%,0.90007 37.833%,0.9039 38.373%,0.91554 40.622%,0.9295 43.795%,0.94208 47.239%,0.95333 50.97%,0.96327 54.986%,0.97199 59.335%,0.9795 64.011%,0.9858 69.036%,0.99095 74.434%,0.99492 80.205%,0.99774 86.373%,1)",
                              background:
                                !completeness.isComplete ||
                                suggestionsLoading ||
                                activeJobDescription?.is_parsing ||
                                (countdownSeconds !== null && countdownSeconds > 0)
                                  ? "transparent"
                                  : "var(--linear-aura-gradient)",
                              backgroundSize: "200% 100%",
                              "@keyframes gradientLoop": {
                                "0%": {
                                  backgroundPosition: "0% 50%",
                                },
                                "100%": {
                                  backgroundPosition: "200% 50%",
                                },
                              },
                              animation:
                                !completeness.isComplete ||
                                suggestionsLoading ||
                                activeJobDescription?.is_parsing ||
                                (countdownSeconds !== null && countdownSeconds > 0)
                                  ? "none"
                                  : "gradientLoop 6s linear infinite",
                              "&::before": {
                                content: '""',
                                position: "absolute",
                                top: "2px",
                                left: "2px",
                                right: "2px",
                                bottom: "2px",
                                borderRadius: "26px",
                                backgroundColor: "background.paper",
                                zIndex: 0,
                                pointerEvents: "none",
                              },
                            }}
                          >
                            <Button
                              variant="contained"
                              startIcon={
                                <AutoAwesomeIcon
                                  sx={{
                                    "@keyframes pulse": {
                                      "0%": { transform: "scale(1)" },
                                      "50%": { transform: "scale(1.1)" },
                                      "100%": { transform: "scale(1)" },
                                    },
                                  }}
                                />
                              }
                              onClick={onGenerateSuggestions}
                              disabled={
                                !completeness.isComplete ||
                                suggestionsLoading ||
                                activeJobDescription?.is_parsing ||
                                (countdownSeconds !== null && countdownSeconds > 0)
                              }
                              fullWidth
                              sx={{
                                position: "relative",
                                zIndex: 1,
                                textTransform: "none",
                                backgroundColor: "transparent",
                                color: "#1976d2",
                                border: "none",
                                fontWeight: 600,
                                py: 1.5,
                                px: 2,
                                height: 48,
                                borderRadius: "26px",
                                "&:hover": {
                                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                                  transform: "translateY(-1px)",
                                  boxShadow: 2,
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                                  color: "rgba(0, 0, 0, 0.4)",
                                  opacity: 1,
                                  border: "1px solid rgba(0, 0, 0, 0.12)",
                                  transform: "none",
                                  cursor: "not-allowed",
                                  "&:hover": {
                                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                                    transform: "none",
                                    boxShadow: "none",
                                  },
                                },
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              Enhance CV for this Job
                            </Button>
                          </Box>
                        </Tooltip>
                      )}
                    </>
                  )}

                  {/* Removed secondary icon-only job fit trigger to avoid duplicate button */}

                  {/* Show rotating tips when suggestions exist and not loading */}
                  {!suggestionsLoading && totalSuggestionsCount > 0 && (
                    <RotatingTips variant="sidebar" />
                  )}

                  {/* Show CV completeness indicator below buttons if not complete */}
                  {!completeness.isComplete && (
                    <Box sx={{ mt: 1 }}>
                      <CVCompletenessIndicator
                        completeness={completeness}
                        variant="detailed"
                      />
                    </Box>
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
