/**
 * Job Fit Analysis Component
 *
 * This component displays job fit analysis results including confidence scoring,
 * key matches identification, and detailed fit analysis.
 *
 * Key responsibilities:
 * - Show generated "Why I'm a Good Fit" section with confidence score
 * - Display key match points as bullet list
 * - Show missing skills and suggested improvements
 * - Note: Generation is now triggered by the unified "AI Suggestions" button
 *
 * Usage:
 * - Used in CV editor sidebar to display job fit results
 * - Requires cvId and jobDescriptionId props
 * - Integrates with AI store for state management
 */

import React, { useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
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
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import {
  useJobFitAnalysis,
  useActiveJobDescription,
} from "../../../stores/ai";
import { useNotifications } from "../../../packages/notifications";
import { calculateCVCompleteness } from "../../../utils/cvCompleteness";

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
  onAddToCV: _onAddToCV,
  className,
  existingWhyGoodFit: _existingWhyGoodFit,
}) => {
  const { showSuccess } = useNotifications();

  // Calculate CV completeness
  const _completeness = useMemo(() => {
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

  const jobFitAnalysis = useJobFitAnalysis();
  const activeJobDescription = useActiveJobDescription(cvId);

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
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
        {/* Regeneration now handled by unified "AI Suggestions" button */}
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
                Use the "Enhance CV for this Job" button above to generate an AI-powered "Why I'm a Good Fit" section that highlights your strengths and matches for this role.
              </Typography>
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
                  onClick={() => {
                    navigator.clipboard.writeText(jobFitAnalysis.lastAnalysis!.fit_analysis);
                    showSuccess("Copied to clipboard");
                  }}
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

      {/* Dialog removed - overwrite handling now managed by unified AI Suggestions flow */}
    </Box>
  );
};

export default JobFitAnalysis;
