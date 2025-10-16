/**
 * Job Descriptions Modal Component
 *
 * This component provides a full-screen modal interface for managing job descriptions
 * including URL parsing, manual text input, and file upload support. It integrates
 * with the AI store to manage job descriptions for CV optimization.
 *
 * Key responsibilities:
 * - Full-screen modal for job description management
 * - URL input with automatic parsing for job postings
 * - Manual text input area for job descriptions
 * - Save and manage job descriptions for the current CV
 * - Integration with AI features for optimization
 *
 * Usage:
 * - Used as a modal dialog triggered from the CV editor sidebar
 * - Requires cvId prop to associate with specific CV
 * - Integrates with AI store for state management
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  Grid,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Link as LinkIcon,
  Description as DescriptionIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  useAIStore,
  useActiveJobDescription,
} from "../../../stores/aiStore";
import { JobDescription } from "../../../types/ai";
import { useNotifications } from "../../../stores/uiStore";
import {
  validateJobPostingUrl,
  FieldValidationResult,
} from "../../../utils/validationUtils";
import { useJobDescriptionPolling } from "../../../hooks/useJobDescriptionPolling";
import JobDescriptionCard from "./JobDescriptionCard";

interface JobDescriptionsModalProps {
  open: boolean;
  onClose: () => void;
  cvId: string;
  onJobDescriptionSelect?: (jobDescription: JobDescription | null) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`job-desc-tabpanel-${index}`}
      aria-labelledby={`job-desc-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const JobDescriptionsModal: React.FC<JobDescriptionsModalProps> = ({
  open,
  onClose,
  cvId,
  onJobDescriptionSelect,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingJobDescription, setEditingJobDescription] =
    useState<JobDescription | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [jobDescriptionToDelete, setJobDescriptionToDelete] =
    useState<JobDescription | null>(null);

  // Separate state for edit dialog (to avoid affecting MANUAL tab fields)
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editTextInput, setEditTextInput] = useState("");

  // URL validation state
  const [urlValidation, setUrlValidation] = useState<FieldValidationResult>({
    isValid: false,
    message: "Please enter a job posting URL",
  });
  const [urlTouched, setUrlTouched] = useState(false);

  const { showSuccess, showError } = useNotifications();
  const {
    createJobDescription,
    updateJobDescription,
    deleteJobDescription,
    setActiveJobDescription,
    showJobDescriptionInSidebar,
    parseJobDescriptionUrl,
    associateJobDescriptionWithCV,
  } = useAIStore();

  const jobDescriptions = useAIStore((state) => state.jobDescriptions);
  const activeJobDescription = useActiveJobDescription();

  // Use the centralized polling hook
  const { parsingJobDescriptions } = useJobDescriptionPolling(jobDescriptions, {
    onParsingComplete: () => {
      showSuccess("Job description parsed successfully");
    },
    onParsingError: () => {
      // Error is displayed in the sidebar card - no need for temporary alert
    },
  });

  // Job descriptions are already loaded by JobDescriptionSummary component
  // and kept fresh by polling hook and CRUD operations updating the store directly.
  // No need to reload when modal opens - prevents unnecessary loading flicker.

  // Notify parent when active job description changes
  useEffect(() => {
    if (onJobDescriptionSelect) {
      onJobDescriptionSelect(activeJobDescription || null);
    }
  }, [activeJobDescription, onJobDescriptionSelect]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    // Reset URL validation state when switching tabs
    setUrlTouched(false);
    setUrlValidation({
      isValid: false,
      message: "Please enter a job posting URL",
    });
  };

  // URL validation handlers
  const validateUrl = useCallback((url: string): FieldValidationResult => {
    return validateJobPostingUrl(url);
  }, []);

  const handleUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newUrl = event.target.value;
      setUrlInput(newUrl);

      // Clear general error when user starts typing
      setError(null);

      // Validate URL in real-time
      const validation = validateUrl(newUrl);
      setUrlValidation(validation);
    },
    [validateUrl],
  );

  const handleUrlBlur = useCallback(() => {
    setUrlTouched(true);
    // Re-validate on blur to ensure latest validation state
    const validation = validateUrl(urlInput);
    setUrlValidation(validation);
  }, [urlInput, validateUrl]);

  const isUrlValid = urlValidation.isValid;
  const showUrlError = urlTouched && !isUrlValid;

  // Initialize URL validation when modal opens
  useEffect(() => {
    if (open) {
      const validation = validateUrl(urlInput);
      setUrlValidation(validation);
    }
  }, [open, urlInput, validateUrl]);

  const handleUrlSubmit = useCallback(async () => {
    // Mark URL as touched and validate
    setUrlTouched(true);
    const validation = validateUrl(urlInput);
    setUrlValidation(validation);

    if (!urlInput.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!validation.isValid) {
      setError(validation.message || "Please enter a valid job posting URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the URL parsing service - this creates the job description on backend
      const parsedData = await parseJobDescriptionUrl(cvId, urlInput);

      if (!(parsedData as { success?: boolean }).success) {
        const errorMsg =
          (parsedData as { error?: string }).error || "Failed to parse URL";
        throw new Error(errorMsg);
      }

      // The AI store will create a placeholder job description automatically
      // and set it as active when parsing completes

      // Clear form fields
      setUrlInput("");
      setTitle("");
      setCompany("");
      setLocation("");
      setTextInput("");

      // Close the modal immediately to provide clear feedback
      onClose();

      // Show success message
      showSuccess(
        "Job description created and is being parsed in the background",
      );
    } catch (err) {
      // Use the actual error message from the backend (e.g., "This appears to be a search results page...")
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unable to parse this URL. Please use the "MANUAL" tab to enter the job description manually.';
      setError(errorMessage);
      // Error is displayed in the modal Alert when validation fails immediately
      // Sidebar card shows errors when parsing starts but fails later
    } finally {
      setIsLoading(false);
    }
  }, [
    urlInput,
    title,
    company,
    location,
    cvId,
    parseJobDescriptionUrl,
    setActiveJobDescription,
    onJobDescriptionSelect,
    showSuccess,
    showError,
    validateUrl,
    onClose,
  ]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) {
      setError("Please enter job description text");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const jobDescription = {
        content: textInput,
        title: title || "Manual Job Description",
        company: company || "Unknown Company",
        location: location || "Unknown Location",
      };

      const newJobDescription = await createJobDescription(
        cvId,
        jobDescription,
      );

      // Automatically select the newly created job description
      setActiveJobDescription(newJobDescription.id, cvId);
      if (onJobDescriptionSelect) {
        onJobDescriptionSelect(newJobDescription);
      }

      // Clear form fields
      setTextInput("");
      setTitle("");
      setCompany("");
      setLocation("");

      // Close the modal after successful creation
      onClose();

      showSuccess("Job description created successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create job description";
      setError(errorMessage);
      showError("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    textInput,
    title,
    company,
    location,
    cvId,
    createJobDescription,
    showSuccess,
    showError,
    onJobDescriptionSelect,
    setActiveJobDescription,
    onClose,
  ]);

  const handleJobDescriptionSelect = useCallback(
    async (jobDescription: JobDescription) => {
      try {
        // Associate JD with current CV if not already associated
        if (!jobDescription.cv_ids.includes(cvId)) {
          await associateJobDescriptionWithCV(jobDescription.id, cvId);
        }

        // Set as active for this specific CV
        setActiveJobDescription(jobDescription.id, cvId);
        // Make sure the job description is visible in the sidebar
        showJobDescriptionInSidebar(jobDescription.id);
        // Close the modal after selection
        onClose();
        showSuccess('Job description selected');
      } catch (error) {
        showError('Failed to select job description');
      }
    },
    [cvId, associateJobDescriptionWithCV, setActiveJobDescription,
     showJobDescriptionInSidebar, onClose, showSuccess, showError],
  );

  const handleDeleteClick = useCallback((jobDescription: JobDescription) => {
    setJobDescriptionToDelete(jobDescription);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!jobDescriptionToDelete) return;

    try {
      await deleteJobDescription(jobDescriptionToDelete.id);
      showSuccess("Job description deleted successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete job description";
      showError("Error", errorMessage);
    } finally {
      setShowDeleteDialog(false);
      setJobDescriptionToDelete(null);
    }
  }, [jobDescriptionToDelete, deleteJobDescription, showSuccess, showError]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
    setJobDescriptionToDelete(null);
  }, []);

  const handleEditJobDescription = useCallback(
    (jobDescription: JobDescription) => {
      setEditingJobDescription(jobDescription);
      setEditTitle(jobDescription.title || "");
      setEditCompany(jobDescription.company || "");
      setEditLocation(jobDescription.location || "");
      setEditTextInput(jobDescription.content);
      setShowEditDialog(true);
    },
    [],
  );

  const handleEditSubmit = useCallback(async () => {
    if (!editingJobDescription || !editTextInput.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update the job description using the proper update API
      await updateJobDescription(editingJobDescription.id, {
        content: editTextInput,
        title: editTitle || "Manual Job Description",
        company: editCompany || "Unknown Company",
        location: editLocation || "Unknown Location",
      });

      setShowEditDialog(false);
      setEditingJobDescription(null);
      setEditTextInput("");
      setEditTitle("");
      setEditCompany("");
      setEditLocation("");
      showSuccess("Job description updated successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update job description";
      setError(errorMessage);
      showError("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    editingJobDescription,
    editTextInput,
    editTitle,
    editCompany,
    editLocation,
    updateJobDescription,
    showSuccess,
    showError,
  ]);

  const handleClose = useCallback(() => {
    setError(null);
    setTabValue(0);
    // Reset URL validation state when closing modal
    setUrlTouched(false);
    setUrlValidation({
      isValid: false,
      message: "Please enter a job posting URL",
    });
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: "70vh",
            maxHeight: "90vh",
            borderRadius: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e0e0e0",
            pb: 2,
          }}
        >
          <Typography variant="h5" component="div">
            Job Description
          </Typography>
          <IconButton
            onClick={handleClose}
            size="large"
            sx={{
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: "auto", height: "100%" }}>
          <Box
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            {error && (
              <Alert severity="error" sx={{ m: 2, mb: 0 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="job description input tabs"
              >
                <Tab label="URL" icon={<LinkIcon />} />
                <Tab label="MANUAL" icon={<DescriptionIcon />} />
                <Tab label="ARCHIVE" icon={<UploadIcon />} />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              {/* URL Input Tab */}
              <TabPanel value={tabValue} index={0}>
                <Stack spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>
                        Enter the direct link to the specific job posting
                      </strong>{" "}
                      – preferably the URL hosted by the company posting the
                      job.
                    </Typography>
                    <Typography variant="body2">
                      Avoid search results pages. Job details will be
                      automatically extracted and parsed in the background
                      (typically 10-30 seconds).
                    </Typography>
                  </Alert>
                  <TextField
                    label="Job Posting URL"
                    placeholder="https://company.com/careers/job-title..."
                    value={urlInput}
                    onChange={handleUrlChange}
                    onBlur={handleUrlBlur}
                    fullWidth
                    disabled={isLoading}
                    error={showUrlError}
                    helperText={
                      showUrlError
                        ? urlValidation.message
                        : urlValidation.isValid && urlValidation.message
                          ? urlValidation.message
                          : "Paste the direct URL of a specific job posting (not a search results page)."
                    }
                  />
                  <Button
                    variant="contained"
                    onClick={handleUrlSubmit}
                    disabled={isLoading || !urlInput.trim() || !isUrlValid}
                    startIcon={
                      isLoading ? <CircularProgress size={20} /> : <AddIcon />
                    }
                    size="large"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {isLoading ? "Loading..." : "LOAD & SAVE"}
                  </Button>
                </Stack>
              </TabPanel>

              {/* MANUAL Input Tab */}
              <TabPanel value={tabValue} index={1}>
                <Stack spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Tip:</strong> Include complete job requirements,
                      responsibilities, and qualifications for the best AI
                      optimization results
                    </Typography>
                  </Alert>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 3,
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                    }}
                  >
                    <Box
                      sx={{
                        flex: "1 1 calc(33.333% - 16px)",
                        minWidth: "200px",
                      }}
                    >
                      <TextField
                        label="Job Title (Optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                        variant="outlined"
                        size="medium"
                      />
                    </Box>
                    <Box
                      sx={{
                        flex: "1 1 calc(33.333% - 16px)",
                        minWidth: "200px",
                      }}
                    >
                      <TextField
                        label="Company (Optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                        variant="outlined"
                        size="medium"
                      />
                    </Box>
                    <Box
                      sx={{
                        flex: "1 1 calc(33.333% - 16px)",
                        minWidth: "200px",
                      }}
                    >
                      <TextField
                        label="Location (Optional)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        fullWidth
                        disabled={isLoading}
                        variant="outlined"
                        size="medium"
                      />
                    </Box>
                  </Box>

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <TextField
                      label="Job Description"
                      placeholder="Paste the job description text here..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      multiline
                      rows={10}
                      fullWidth
                      disabled={isLoading}
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          alignItems: "flex-start",
                        },
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {textInput.length} characters •{" "}
                        {
                          textInput
                            .trim()
                            .split(/\s+/)
                            .filter((word) => word.length > 0).length
                        }{" "}
                        words
                      </Typography>
                      {textInput.length > 0 && (
                        <Typography
                          variant="caption"
                          color={
                            textInput.length < 100
                              ? "warning.main"
                              : "success.main"
                          }
                        >
                          {textInput.length < 100
                            ? "⚠ More detail recommended"
                            : "✓ Good detail level"}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-start",
                      pt: 1,
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={handleTextSubmit}
                      disabled={isLoading || !textInput.trim()}
                      startIcon={
                        isLoading ? <CircularProgress size={20} /> : <AddIcon />
                      }
                      size="large"
                      sx={{ minWidth: 200 }}
                    >
                      {isLoading ? "Saving..." : "Save Job Description"}
                    </Button>
                  </Box>
                </Stack>
              </TabPanel>

              {/* Archive Job Descriptions Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ maxWidth: 1400, mx: "auto", p: 2 }}>
                  {jobDescriptions.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: "center" }}>
                      <Typography
                        color="text.secondary"
                        variant="h6"
                        gutterBottom
                      >
                        No job descriptions saved yet
                      </Typography>
                      <Typography color="text.secondary">
                        Add one using the URL or MANUAL tabs.
                      </Typography>
                    </Paper>
                  ) : (
                    <Grid container spacing={3}>
                      {jobDescriptions.map((jobDescription) => {
                        const isParsing =
                          jobDescription.is_parsing ||
                          parsingJobDescriptions.has(jobDescription.id);

                        return (
                          <Grid
                            item
                            xs={12}
                            md={6}
                            lg={4}
                            key={jobDescription.id}
                          >
                            <JobDescriptionCard
                              jobDescription={jobDescription}
                              isActive={
                                activeJobDescription?.id === jobDescription.id
                              }
                              isParsing={isParsing}
                              onEdit={handleEditJobDescription}
                              onDelete={handleDeleteClick}
                              onSelect={handleJobDescriptionSelect}
                              showSelectButton={true}
                              maxChipWidth={200}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Box>
              </TabPanel>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ borderTop: "1px solid #e0e0e0", p: 2 }}>
          {activeJobDescription && (
            <Typography variant="body2" color="text.secondary">
              Active:{" "}
              {activeJobDescription.is_parsing
                ? "Loading..."
                : activeJobDescription.title || "Untitled Job Description"}
            </Typography>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Job Description</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Job Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label="Company"
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label="Location"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label="Job Description"
              value={editTextInput}
              onChange={(e) => setEditTextInput(e.target.value)}
              multiline
              rows={8}
              fullWidth
              disabled={isLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isLoading || !editTextInput.trim()}
            startIcon={
              isLoading ? <CircularProgress size={20} /> : <CheckIcon />
            }
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Job Description</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "
            {jobDescriptionToDelete?.title || "this job description"}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isLoading}
            startIcon={
              isLoading ? <CircularProgress size={20} /> : <DeleteIcon />
            }
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobDescriptionsModal;
