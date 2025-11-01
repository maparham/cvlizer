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
  DialogActions,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Link as LinkIcon,
  Description as DescriptionIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  useAIStore,
  useActiveJobDescription,
} from "../../../../stores/ai";
import { JobDescription } from "../../../../types/ai";
import { useNotifications } from "../../../../packages/notifications";
import {
  validateJobPostingUrl,
  FieldValidationResult,
} from "../../../../utils/validation";
import { useJobDescriptionPolling } from "../../../../hooks/useJobDescriptionPolling";
import URLTab from "./URLTab";
import ManualTab from "./ManualTab";
import ArchiveTab from "./ArchiveTab";
import EditDialog from "./EditDialog";
import DeleteDialog from "./DeleteDialog";
import { JobDescriptionsModalProps, TabPanelProps } from "./types";

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
  onJobDescriptionCreated,
  editingJobDescription: externalEditingJobDescription,
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

  // Notify parent when active job description changes
  useEffect(() => {
    if (onJobDescriptionSelect) {
      onJobDescriptionSelect(activeJobDescription || null);
    }
  }, [activeJobDescription, onJobDescriptionSelect]);

  // Auto-open edit dialog when editingJobDescription prop is provided
  useEffect(() => {
    if (open && externalEditingJobDescription) {
      setEditingJobDescription(externalEditingJobDescription);
      setShowEditDialog(true);
    }
  }, [open, externalEditingJobDescription]);

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
    } finally {
      setIsLoading(false);
    }
  }, [
    urlInput,
    cvId,
    parseJobDescriptionUrl,
    onClose,
    showSuccess,
    validateUrl,
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

      // Call optional callback for parent components that need to refresh data
      if (onJobDescriptionCreated) {
        onJobDescriptionCreated();
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
    onJobDescriptionCreated,
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
        showSuccess("Job description selected");
      } catch (error) {
        showError("Failed to select job description");
      }
    },
    [
      cvId,
      associateJobDescriptionWithCV,
      setActiveJobDescription,
      showJobDescriptionInSidebar,
      onClose,
      showSuccess,
      showError,
    ],
  );

  const handleEditClick = useCallback(
    (jobDescription: JobDescription) => {
      setEditingJobDescription(jobDescription);
      setShowEditDialog(true);
    },
    [],
  );

  const handleEditDialogClose = useCallback(() => {
    setShowEditDialog(false);
    setEditingJobDescription(null);

    // Close parent modal if we're in external edit mode
    if (externalEditingJobDescription) {
      onClose();
    }
  }, [externalEditingJobDescription, onClose]);

  const handleEditSave = useCallback(
    async (updates: {
      title: string;
      company: string;
      location: string;
      content: string;
    }) => {
      if (!editingJobDescription) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Update the job description using the proper update API
        await updateJobDescription(editingJobDescription.id, {
          content: updates.content,
          title: updates.title || "Manual Job Description",
          company: updates.company || "Unknown Company",
          location: updates.location || "Unknown Location",
        });

        showSuccess("Job description updated successfully");
        handleEditDialogClose();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update job description";
        setError(errorMessage);
        showError("Error", errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      editingJobDescription,
      updateJobDescription,
      showSuccess,
      showError,
      handleEditDialogClose,
    ],
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

  const handleClose = useCallback(() => {
    setError(null);
    setTabValue(0);
    // Reset URL validation state when closing modal
    setUrlTouched(false);
    setUrlValidation({
      isValid: false,
      message: "Please enter a job posting URL",
    });
    // Clear dialog state
    setShowEditDialog(false);
    setEditingJobDescription(null);
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog
        open={open && !externalEditingJobDescription}
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
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
                <URLTab
                  urlInput={urlInput}
                  setUrlInput={setUrlInput}
                  urlValidation={urlValidation}
                  urlTouched={urlTouched}
                  isLoading={isLoading}
                  error={error}
                  onUrlChange={handleUrlChange}
                  onUrlBlur={handleUrlBlur}
                  onSubmit={handleUrlSubmit}
                />
              </TabPanel>

              {/* MANUAL Input Tab */}
              <TabPanel value={tabValue} index={1}>
                <ManualTab
                  title={title}
                  setTitle={setTitle}
                  company={company}
                  setCompany={setCompany}
                  location={location}
                  setLocation={setLocation}
                  textInput={textInput}
                  setTextInput={setTextInput}
                  isLoading={isLoading}
                  error={error}
                  onSubmit={handleTextSubmit}
                />
              </TabPanel>

              {/* Archive Job Descriptions Tab */}
              <TabPanel value={tabValue} index={2}>
                <ArchiveTab
                  jobDescriptions={jobDescriptions}
                  activeJobDescription={activeJobDescription}
                  parsingJobDescriptions={parsingJobDescriptions}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onSelect={handleJobDescriptionSelect}
                />
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
      <EditDialog
        open={showEditDialog}
        jobDescription={editingJobDescription}
        isLoading={isLoading}
        onClose={handleEditDialogClose}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={showDeleteDialog}
        jobDescription={jobDescriptionToDelete}
        isLoading={isLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};

export default JobDescriptionsModal;
