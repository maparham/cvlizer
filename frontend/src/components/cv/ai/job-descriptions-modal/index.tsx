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

import React, { useState, useCallback, useEffect, useRef } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import LinkIcon from "@mui/icons-material/Link";
import DescriptionIcon from "@mui/icons-material/Description";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
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
import { normalizeApiError } from "../../../../services/api";
import { useJobDescriptionPolling } from "../../../../hooks/useJobDescriptionPolling";
import URLTab from "./URLTab";
import ManualTab from "./ManualTab";
import ArchiveTab from "./ArchiveTab";
import EditDialog from "./EditDialog";
import DeleteDialog from "./DeleteDialog";
import {
  JobDescriptionsModalProps,
  MIN_PASTED_JOB_TEXT_CHARS,
  TabPanelProps,
} from "./types";

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

type UrlTabSubmitAction =
  | { type: "submit-url" }
  | { type: "submit-paste"; pasted: string }
  | { type: "error"; message: string };

function resolveUrlTabSubmitAction(
  urlInput: string,
  urlValidation: FieldValidationResult,
  urlTabPasteText: string,
): UrlTabSubmitAction {
  const hasUrl = urlInput.trim().length > 0;
  const pasted = urlTabPasteText.trim();

  if (hasUrl) {
    if (!urlValidation.isValid) {
      return {
        type: "error",
        message: urlValidation.message || "Please enter a valid job posting URL",
      };
    }
    return { type: "submit-url" };
  }

  if (pasted.length >= MIN_PASTED_JOB_TEXT_CHARS) {
    return { type: "submit-paste", pasted };
  }

  if (pasted.length > 0) {
    return {
      type: "error",
      message: `Please paste at least ${MIN_PASTED_JOB_TEXT_CHARS} characters of the job posting, or enter a valid job posting URL above.`,
    };
  }

  return {
    type: "error",
    message: "Please enter a job posting URL or paste the job description below.",
  };
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
  const [urlTabPasteText, setUrlTabPasteText] = useState("");
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
    parseJobDescriptionPastedText,
    associateJobDescriptionWithCV,
    cancelJobDescriptionParsing,
  } = useAIStore();

  const jobDescriptions = useAIStore((state) => state.jobDescriptions);
  const activeJobDescription = useActiveJobDescription(cvId || "");

  // Track whether job descriptions have initially loaded to prevent race conditions
  const hasInitiallyLoaded = useRef(false);

  // Use the centralized polling hook
  const { parsingJobDescriptions } = useJobDescriptionPolling(jobDescriptions, {
    onParsingComplete: () => {
      showSuccess("Job description parsed successfully");
    },
    onParsingError: () => {
      // Error is displayed in the sidebar card - no need for temporary alert
    },
  });

  // Mark as loaded once job descriptions are available
  useEffect(() => {
    if (jobDescriptions.length > 0 && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
    }
  }, [jobDescriptions.length]);

  // Notify parent when active job description changes
  // Only fires after initial load to prevent race conditions during data fetch
  useEffect(() => {
    if (onJobDescriptionSelect && hasInitiallyLoaded.current) {
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
    setUrlTabPasteText("");
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

  const handleUrlPasteChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUrlTabPasteText(event.target.value);
      setError(null);
    },
    [],
  );

  const clearFieldsAfterUrlTabParseSuccess = useCallback(() => {
    setUrlInput("");
    setUrlTabPasteText("");
    setTitle("");
    setCompany("");
    setLocation("");
    setTextInput("");
  }, []);

  const finishBackgroundParseSuccess = useCallback(() => {
    clearFieldsAfterUrlTabParseSuccess();
    onClose();
    showSuccess(
      "Job description created and is being parsed in the background",
    );
  }, [clearFieldsAfterUrlTabParseSuccess, onClose, showSuccess]);

  const executeParseWithErrorHandling = useCallback(
    async (
      parseFunction: () => Promise<{ success?: boolean; error?: string }>,
      errorFallback: string,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const parsedData = await parseFunction();
        if (!parsedData.success) {
          throw new Error(parsedData.error || errorFallback);
        }
        finishBackgroundParseSuccess();
      } catch (err) {
        const normalized = normalizeApiError(err);
        const message =
          normalized && normalized !== "Request failed" && normalized !== "Network error"
            ? normalized
            : errorFallback;
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [finishBackgroundParseSuccess],
  );

  const submitUrlTabParseFromUrl = useCallback(async () => {
    await executeParseWithErrorHandling(
      () => parseJobDescriptionUrl(cvId, urlInput),
      'Unable to parse this URL. Please use the "MANUAL" tab to enter the job description manually.',
    );
  }, [
    cvId,
    urlInput,
    parseJobDescriptionUrl,
    executeParseWithErrorHandling,
  ]);

  const submitUrlTabParseFromPaste = useCallback(
    async (pasted: string) => {
      await executeParseWithErrorHandling(
        () => parseJobDescriptionPastedText(cvId, pasted),
        "Unable to parse pasted job description.",
      );
    },
    [cvId, parseJobDescriptionPastedText, executeParseWithErrorHandling],
  );

  // Initialize URL validation when modal opens
  useEffect(() => {
    if (open) {
      const validation = validateUrl(urlInput);
      setUrlValidation(validation);
    }
  }, [open, urlInput, validateUrl]);

  const handleUrlTabSubmit = useCallback(async () => {
    setUrlTouched(true);
    const validation = validateUrl(urlInput);
    setUrlValidation(validation);

    const action = resolveUrlTabSubmitAction(urlInput, validation, urlTabPasteText);

    if (action.type === "submit-url") {
      await submitUrlTabParseFromUrl();
      return;
    }

    if (action.type === "submit-paste") {
      await submitUrlTabParseFromPaste(action.pasted);
      return;
    }

    setError(action.message);
  }, [
    validateUrl,
    urlInput,
    urlTabPasteText,
    submitUrlTabParseFromUrl,
    submitUrlTabParseFromPaste,
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

  const handleCancelParsing = useCallback(
    async (jobDescription: JobDescription) => {
      await cancelJobDescriptionParsing(jobDescription.id);
    },
    [cancelJobDescriptionParsing],
  );

  const handleClose = useCallback(() => {
    setError(null);
    setTabValue(0);
    // Reset URL validation state when closing modal
    setUrlTouched(false);
    setUrlTabPasteText("");
    setUrlValidation({
      isValid: false,
      message: "Please enter a job posting URL",
    });
    // Clear dialog state
    setShowEditDialog(false);
    setEditingJobDescription(null);
    onClose();
  }, [onClose]);

  const canSubmitUrl =
    urlInput.trim().length > 0 && urlValidation.isValid;
  const canSubmitPaste =
    urlInput.trim().length === 0 &&
    urlTabPasteText.trim().length >= MIN_PASTED_JOB_TEXT_CHARS;
  const urlTabLoadSaveDisabled =
    isLoading || (!canSubmitUrl && !canSubmitPaste);

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
                  urlValidation={urlValidation}
                  urlTouched={urlTouched}
                  urlTabPasteText={urlTabPasteText}
                  isLoading={isLoading}
                  error={error}
                  onUrlChange={handleUrlChange}
                  onUrlBlur={handleUrlBlur}
                  onPasteChange={handleUrlPasteChange}
                  onSubmit={handleUrlTabSubmit}
                  loadSaveDisabled={urlTabLoadSaveDisabled}
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
                  activeJobDescription={activeJobDescription ?? null}
                  parsingJobDescriptions={parsingJobDescriptions}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onSelect={handleJobDescriptionSelect}
                  onCancelParsing={handleCancelParsing}
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
