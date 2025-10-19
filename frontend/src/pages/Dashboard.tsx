/**
 * Dashboard Page Component
 *
 * This module provides the main CV management interface where users can view,
 * manage, and organize their CV collection. It includes search, filtering,
 * and CRUD operations for CVs.
 *
 * Key responsibilities:
 * - Display user's CV collection with status indicators
 * - Provide search and filtering capabilities
 * - Handle CV creation, editing, deletion, and duplication
 * - Show CV processing status and error states
 * - Manage user authentication and admin access
 *
 * Usage:
 * - Rendered as the "/dashboard" route for authenticated users
 * - Uses CV store for state management and API operations
 * - Integrates with notification system for user feedback
 * - Provides responsive grid layout for CV cards
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  Tooltip,
  CardActions,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  Upload as UploadIcon,
  Description as DocumentIcon,
  Article as TemplateIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CVUpload, EditableTitle } from "../components/cv";
import CVTemplateSelector from "../components/cv/CVTemplateSelector";
import CVQuickActions from "../components/cv/CVQuickActions";
import { JobDescriptionsModal, JobDescriptionCard } from "../components/cv/ai";
import { useCVStore } from "../stores/cvStore";
import { useAIStore } from "../stores/aiStore";
import { useNotifications } from "../packages/notifications";
import { useActivityLogger } from "../hooks/useActivityLogger";
import { NotificationDrawer, NotificationToast, NotificationDrawerRef } from "../packages/notifications";
import { CV } from "../types";
import { JobDescription } from "../types/ai";
import {
  getCVStatusIcon,
  getSectionCount,
  isUploadedCV,
  hasBeenEdited,
} from "../utils/dashboardUtils";
import { formatDateTime } from "../utils/dateFormat";


const Dashboard: React.FC = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<CV | null>(null);
  const [jobDescriptionModalOpen, setJobDescriptionModalOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] = useState<JobDescription | null>(null);
  const notificationDrawerRef = useRef<NotificationDrawerRef>(null);

  // Search and filter states

  const {
    logout,
    isAdmin: authIsAdmin,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const { logUserAction } = useActivityLogger();

  // Use CV store instead of local state
  const {
    cvs,
    fetchCVs,
    createTemporaryCV,
    updateCVTitle,
    deleteCV: deleteCVFromStore,
    duplicateCV: duplicateCVFromStore,
  } = useCVStore();

  // Get job descriptions for the applications card
  const { jobDescriptions, loadJobDescriptions } = useAIStore();

  // Get CV status counts for filter badges (memoized to avoid repeated filtering)
  const cvStatusCounts = React.useMemo(() => ({
    all: cvs.length,
    parsed: cvs.filter((cv) => cv.is_parsed && !cv.parse_error).length,
    parsing: cvs.filter((cv) => !cv.is_parsed && !cv.parse_error).length,
    error: cvs.filter((cv) => !!cv.parse_error).length,
  }), [cvs]);

  // Get JD status counts (memoized to avoid repeated filtering)
  const jdStatusCounts = React.useMemo(() => ({
    open: jobDescriptions.filter(jd => jd.status === "open").length,
    applied: jobDescriptions.filter(jd => jd.status === "applied").length,
    archived: jobDescriptions.filter(jd => jd.status === "archived").length,
  }), [jobDescriptions]);

  // Fetch CVs on component mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchCVs();
      loadJobDescriptions();
      // Log dashboard view (page view is already logged by useActivityLogger)
      logUserAction("dashboard_view", "User viewed dashboard");
    }
  }, [isAuthenticated, authLoading]); // Depend on auth state only


  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    handleMenuClose();
  };


  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCvToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!cvToDelete) return;

    try {
      await deleteCVFromStore(cvToDelete.id);
      // Log CV deletion
      logUserAction(
        "cv_delete",
        `User deleted CV: ${cvToDelete.original_filename}`,
        {
          cvId: cvToDelete.id,
          filename: cvToDelete.original_filename,
        },
      );
      showSuccess(
        "Success",
        `${cvToDelete.original_filename} deleted successfully`,
      );
      setDeleteDialogOpen(false);
      setCvToDelete(null);
    } catch (error) {
      showError("Error", "Failed to delete CV");
    }
  };

  const handleDuplicate = async (cv: CV) => {
    try {
      await duplicateCVFromStore(cv.id);
      showSuccess(
        "Success",
        `CV "${cv.original_filename}" duplicated successfully`,
      );
    } catch (error) {
      showError("Error", "Failed to duplicate CV");
    }
  };

  const handleTitleSave = async (cv: CV, newTitle: string) => {
    try {
      await updateCVTitle(cv.id, newTitle);
      showSuccess("Success", "CV title updated successfully");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || "Failed to update CV title";
      showError("Error", errorMessage);
    }
  };

  const handleEditJobDescription = (jd: JobDescription) => {
    setEditingJobDescription(jd);
    setJobDescriptionModalOpen(true);
  };

  const handleJobDescriptionModalClose = () => {
    setJobDescriptionModalOpen(false);
    setEditingJobDescription(null);
  };

  const handleCreateFromTemplate = () => {
    setTemplateSelectorOpen(true);
  };

  const handleStartFromScratch = async () => {
    if (creating) return;

    setCreating(true);
    try {
      const newCV = await createTemporaryCV();
      navigate(`/cv/${newCV.id}`);
    } catch (error) {
      console.error("Error creating blank CV:", error);
      showError("Error", "Failed to create new CV");
    } finally {
      setCreating(false);
    }
  };

  const handleTemplateSelect = async (template: any) => {
    if (creating) return;

    setCreating(true);
    try {
      const newCV = await createTemporaryCV();

      // If a template was selected, apply its data
      if (template) {
        // Update the temporary CV with template data
        newCV.parsed_data = { ...newCV.parsed_data, ...template.sampleData };
        newCV.original_filename = `${template.name} - New CV`;
      }

      navigate(`/cv/${newCV.id}`);
    } catch (error) {
      console.error("Error creating blank CV:", error);
      showError("Error", "Failed to create new CV");
    } finally {
      setCreating(false);
    }
  };



  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: "#f5f5f5", color: "#333" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: "#333" }}>
            CV Optimizer
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{ color: "#333" }}
            data-testid="user-menu-button"
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            data-testid="user-menu"
          >
            <MenuItem
              onClick={() => {
                navigate("/profile");
                handleMenuClose();
              }}
              data-testid="profile-menu-item"
            >
              Profile
            </MenuItem>
            {authIsAdmin && (
              <MenuItem
                onClick={() => {
                  navigate("/admin");
                  handleMenuClose();
                }}
                data-testid="admin-menu-item"
              >
                Admin
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout} data-testid="logout-menu-item">
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Job Applications Card */}
            <Card
              sx={{
                mb: 4,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                "&:hover": {
                  boxShadow: 2,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", flex: 1 }}>
                    My Job Applications
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flex: 1, justifyContent: "center" }}>
                    <Chip
                      label={`${jdStatusCounts.open} Open`}
                      size="small"
                      sx={{ backgroundColor: "rgba(33, 150, 243, 0.1)", color: "#1976d2" }}
                    />
                    <Chip
                      label={`${jdStatusCounts.applied} Applied`}
                      size="small"
                      sx={{ backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#ed6c02" }}
                    />
                    <Chip
                      label={`${jdStatusCounts.archived} Archived`}
                      size="small"
                      sx={{ backgroundColor: "rgba(158, 158, 158, 0.1)", color: "#757575" }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ flex: 1, justifyContent: "flex-end" }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setJobDescriptionModalOpen(true)}
                      sx={{
                        borderColor: "#667eea",
                        color: "#667eea",
                        "&:hover": {
                          backgroundColor: "rgba(102, 126, 234, 0.1)",
                          borderColor: "#667eea",
                        },
                        fontWeight: 600,
                        textTransform: "none",
                        px: 3,
                      }}
                    >
                      New Job
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/applications")}
                      sx={{
                        borderColor: "#667eea",
                        color: "#667eea",
                        "&:hover": {
                          backgroundColor: "rgba(102, 126, 234, 0.1)",
                          borderColor: "#667eea",
                        },
                        fontWeight: 600,
                        textTransform: "none",
                        px: 3,
                      }}
                    >
                      View All
                    </Button>
                  </Stack>
                </Stack>

                {/* Recent Job Applications - Horizontal Scrollable */}
                {jobDescriptions.length > 0 && (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        overflowX: "auto",
                        pb: 1,
                        "&::-webkit-scrollbar": {
                          height: 6,
                        },
                        "&::-webkit-scrollbar-track": {
                          backgroundColor: "#f1f1f1",
                          borderRadius: 3,
                        },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: "#c1c1c1",
                          borderRadius: 3,
                          "&:hover": {
                            backgroundColor: "#a8a8a8",
                          },
                        },
                      }}
                    >
                      {jobDescriptions
                        .sort((a, b) => {
                          const dateA = new Date(a.created_at).getTime();
                          const dateB = new Date(b.created_at).getTime();
                          // Primary sort by date (descending), secondary sort by id for stability
                          if (dateA !== dateB) {
                            return dateB - dateA;
                          }
                          return b.id.localeCompare(a.id);
                        })
                        .slice(0, 10)
                        .map((jd) => (
                          <Box
                            key={jd.id}
                            sx={{
                              minWidth: 280,
                              maxWidth: 280,
                              cursor: "pointer",
                              "&:hover": {
                                transform: "translateY(-2px)",
                                transition: "transform 0.2s ease-in-out",
                              },
                            }}
                            onClick={() => navigate("/applications")}
                          >
                            <JobDescriptionCard
                              jobDescription={jd}
                              isParsing={jd.is_parsing}
                              variant="default"
                              showSelectButton={false}
                              onEdit={handleEditJobDescription}
                            />
                          </Box>
                        ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

        {/* CV Section - Hybrid Approach */}
        {cvs.length === 0 ? (
          // Empty state - keep existing welcome banner
          <>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              My CVs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and optimize your CV collection
            </Typography>
          </Box>
            </Box>
          </>
        ) : (
          // Compact card view when user has CVs - matching Job Applications style
          <Card
            sx={{
              mb: 4,
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              "&:hover": {
                boxShadow: 2,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", flex: 1 }}>
                  My CVs
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flex: 1, justifyContent: "center" }}>
                  <Chip
                    label={`${cvStatusCounts.parsed} Ready`}
                    size="small"
                    sx={{ backgroundColor: "rgba(76, 175, 80, 0.1)", color: "#4caf50" }}
                  />
                  <Chip
                    label={`${cvStatusCounts.parsing} Processing`}
                    size="small"
                    sx={{ backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#ed6c02" }}
                  />
                  {cvStatusCounts.error > 0 && (
                    <Chip
                      label={`${cvStatusCounts.error} Errors`}
                      size="small"
                      sx={{ backgroundColor: "rgba(244, 67, 54, 0.1)", color: "#f44336" }}
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ flex: 1, justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    startIcon={<TemplateIcon />}
                    onClick={handleCreateFromTemplate}
                    disabled={creating}
                    data-testid="create-from-template-button"
                    sx={{
                      borderColor: "#667eea",
                      color: "#667eea",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.1)",
                        borderColor: "#667eea",
                      },
                      fontWeight: 600,
                      textTransform: "none",
                      px: 2,
                      py: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    From Template
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleStartFromScratch}
                    disabled={creating}
                    data-testid="start-from-scratch-button"
                    sx={{
                      borderColor: "#667eea",
                      color: "#667eea",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.1)",
                        borderColor: "#667eea",
                      },
                      fontWeight: 600,
                      textTransform: "none",
                      px: 2,
                      py: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    From Scratch
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => setUploadOpen(true)}
                    data-testid="upload-cv-button"
                    sx={{
                      borderColor: "#667eea",
                      color: "#667eea",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.1)",
                        borderColor: "#667eea",
                      },
                      fontWeight: 600,
                      textTransform: "none",
                      px: 2,
                      py: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Upload
                  </Button>
                </Stack>
              </Stack>

              {/* Full CV Cards Grid */}
              <Grid container spacing={3}>
                {cvs.map((cv) => (
                  <Grid item xs={12} sm={6} lg={4} key={cv.id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease-in-out",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        {/* CV Header with Status */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box sx={{ flexGrow: 1, mr: 1 }}>
                            <EditableTitle
                              title={cv.original_filename}
                              onSave={(newTitle) => handleTitleSave(cv, newTitle)}
                              variant="h6"
                              sx={{
                                mb: 1,
                                fontWeight: 600,
                                fontSize: "1.1rem",
                                lineHeight: 1.2,
                              }}
                            />
                          </Box>
                           <Tooltip
                             title={
                               cv.parse_error
                                 ? "Parsing failed"
                                 : cv.is_parsed
                                 ? "Ready for editing"
                                 : "Draft"
                             }
                           >
                             <Box
                               sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 width: 32,
                                 height: 32,
                               }}
                             >
                               {getCVStatusIcon(cv)}
                             </Box>
                           </Tooltip>
                        </Box>

                        {/* File Type and Metadata */}
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                          {isUploadedCV(cv) && (
                            <Tooltip title="Download original file">
                              <Chip
                                label={cv.file_type.split("/")[1].toUpperCase()}
                                size="small"
                                color="primary"
                                variant="outlined"
                                icon={<DownloadIcon />}
                                clickable
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // handleDownloadCV(cv);
                                }}
                                sx={{ borderRadius: 1.5 }}
                              />
                            </Tooltip>
                          )}
                          {hasBeenEdited(cv) && (
                            <Tooltip title="This CV has been modified">
                              <Chip
                                label="Modified"
                                size="small"
                                color="warning"
                                variant="outlined"
                                icon={<EditIcon />}
                                sx={{ borderRadius: 1.5 }}
                              />
                            </Tooltip>
                          )}
                          {cv.is_parsed && (
                            <Chip
                              label={`${getSectionCount(cv)} sections`}
                              size="small"
                              variant="outlined"
                              sx={{ borderRadius: 1.5 }}
                            />
                          )}
                        </Stack>

                        {/* File Info */}
                        <Box sx={{ mb: 2 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Created {formatDateTime(cv.created_at)}
                            </Typography>
                          </Stack>
                          {cv.updated_at && cv.updated_at !== cv.created_at && (
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <EditIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                Modified {formatDateTime(cv.updated_at)}
                              </Typography>
                            </Stack>
                          )}
                        </Box>

                        {/* Processing Status */}
                        {!cv.is_parsed && !cv.parse_error && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Processing your CV...
                            </Typography>
                            <LinearProgress sx={{ borderRadius: 1 }} />
                          </Box>
                        )}

                        {/* Error Status */}
                        {cv.parse_error && (
                          <Box
                            sx={{
                              p: 2,
                              backgroundColor: "error.light",
                              borderRadius: 1,
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="error.dark"
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                              }}
                            >
                              Processing Error
                            </Typography>
                            <Typography
                              variant="body2"
                              color="error.dark"
                              sx={{
                                fontSize: "0.8rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {cv.parse_error}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>

                      {/* CV Actions */}
                      <CardActions sx={{ p: 2, pt: 0 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ width: "100%" }}
                          alignItems="center"
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/cv/${cv.id}`)}
                            disabled={!cv.is_parsed && !cv.parse_error}
                            data-testid={`edit-cv-button-${cv.id}`}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              borderColor: "#1976d2",
                              color: "#1976d2",
                              flex: 1,
                              "&:hover": {
                                backgroundColor: "rgba(25, 118, 210, 0.1)",
                                borderColor: "#1976d2",
                              },
                            }}
                          >
                            {!cv.is_parsed && !cv.parse_error ? "Processing..." : "Edit CV"}
                          </Button>
                          <Tooltip title="Duplicate this CV">
                            <IconButton
                              size="small"
                              onClick={() => handleDuplicate(cv)}
                              sx={{
                                color: "#1976d2",
                                "&:hover": {
                                  backgroundColor: "rgba(25, 118, 210, 0.1)",
                                },
                              }}
                            >
                              <DuplicateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete this CV">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setCvToDelete(cv);
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`delete-cv-button-${cv.id}`}
                              sx={{
                                color: "#f44336",
                                "&:hover": {
                                  backgroundColor: "rgba(244, 67, 54, 0.1)",
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <CVQuickActions
                            cv={cv}
                            onDuplicate={handleDuplicate}
                            onRename={(cv, newTitle) => handleTitleSave(cv, newTitle)}
                            onDownload={() => {}}
                            onCreateSimilar={() => {}}
                          />
                        </Stack>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}


        {/* Empty state - Welcome banner when no CVs */}
        {cvs.length === 0 && (
          <Paper
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 3,
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            }}
          >
            <DocumentIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome to CV Optimizer
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 600, mx: "auto" }}
            >
              Create professional CVs from scratch or upload existing ones to
              enhance them with AI-powered optimization. Get started by creating
              your first CV or uploading an existing document.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                size="large"
                startIcon={<TemplateIcon />}
                onClick={handleCreateFromTemplate}
                disabled={creating}
                data-testid="create-cv-from-template-empty-state-button"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                }}
              >
                {creating ? "Creating..." : "Create CV from Template"}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleStartFromScratch}
                disabled={creating}
                data-testid="start-from-scratch-empty-state-button"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                }}
              >
                {creating ? "Creating..." : "Start from Scratch"}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<UploadIcon />}
                onClick={() => setUploadOpen(true)}
                data-testid="upload-cv-empty-state-button"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                }}
              >
                Upload Existing CV
              </Button>
            </Stack>
          </Paper>
        )}

        <CVUpload
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false);
            showSuccess(
              "Success",
              "CV uploaded successfully and is being parsed",
            );
            // The CV store already adds the new CV to the list, no need to fetch
            // The store will handle polling for parsing updates automatically
          }}
        />

        {/* Template Selector */}
        <CVTemplateSelector
          open={templateSelectorOpen}
          onClose={() => setTemplateSelectorOpen(false)}
          onSelectTemplate={handleTemplateSelect}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box
                    sx={{
                      display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <WarningIcon color="warning" />
              Delete CV
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{cvToDelete?.original_filename}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
            >
              Delete CV
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Toast */}
        <NotificationToast
          onOpenDrawer={() => notificationDrawerRef.current?.openDrawer()}
        />

        {/* Notification Drawer */}
        <NotificationDrawer ref={notificationDrawerRef} />

        {/* Job Descriptions Modal */}
        <JobDescriptionsModal
          open={jobDescriptionModalOpen}
          onClose={handleJobDescriptionModalClose}
          onJobDescriptionCreated={() => {
            // Force a re-render by reloading job descriptions
            // This ensures the Dashboard shows the newly created JD
            loadJobDescriptions();
          }}
          cvId="" // No CV context when creating from Dashboard
          editingJobDescription={editingJobDescription}
        />

      </Container>
    </Box>
  );
};

export default Dashboard;
