/**
 * Quick Start Wizard Component
 *
 * Multi-step wizard for quickly trying the CV optimization service.
 * Allows users to upload a CV and provide a job description (URL or text)
 * in one view, see parsed previews, then proceed to full optimization.
 *
 * Key features:
 * - Combined CV upload + JD input in one view
 * - Toggle between URL/text input for job description
 * - Loading state during parsing
 * - Preview cards for parsed data
 * - Error handling with retry option
 */

import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  LinearProgress,
  Alert,
  Grid,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  Description as DocumentIcon,
  Work as WorkIcon,
  Link as LinkIcon,
  TextFields as TextIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useClerk } from "@clerk/clerk-react";
import { useAuth } from "../../contexts/AuthContext";
import { submitQuickStartPreview } from "../../services/quickStartService";
import { QuickStartPreviewResponse } from "../../types/quickStart";
import MarkdownRenderer from "../common/MarkdownRenderer";

interface QuickStartWizardProps {
  onComplete: (data: {
    cvFile?: File;
    jobUrl?: string;
    jobText?: string;
    previewResponse: QuickStartPreviewResponse;
  }) => void;
}

type JobInputType = "url" | "text";

const QuickStartWizard: React.FC<QuickStartWizardProps> = ({ onComplete }) => {
  const { isAuthenticated } = useAuth();
  const { openSignUp, openSignIn } = useClerk();

  // Form state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobInputType, setJobInputType] = useState<JobInputType>("url");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Processing state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewResponse, setPreviewResponse] =
    useState<QuickStartPreviewResponse | null>(null);

  // CV preview dialog state
  const [cvPreviewDialogOpen, setCvPreviewDialogOpen] = useState(false);



  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size cannot exceed 10MB");
      return;
    }

    setCvFile(file);
    setError(null);
  };

  const handleRemoveFile = () => {
    setCvFile(null);
  };

  const handleSubmit = async () => {
    const jobInput = jobInputType === "url" ? jobUrl.trim() : jobText.trim();

    // Require at least one field: CV file OR job description
    if (!cvFile && !jobInput) {
      setError("Please upload a CV file or provide a job description");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await submitQuickStartPreview(
        cvFile || undefined,
        jobInputType === "url" ? jobUrl : undefined,
        jobInputType === "text" ? jobText : undefined
      );

      setPreviewResponse(response);

      // Only call onComplete if parsing was successful (no errors and has data)
      const hasCvError = Boolean(response.cv_preview?.error);
      const hasJobError = Boolean(response.job_preview?.error);

      // Check if we actually got valid data (not just error responses)
      const hasCvData = response.cv_preview && !hasCvError;
      const hasJobData = response.job_preview && !hasJobError && Object.keys(response.job_preview).length > 0;

      // Only proceed if we have at least one valid result
      if (hasCvData || hasJobData) {
        // Call onComplete with all the data
        onComplete({
          cvFile: cvFile || undefined,
          jobUrl: jobInputType === "url" ? jobUrl : undefined,
          jobText: jobInputType === "text" ? jobText : undefined,
          previewResponse: response,
        });
      } else {
        // All parsing failed - show error to user
        const errors = [];
        if (hasCvError) errors.push(response.cv_preview?.error || "CV parsing failed");
        if (hasJobError) errors.push(response.job_preview?.error || "Job parsing failed");
        setError(errors.join("; ") || "Parsing failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setCvFile(null);
    setJobUrl("");
    setJobText("");
    setPreviewResponse(null);
    setError(null);
  };

  // Show preview if we have results
  if (previewResponse) {
    const { cv_preview, job_preview, success } = previewResponse;

    // Detect if there are any validation errors
    const hasAnyError = Boolean(cv_preview?.error || job_preview?.error);

    return (
      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        <Card elevation={3}>
          <CardContent>
            {!success && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <ErrorIcon sx={{ color: "warning.main", mr: 1 }} />
                <Typography variant="h5">
                  Partial Results
                </Typography>
              </Box>
            )}

            {!success && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                {previewResponse.message}
              </Alert>
            )}

            {/* Action Buttons - only show if no errors exist */}
            {!hasAnyError && (
              <Box sx={{ display: "flex", gap: 2, mb: 3, flexDirection: "column" }}>
                {!isAuthenticated ? (
                  <>
                    <Typography variant="body1" sx={{ mb: 2, textAlign: "center" }}>
                      Create a free account to save your data and get AI-powered suggestions.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => openSignUp()}
                      >
                        Create Account
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => openSignIn()}
                      >
                        Existing User? Sign In
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Typography variant="body1" sx={{ textAlign: "center" }}>
                    Your data is ready. Continue to optimization.
                  </Typography>
                )}
              </Box>
            )}

            <Grid container spacing={3}>
              {/* CV Preview - only show if CV data exists */}
              {cv_preview && Object.keys(cv_preview).length > 0 && (
                <Grid item xs={12} md={job_preview && Object.keys(job_preview).length > 0 ? 6 : 12}>
                  <Paper sx={{ p: 2, height: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <DocumentIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6">CV Preview</Typography>
                    </Box>

                    {cv_preview.error ? (
                      <Alert severity="error">{cv_preview.error}</Alert>
                    ) : (
                      <Box>
                        {/* CV Preview Image */}
                        {cv_preview.preview_image_base64 ? (
                          <Box sx={{ mb: 2 }}>
                            <Tooltip title="Click to view larger preview">
                              <Box
                                component="img"
                                src={`data:image/png;base64,${cv_preview.preview_image_base64}`}
                                alt="CV Preview"
                                onClick={() => setCvPreviewDialogOpen(true)}
                                sx={{
                                  width: "100%",
                                  maxWidth: 300, // Reduced to 300px for smaller thumbnail
                                  height: "auto",
                                  cursor: "pointer",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    borderColor: "primary.main",
                                    boxShadow: 2,
                                  },
                                }}
                              />
                            </Tooltip>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                              Click to enlarge
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1, textAlign: "center" }}>
                            <DocumentIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              Preview image not available
                            </Typography>
                          </Box>
                        )}

                        <Typography variant="body2" color="text.secondary">
                          <strong>File:</strong> {cv_preview.filename}
                        </Typography>
                        {cv_preview.full_name && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Name:</strong> {cv_preview.full_name}
                          </Typography>
                        )}
                        {cv_preview.email && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Email:</strong> {cv_preview.email}
                          </Typography>
                        )}
                        {cv_preview.phone && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Phone:</strong> {cv_preview.phone}
                          </Typography>
                        )}
                        {cv_preview.location && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Location:</strong> {cv_preview.location}
                          </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {cv_preview.has_summary && (
                            <Chip label="Has Summary" size="small" />
                          )}
                          {cv_preview.work_experience_count !== undefined &&
                            cv_preview.work_experience_count > 0 && (
                              <Chip
                                label={`${cv_preview.work_experience_count} Work Experience`}
                                size="small"
                              />
                            )}
                          {cv_preview.education_count !== undefined &&
                            cv_preview.education_count > 0 && (
                              <Chip
                                label={`${cv_preview.education_count} Education`}
                                size="small"
                              />
                            )}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}

              {/* Job Preview - only show if job data exists */}
              {job_preview && Object.keys(job_preview).length > 0 && (
                <Grid item xs={12} md={cv_preview && Object.keys(cv_preview).length > 0 ? 6 : 12}>
                  <Paper sx={{ p: 2, height: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <WorkIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6">Job Preview</Typography>
                    </Box>

                    {job_preview.error ? (
                      <Alert severity="error">{job_preview.error}</Alert>
                    ) : (
                      <Box>
                        {/* Full Job Description Content */}
                        {job_preview.content && (
                          <Box
                            sx={{
                              maxHeight: 400,
                              overflow: "auto",
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1,
                              p: 2,
                              bgcolor: "background.paper",
                              mb: 2,
                            }}
                          >
                            <MarkdownRenderer
                              content={job_preview.content}
                              variant="body2"
                              color="text.primary"
                            />
                          </Box>
                        )}

                        {job_preview.content_length !== undefined && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 2, display: "block" }}
                          >
                            {job_preview.content_length} characters
                          </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body2" color="text.secondary">
                          <strong>Source:</strong>{" "}
                          {job_preview.source === "url" ? "URL" : "Text"}
                        </Typography>
                        {job_preview.title && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Title:</strong> {job_preview.title}
                          </Typography>
                        )}
                        {job_preview.company && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Company:</strong> {job_preview.company}
                          </Typography>
                        )}
                        {job_preview.location && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Location:</strong> {job_preview.location}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleStartOver}
              >
                Start Over
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* CV Preview Dialog */}
        <Dialog
          open={cvPreviewDialogOpen}
          onClose={() => setCvPreviewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h6">CV Preview</Typography>
              <IconButton
                onClick={() => setCvPreviewDialogOpen(false)}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {previewResponse?.cv_preview?.preview_image_base64 && (
              <Box
                component="img"
                src={`data:image/png;base64,${previewResponse.cv_preview.preview_image_base64}`}
                alt="CV Preview"
                sx={{
                  width: "100%",
                  height: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCvPreviewDialogOpen(false)} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Show input form
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Quick Start - Optimize Your CV
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload your CV and provide a job description to see a preview of how
            we can help optimize your application.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* CV Upload */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Upload Your CV
            </Typography>

            {!cvFile ? (
              <Paper
                onDragEnter={loading ? undefined : handleDrag}
                onDragLeave={loading ? undefined : handleDrag}
                onDragOver={loading ? undefined : handleDrag}
                onDrop={loading ? undefined : handleDrop}
                sx={{
                  p: 4,
                  textAlign: "center",
                  border: "2px dashed",
                  borderColor: dragActive && !loading ? "primary.main" : "grey.300",
                  backgroundColor: dragActive && !loading ? "action.hover" : "background.paper",
                  cursor: loading ? "default" : "pointer",
                  transition: "all 0.2s",
                  opacity: loading ? 0.6 : 1,
                }}
                onClick={loading ? undefined : () => document.getElementById("cv-file-input")?.click()}
              >
                <CloudUploadIcon
                  sx={{
                    fontSize: 48,
                    color: loading ? "grey.400" : "primary.main",
                    mb: 2
                  }}
                />
                <Typography variant="body1" gutterBottom>
                  {loading ? "Processing..." : "Drag and drop your CV here, or click to browse"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supports PDF, DOC, DOCX (max 10MB)
                </Typography>
                <input
                  id="cv-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileInput}
                  disabled={loading}
                  style={{ display: "none" }}
                />
              </Paper>
            ) : (
              <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, opacity: loading ? 0.6 : 1 }}>
                <DocumentIcon sx={{ color: "primary.main" }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1">{cvFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(cvFile.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
                <Button size="small" onClick={handleRemoveFile} disabled={loading}>
                  Remove
                </Button>
              </Paper>
            )}
          </Box>

          {/* Job Description Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Job Description
            </Typography>

            <ToggleButtonGroup
              value={jobInputType}
              exclusive
              onChange={loading ? undefined : (_, value) => {
                if (value !== null) {
                  setJobInputType(value);
                  setError(null);
                }
              }}
              sx={{ mb: 2, opacity: loading ? 0.6 : 1 }}
              fullWidth
            >
              <ToggleButton value="url" disabled={loading}>
                <LinkIcon sx={{ mr: 1 }} />
                URL
              </ToggleButton>
              <ToggleButton value="text" disabled={loading}>
                <TextIcon sx={{ mr: 1 }} />
                Text
              </ToggleButton>
            </ToggleButtonGroup>

            {jobInputType === "url" ? (
              <TextField
                fullWidth
                label="Job Posting URL"
                placeholder="https://example.com/jobs/senior-developer"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                helperText="Paste the link to the job posting"
                disabled={loading}
                sx={{ opacity: loading ? 0.6 : 1 }}
              />
            ) : (
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Job Description"
                placeholder="Paste the job description text here..."
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                helperText={`${jobText.length}/10,000 characters`}
                inputProps={{ maxLength: 10000 }}
                disabled={loading}
                sx={{ opacity: loading ? 0.6 : 1 }}
              />
            )}
          </Box>

          {/* Submit Button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading || (!cvFile && !jobUrl && !jobText)}
            >
              {loading ? "Processing..." : "Parse & Preview"}
            </Button>
          </Box>

          {loading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                Parsing your CV and job description... This may take up to a
                minute.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

    </Box>
  );
};

export default QuickStartWizard;
