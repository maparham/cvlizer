/**
 * Job Fit Analysis Component
 *
 * This component provides comprehensive job fit analysis functionality including
 * confidence scoring, key matches identification, and detailed fit analysis.
 * It integrates with the AI store to analyze how well a CV matches a job description.
 *
 * Key responsibilities:
 * - Display "Generate Job Fit" button with loading states
 * - Show generated "Why I'm a Good Fit" section with confidence score
 * - Display key match points as bullet list
 * - Show missing skills and suggested improvements
 * - Allow regeneration with different job descriptions
 * - Integrate with CV sections for adding content
 *
 * Usage:
 * - Used in CV editor sidebar or as a dedicated analysis panel
 * - Requires cvId and jobDescriptionId props
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import {
  useAIStore,
  useJobFitAnalysis,
  useActiveJobDescription,
} from "../../../stores/aiStore";
import { useNotifications } from "../../../packages/notifications";
import { useAITaskPollingContext } from "../../../contexts/AITaskPollingContext";
import { calculateCVCompleteness } from "../../../utils/cvCompleteness";
import CVCompletenessIndicator from "../../CVCompleteness/CVCompletenessIndicator";

interface JobFitAnalysisProps {
  cvId: string;
  cvData?: any; // Parsed CV data for completeness checking
  onAddToCV?: (content: string, sectionType: string) => void;
  className?: string;
  existingWhyGoodFit?: unknown; // Current why_good_fit section data if it exists
}

const JobFitAnalysis: React.FC<JobFitAnalysisProps> = ({
  cvId,
  cvData,
  onAddToCV,
  className,
  existingWhyGoodFit,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingAnalysisResult, setPendingAnalysisResult] =
    useState<unknown>(null);

  const { showSuccess, showError } = useNotifications();
  const { analyzeJobFit, clearJobFitAnalysis } = useAIStore();

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

  // Use global AI task polling for job fit analysis
  const { addTask, removeTask, activeTasks } = useAITaskPollingContext();

  const jobFitAnalysis = useJobFitAnalysis();
  const activeJobDescription = useActiveJobDescription();

  // Monitor active tasks for job fit analysis completion
  useEffect(() => {
    for (const [taskId, task] of activeTasks) {
      if (task.type === "draft" && task.cvId === cvId && !task.isGenerating) {
        if (task.generationError) {
          showError(
            "Error",
            `Job fit analysis failed: ${task.generationError}`,
          );
          setIsGenerating(false);
        } else {
          // Task completed successfully - handle based on whether section exists
          if (
            existingWhyGoodFit &&
            (existingWhyGoodFit as { content?: string }).content
          ) {
            // Section exists, show overwrite dialog
            setPendingAnalysisResult(task.data);
            setShowOverwriteDialog(true);
            setIsGenerating(false);
          } else if (task.data && onAddToCV && "draft_data" in task.data) {
            // No existing section, add directly
            const draftData = task.data.draft_data || {};
            const whyGoodFitData = {
              content: draftData.fit_analysis || "",
              confidence_score: draftData.confidence_score || 0,
              key_matches: draftData.key_matches || [],
              generated_at: new Date().toISOString(),
              job_description_id: activeJobDescription?.id,
            };

            onAddToCV(JSON.stringify(whyGoodFitData), "why_good_fit");
            showSuccess("Job fit section generated and added to CV");
            setIsGenerating(false);
          } else {
            showSuccess("Job fit analysis completed successfully");
            setIsGenerating(false);
          }
        }
        removeTask(taskId);
      }
    }
  }, [
    activeTasks,
    cvId,
    showSuccess,
    showError,
    removeTask,
    onAddToCV,
    activeJobDescription,
    existingWhyGoodFit,
  ]);

  const handleAnalyze = useCallback(async () => {
    if (!activeJobDescription) {
      showError("Error", "Please select a job description first");
      return;
    }

    // Check CV completeness before attempting to generate
    if (!completeness.isComplete) {
      showError(
        "CV Incomplete",
        `Your CV needs more content before generating job fit analysis. Please add: ${completeness.missing.join(", ")}`
      );
      return;
    }

    setIsGenerating(true);
    try {
      const analysisResult = await analyzeJobFit(cvId, activeJobDescription.id);

      // Add the task to polling if it's still generating
      if (analysisResult.is_generating) {
        addTask({
          id: analysisResult.id,
          type: "draft",
          cvId: cvId,
          isGenerating: true,
          data: analysisResult,
        });
      } else {
        // Task completed immediately
        setIsGenerating(false);
      }

      // If task completed immediately (not generating), handle it now
      if (!analysisResult.is_generating) {
        // Check if section already exists
        if (
          existingWhyGoodFit &&
          (existingWhyGoodFit as { content?: string }).content
        ) {
          // Store the analysis result and show confirmation dialog
          setPendingAnalysisResult(analysisResult);
          setShowOverwriteDialog(true);
          setIsGenerating(false);
          return;
        }

        // No existing content, add directly
        if (onAddToCV && analysisResult && "draft_data" in analysisResult) {
          const draftData = analysisResult.draft_data || {};
          const whyGoodFitData = {
            content: draftData.fit_analysis || "",
            confidence_score: draftData.confidence_score || 0,
            key_matches: draftData.key_matches || [],
            generated_at: new Date().toISOString(),
            job_description_id: activeJobDescription.id,
          };

          onAddToCV(JSON.stringify(whyGoodFitData), "why_good_fit");
          showSuccess("Job fit section generated and added to CV");
        } else {
          showSuccess("Job fit section generated successfully");
        }
        setIsGenerating(false);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to analyze job fit";
      showError("Error", errorMessage);
      setIsGenerating(false);
    }
  }, [
    cvId,
    activeJobDescription,
    analyzeJobFit,
    onAddToCV,
    existingWhyGoodFit,
    showSuccess,
    showError,
    addTask,
    completeness.isComplete,
    completeness.missing,
  ]);

  const handleRegenerate = useCallback(() => {
    clearJobFitAnalysis();
    handleAnalyze();
  }, [clearJobFitAnalysis, handleAnalyze]);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard");
    },
    [showSuccess],
  );

  const handleConfirmOverwrite = useCallback(() => {
    if (
      onAddToCV &&
      pendingAnalysisResult &&
      typeof pendingAnalysisResult === "object" &&
      pendingAnalysisResult !== null &&
      "fit_analysis" in pendingAnalysisResult
    ) {
      const analysis = pendingAnalysisResult as {
        fit_analysis: string;
        confidence_score: number;
        key_matches: string[];
      };
      const whyGoodFitData = {
        content: analysis.fit_analysis,
        confidence_score: analysis.confidence_score,
        key_matches: analysis.key_matches,
        generated_at: new Date().toISOString(),
        job_description_id: activeJobDescription?.id,
      };

      onAddToCV(JSON.stringify(whyGoodFitData), "why_good_fit");
      showSuccess("Job fit section updated in CV");
    }
    setShowOverwriteDialog(false);
    setPendingAnalysisResult(null);
  }, [onAddToCV, pendingAnalysisResult, activeJobDescription, showSuccess]);

  const handleCancelOverwrite = useCallback(() => {
    setShowOverwriteDialog(false);
    setPendingAnalysisResult(null);
  }, []);

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Poor Match";
  };

  if (!activeJobDescription) {
    return (
      <Box className={className}>
        <Alert severity="info">
          Please select a job description to analyze job fit.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={className}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Job Fit Analysis</Typography>
          <Tooltip
            title={
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Job Fit Analysis will:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  <li>Generate a "Why I'm a Good Fit" section for your CV</li>
                  <li>
                    Provide honest confidence score (1-100%) for role match
                  </li>
                  <li>
                    Identify key matches between your CV and job requirements
                  </li>
                  <li>Highlight missing skills and suggested improvements</li>
                  <li>
                    Always create positive content that defends your candidacy
                  </li>
                </ul>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 1, fontStyle: "italic" }}
                >
                  Note: Creates a new CV section while providing honest
                  assessment
                </Typography>
              </Box>
            }
            arrow
            placement="top"
          >
            <IconButton size="small" color="primary">
              <HelpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {jobFitAnalysis.lastAnalysis && (
          <Tooltip title="Regenerate Analysis">
            <span>
              <IconButton onClick={handleRegenerate} disabled={isGenerating}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {jobFitAnalysis.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {jobFitAnalysis.error}
        </Alert>
      )}

      {!jobFitAnalysis.lastAnalysis ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={2}>
              <AutoAwesomeIcon
                sx={{ fontSize: 48, color: "primary.main", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                Generate Job Fit Section
              </Typography>
              <Typography color="text.secondary" paragraph>
                Create an AI-powered "Why I'm a Good Fit" section that
                highlights your strengths and matches for this role.
              </Typography>

              {/* Show CV completeness indicator if not complete */}
              {!completeness.isComplete && (
                <Box sx={{ mb: 2, textAlign: "left" }}>
                  <CVCompletenessIndicator
                    completeness={completeness}
                    variant="detailed"
                  />
                </Box>
              )}

              <Tooltip
                title={
                  !completeness.isComplete
                    ? `CV needs more content: ${completeness.missing.join(", ")}`
                    : ""
                }
                arrow
              >
                <span>
                  <Button
                    variant="contained"
                    onClick={handleAnalyze}
                    disabled={
                      !completeness.isComplete ||
                      isGenerating ||
                      jobFitAnalysis.isAnalyzing
                    }
                    startIcon={
                      isGenerating || jobFitAnalysis.isAnalyzing ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AutoAwesomeIcon />
                      )
                    }
                    size="large"
                  >
                    {isGenerating || jobFitAnalysis.isAnalyzing
                      ? "Generating..."
                      : "Generate Job Fit Section"}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {/* Confidence Score */}
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">Match Confidence</Typography>
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Match Confidence measures:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: "16px" }}>
                          <li>Skills alignment with job requirements</li>
                          <li>Experience level match</li>
                          <li>Industry relevance and background fit</li>
                          <li>Education and certifications alignment</li>
                          <li>Overall candidate suitability for the role</li>
                        </ul>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", mt: 1, fontStyle: "italic" }}
                        >
                          Note: Honest assessment of how well you match the role
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                  >
                    <IconButton size="small" color="primary">
                      <HelpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Chip
                  label={`${jobFitAnalysis.lastAnalysis.confidence_score}%`}
                  color={getConfidenceColor(
                    jobFitAnalysis.lastAnalysis.confidence_score,
                  )}
                  variant="filled"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {getConfidenceLabel(
                  jobFitAnalysis.lastAnalysis.confidence_score,
                )}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={jobFitAnalysis.lastAnalysis.confidence_score}
                color={getConfidenceColor(
                  jobFitAnalysis.lastAnalysis.confidence_score,
                )}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>

          {/* Analysis Summary */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis Complete
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The "Why I'm a Good Fit" section has been generated and added to
                your CV. You can edit or delete it directly from the CV view.
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={() =>
                    copyToClipboard(jobFitAnalysis.lastAnalysis!.fit_analysis)
                  }
                >
                  Copy Content
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Key Matches */}
          {jobFitAnalysis.lastAnalysis.key_matches.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Matches
                </Typography>
                <List dense>
                  {jobFitAnalysis.lastAnalysis.key_matches.map(
                    (match, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary={match} />
                      </ListItem>
                    ),
                  )}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Strengths and Weaknesses */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Detailed Analysis</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {jobFitAnalysis.lastAnalysis.strengths.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      color="success.main"
                      gutterBottom
                    >
                      <CheckCircleIcon
                        sx={{ verticalAlign: "middle", mr: 1 }}
                      />
                      Strengths
                    </Typography>
                    <List dense>
                      {jobFitAnalysis.lastAnalysis.strengths.map(
                        (strength, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={strength} />
                          </ListItem>
                        ),
                      )}
                    </List>
                  </Box>
                )}

                {jobFitAnalysis.lastAnalysis.weaknesses.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      color="warning.main"
                      gutterBottom
                    >
                      <WarningIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      Areas for Improvement
                    </Typography>
                    <List dense>
                      {jobFitAnalysis.lastAnalysis.weaknesses.map(
                        (weakness, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={weakness} />
                          </ListItem>
                        ),
                      )}
                    </List>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Missing Skills */}
          {jobFitAnalysis.lastAnalysis.missing_skills.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  <WarningIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                  Missing Skills
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  These skills are mentioned in the job description but not
                  found in your CV:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {jobFitAnalysis.lastAnalysis.missing_skills.map(
                    (skill, index) => (
                      <Chip
                        key={index}
                        label={skill}
                        color="warning"
                        variant="outlined"
                      />
                    ),
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Suggested Improvements */}
          {jobFitAnalysis.lastAnalysis.suggested_improvements.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="info.main">
                  <InfoIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                  Suggested Improvements
                </Typography>
                <List dense>
                  {jobFitAnalysis.lastAnalysis.suggested_improvements.map(
                    (improvement, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <TrendingUpIcon color="info" />
                        </ListItemIcon>
                        <ListItemText primary={improvement} />
                      </ListItem>
                    ),
                  )}
                </List>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* Overwrite Confirmation Dialog */}
      <Dialog
        open={showOverwriteDialog}
        onClose={handleCancelOverwrite}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Replace Existing "Why I'm a Good Fit" Section?
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            A "Why I'm a Good Fit" section already exists in your CV. The new
            analysis will replace the existing content.
          </Typography>

          {existingWhyGoodFit &&
          (existingWhyGoodFit as { content?: string }).content ? (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Current Content:
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "grey.300",
                  maxHeight: "200px",
                  overflow: "auto",
                  "& h1, & h2, & h3, & h4, & h5, & h6": {
                    marginTop: 1,
                    marginBottom: 0.5,
                    fontWeight: 600,
                  },
                  "& p": {
                    marginBottom: 1,
                  },
                  "& ul, & ol": {
                    marginBottom: 1,
                    paddingLeft: 2,
                  },
                  "& li": {
                    marginBottom: 0.25,
                  },
                  "& strong": {
                    fontWeight: 600,
                  },
                  "& em": {
                    fontStyle: "italic",
                  },
                }}
              >
                <ReactMarkdown>
                  {(existingWhyGoodFit as { content?: string }).content || ""}
                </ReactMarkdown>
              </Box>
            </Box>
          ) : null}

          {pendingAnalysisResult &&
          (pendingAnalysisResult as { content?: string }).content ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                New Content:
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "primary.50",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "primary.300",
                  maxHeight: "200px",
                  overflow: "auto",
                  "& h1, & h2, & h3, & h4, & h5, & h6": {
                    marginTop: 1,
                    marginBottom: 0.5,
                    fontWeight: 600,
                  },
                  "& p": {
                    marginBottom: 1,
                  },
                  "& ul, & ol": {
                    marginBottom: 1,
                    paddingLeft: 2,
                  },
                  "& li": {
                    marginBottom: 0.25,
                  },
                  "& strong": {
                    fontWeight: 600,
                  },
                  "& em": {
                    fontStyle: "italic",
                  },
                }}
              >
                <ReactMarkdown>
                  {(pendingAnalysisResult as { fit_analysis?: string })
                    .fit_analysis || ""}
                </ReactMarkdown>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelOverwrite}>Cancel</Button>
          <Button
            onClick={handleConfirmOverwrite}
            variant="contained"
            color="primary"
          >
            Replace Content
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobFitAnalysis;
