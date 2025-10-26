/**
 * ATS Optimization Component
 *
 * This component provides comprehensive ATS (Applicant Tracking System) optimization
 * functionality including keyword analysis, density optimization, and compatibility scoring.
 * It helps users optimize their CVs for better ATS performance.
 *
 * Key responsibilities:
 * - Display ATS compatibility score with visual indicators
 * - Show missing keywords with importance ratings
 * - Analyze keyword density and suggest optimizations
 * - Provide section-specific optimization suggestions
 * - Allow one-click keyword integration
 * - Track optimization history and improvements
 *
 * Usage:
 * - Used in CV editor as a dedicated optimization panel
 * - Requires cvId and jobDescriptionId props
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback } from "react";
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
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import {
  useAIStore,
  useATSOptimization,
  useActiveJobDescription,
} from "../../../stores/ai";
import { MissingKeyword } from "../../../types/ai";
import { useNotifications } from "../../../packages/notifications";

interface ATSOptimizationProps {
  cvId: string;
  onKeywordAdd?: (keyword: string, section: string) => void;
  className?: string;
}

const ATSOptimization: React.FC<ATSOptimizationProps> = ({
  cvId,
  onKeywordAdd,
  className,
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<MissingKeyword | null>(
    null,
  );
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);

  const { showSuccess, showError } = useNotifications();
  const { analyzeATSOptimization, clearATSOptimization } = useAIStore();

  const atsOptimization = useATSOptimization();
  const activeJobDescription = useActiveJobDescription();

  const handleAnalyze = useCallback(async () => {
    if (!activeJobDescription) {
      showError("Error", "Please select a job description first");
      return;
    }

    setIsOptimizing(true);
    try {
      await analyzeATSOptimization(cvId, activeJobDescription.id);
      showSuccess("ATS optimization analysis completed");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to analyze ATS optimization";
      showError("Error", errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  }, [
    cvId,
    activeJobDescription,
    analyzeATSOptimization,
    showSuccess,
    showError,
  ]);

  const handleRegenerate = useCallback(() => {
    clearATSOptimization();
    handleAnalyze();
  }, [clearATSOptimization, handleAnalyze]);

  const handleAddKeyword = useCallback((keyword: MissingKeyword) => {
    setSelectedKeyword(keyword);
    setShowKeywordDialog(true);
  }, []);

  const handleConfirmAddKeyword = useCallback(() => {
    if (selectedKeyword && onKeywordAdd) {
      onKeywordAdd(
        selectedKeyword.keyword,
        selectedKeyword.suggested_placement,
      );
      showSuccess(
        `Added "${selectedKeyword.keyword}" to ${selectedKeyword.suggested_placement}`,
      );
    }
    setShowKeywordDialog(false);
    setSelectedKeyword(null);
  }, [selectedKeyword, onKeywordAdd, showSuccess]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  if (!activeJobDescription) {
    return (
      <Box className={className}>
        <Alert severity="info">
          Please select a job description to analyze ATS optimization.
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
          <Typography variant="h6">ATS Optimization</Typography>
          <Tooltip
            title={
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  ATS Analysis covers:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  <li>Keyword matching between CV and job description</li>
                  <li>Missing important keywords and where to add them</li>
                  <li>Industry-specific terminology usage</li>
                  <li>Content completeness and organization</li>
                  <li>Keyword placement within sections</li>
                </ul>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 1, fontStyle: "italic" }}
                >
                  Note: Analyzes content only, not PDF formatting
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
        {atsOptimization.lastAnalysis && (
          <Tooltip title="Regenerate Analysis">
            <span>
              <IconButton onClick={handleRegenerate} disabled={isOptimizing}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {atsOptimization.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {atsOptimization.error}
        </Alert>
      )}

      {!atsOptimization.lastAnalysis ? (
        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 2,
            "&:hover": {
              boxShadow: 4,
              transform: "translateY(-1px)"
            },
            transition: "all 0.3s ease-in-out"
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" py={2}>
              <SearchIcon sx={{
                fontSize: 64,
                color: "primary.main",
                mb: 3,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
              }} />
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  letterSpacing: "-0.025em",
                  mb: 2
                }}
              >
                Optimize for ATS
              </Typography>
              <Typography
                color="text.secondary"
                paragraph
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: 1.6,
                  maxWidth: 500,
                  mx: "auto",
                  mb: 4
                }}
              >
                Analyze your CV content for keyword optimization and ATS
                compatibility. This focuses on content and keywords, not
                formatting.
              </Typography>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={isOptimizing || atsOptimization.isAnalyzing}
                startIcon={
                  isOptimizing || atsOptimization.isAnalyzing ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SearchIcon />
                  )
                }
                size="large"
                sx={{
                  fontWeight: 600,
                  textTransform: "none",
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: 3,
                  "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-1px)"
                  },
                  "&:disabled": {
                    backgroundColor: "action.disabled",
                    color: "action.disabled"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                {isOptimizing || atsOptimization.isAnalyzing
                  ? "Analyzing..."
                  : "Analyze ATS Compatibility"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {/* ATS Score */}
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">
                  ATS Keyword Optimization Score
                </Typography>
                <Chip
                  label={`${atsOptimization.lastAnalysis.ats_score}%`}
                  color={getScoreColor(atsOptimization.lastAnalysis.ats_score)}
                  variant="filled"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {getScoreLabel(atsOptimization.lastAnalysis.ats_score)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mb: 1 }}
              >
                Measures keyword matching and content optimization (not
                formatting - that happens during PDF export)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={atsOptimization.lastAnalysis.ats_score}
                color={getScoreColor(atsOptimization.lastAnalysis.ats_score)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>

          {/* Missing Keywords */}
          {atsOptimization.lastAnalysis.missing_keywords &&
            atsOptimization.lastAnalysis.missing_keywords.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    <WarningIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                    Missing Keywords
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    These important keywords from the job description are
                    missing from your CV:
                  </Typography>
                  <Stack spacing={1}>
                    {atsOptimization.lastAnalysis.missing_keywords.map(
                      (keyword, index) => (
                        <Box
                          key={index}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          p={1}
                          border={1}
                          borderColor="divider"
                          borderRadius={1}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={keyword.keyword}
                              color={getImportanceColor(keyword.importance)}
                              size="small"
                            />
                            <Typography variant="body2" color="text.secondary">
                              {keyword.importance} importance •{" "}
                              {keyword.frequency_in_jd} mentions
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color="text.secondary">
                              Add to: {keyword.suggested_placement}
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => handleAddKeyword(keyword)}
                            >
                              Add
                            </Button>
                          </Box>
                        </Box>
                      ),
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

          {/* Keyword Analysis */}
          {atsOptimization.lastAnalysis.keyword_analysis &&
            Object.keys(atsOptimization.lastAnalysis.keyword_analysis).length >
              0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Keyword Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Analysis of important keywords from the job description:
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(
                      atsOptimization.lastAnalysis.keyword_analysis,
                    ).map(([keyword, analysis]) => (
                      <Box
                        key={keyword}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        p={1}
                        border={1}
                        borderColor="divider"
                        borderRadius={1}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={keyword}
                            color={analysis.present ? "success" : "warning"}
                            size="small"
                          />
                          <Typography variant="body2" color="text.secondary">
                            {analysis.present ? "Present" : "Missing"}
                            {analysis.frequency &&
                              ` • ${analysis.frequency} mentions`}
                          </Typography>
                        </Box>
                        {analysis.suggested_sections && (
                          <Typography variant="body2" color="text.secondary">
                            Add to: {analysis.suggested_sections.join(", ")}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

          {/* Optimization Suggestions */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Optimization Suggestions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {atsOptimization.lastAnalysis.suggestions &&
                  atsOptimization.lastAnalysis.suggestions.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        General Recommendations
                      </Typography>
                      <List dense>
                        {atsOptimization.lastAnalysis.suggestions.map(
                          (suggestion, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <TrendingUpIcon color="info" />
                              </ListItemIcon>
                              <ListItemText primary={suggestion} />
                            </ListItem>
                          ),
                        )}
                      </List>
                    </Box>
                  )}

                {atsOptimization.lastAnalysis.content_optimization &&
                  atsOptimization.lastAnalysis.content_optimization.length >
                    0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Content Optimization
                      </Typography>
                      {atsOptimization.lastAnalysis.content_optimization.map(
                        (section, index) => (
                          <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom>
                                {section.section
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </Typography>
                              <Typography variant="body2" paragraph>
                                {section.suggestion}
                              </Typography>
                              <Box display="flex" gap={1} flexWrap="wrap">
                                <Typography variant="body2" fontWeight="medium">
                                  Missing keywords:
                                </Typography>
                                {section.missing_keywords.map(
                                  (keyword, kwIndex) => (
                                    <Chip
                                      key={kwIndex}
                                      label={keyword}
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                    />
                                  ),
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        ),
                      )}
                    </Box>
                  )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Strengths and Weaknesses */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Analysis Summary</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {atsOptimization.lastAnalysis.strengths &&
                  atsOptimization.lastAnalysis.strengths.length > 0 && (
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
                        {atsOptimization.lastAnalysis.strengths.map(
                          (strength, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={strength} />
                            </ListItem>
                          ),
                        )}
                      </List>
                    </Box>
                  )}

                {atsOptimization.lastAnalysis.weaknesses &&
                  atsOptimization.lastAnalysis.weaknesses.length > 0 && (
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
                        {atsOptimization.lastAnalysis.weaknesses.map(
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
        </Stack>
      )}

      {/* Add Keyword Dialog */}
      <Dialog
        open={showKeywordDialog}
        onClose={() => setShowKeywordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Keyword to CV</DialogTitle>
        <DialogContent>
          {selectedKeyword && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body1">
                Add the keyword <strong>"{selectedKeyword.keyword}"</strong> to
                your CV.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Suggested placement:{" "}
                <strong>{selectedKeyword.suggested_placement}</strong>
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary">
                  Importance:
                </Typography>
                <Chip
                  label={selectedKeyword.importance}
                  color={getImportanceColor(selectedKeyword.importance)}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  • Frequency in job description:{" "}
                  {selectedKeyword.frequency_in_jd}
                </Typography>
              </Box>
              {selectedKeyword.suggested_placement.includes(
                "professional_summary",
              ) ||
              selectedKeyword.suggested_placement.includes(
                "professional summary",
              ) ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> For professional summary, the keyword
                    will be integrated naturally into your existing content. You
                    may want to review and refine the result after adding.
                  </Typography>
                </Alert>
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowKeywordDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAddKeyword}
            variant="contained"
            startIcon={<AddIcon />}
          >
            Add Keyword
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ATSOptimization;
