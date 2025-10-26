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
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CVUpload, EditableTitle } from "../components/cv";
import CVTemplateSelector from "../components/cv/CVTemplateSelector";
import CVQuickActions from "../components/cv/CVQuickActions";
import { JobDescriptionsModal, JobDescriptionCard } from "../components/cv/ai";
import JobDescriptionStatusDialog from "../components/cv/ai/JobDescriptionStatusDialog";
import { useCVStore } from "../stores/cv";
import { useAIStore } from "../stores/ai";
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
import { cvApi } from "../services/api";


const Dashboard: React.FC = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<CV | null>(null);
  const [jobDescriptionModalOpen, setJobDescriptionModalOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] = useState<JobDescription | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusEditingJobDescription, setStatusEditingJobDescription] = useState<JobDescription | null>(null);
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

  const handleUpdateStatus = (jd: JobDescription) => {
    setStatusEditingJobDescription(jd);
    setStatusDialogOpen(true);
  };

  const handleStatusDialogClose = () => {
    setStatusDialogOpen(false);
    setStatusEditingJobDescription(null);
  };

  const handleStatusSave = async (updates: {
    status?: string;
    application_date?: string;
    notes?: string;
  }) => {
    if (!statusEditingJobDescription) return;

    try {
      const { updateJobDescription } = useAIStore.getState();
      await updateJobDescription(statusEditingJobDescription.id, updates);
      showSuccess("Status updated successfully");
    } catch (error) {
      showError("Error", "Failed to update status");
    }
  };

  const handleDownloadCV = async (cv: CV) => {
    try {
      await cvApi.downloadCV(cv.id, cv.original_filename);
      showSuccess("Success", "CV downloaded successfully");
      logUserAction("cv_downloaded", { cv_id: cv.id });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || error?.message || "Failed to download CV";
      showError("Error", errorMessage);
    }
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
      <AppBar position="static" sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        boxShadow: 1,
        borderBottom: "1px solid",
        borderColor: "divider"
      }}>
        <Toolbar sx={{ minHeight: "64px !important", px: 3 }}>
          <Link to="/" style={{ textDecoration: "none", color: "inherit", flexGrow: 1 }}>
            <Typography variant="h5" component="div" sx={{
              color: "text.primary",
              cursor: "pointer",
              fontWeight: 700,
              letterSpacing: "-0.025em"
            }}>
              CV Optimizer
            </Typography>
          </Link>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{
              color: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                color: "text.primary"
              }
            }}
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

      <Container maxWidth="lg" sx={{ mt: 6, mb: 6, px: 3 }}>
            {/* Job Applications Card */}
            <Card
              sx={{
                mb: 5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 1,
                "&:hover": {
                  boxShadow: 4,
                  transition: "box-shadow 0.2s ease-in-out"
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
                  <Typography variant="h5" sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    flex: 1,
                    letterSpacing: "-0.025em"
                  }}>
                    Job Applications
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ flex: 1, justifyContent: "center" }}>
                    <Chip
                      label={`${jdStatusCounts.open} Open`}
                      size="small"
                      sx={{
                        backgroundColor: "success.light",
                        color: "success.dark",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "success.main",
                          color: "success.contrastText"
                        }
                      }}
                    />
                    <Chip
                      label={`${jdStatusCounts.applied} Applied`}
                      size="small"
                      sx={{
                        backgroundColor: "info.light",
                        color: "info.dark",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "info.main",
                          color: "info.contrastText"
                        }
                      }}
                    />
                    <Chip
                      label={`${jdStatusCounts.archived} Archived`}
                      size="small"
                      sx={{
                        backgroundColor: "grey.100",
                        color: "grey.600",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "grey.200"
                        }
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ flex: 1, justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setJobDescriptionModalOpen(true)}
                      sx={{
                        fontWeight: 600,
                        textTransform: "none",
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        boxShadow: 2,
                        "&:hover": {
                          boxShadow: 4
                        }
                      }}
                    >
                      New Job
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/applications")}
                      sx={{
                        fontWeight: 600,
                        textTransform: "none",
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        "&:hover": {
                          backgroundColor: "action.hover"
                        }
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
                        pt: 1,
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
                              // Visual distinction based on status
                              opacity: (jd.status || "open") === "open" ? 1 : (jd.status || "open") === "applied" ? 0.75 : 0.6,
                              filter: (jd.status || "open") === "open"
                                ? "none"
                                : (jd.status || "open") === "applied"
                                ? "grayscale(15%) brightness(0.98)"
                                : "grayscale(40%) brightness(0.96)",
                              backgroundColor: (jd.status || "open") === "open"
                                ? "transparent"
                                : (jd.status || "open") === "applied"
                                ? "rgba(0,0,0,0.02)"
                                : "rgba(0,0,0,0.04)",
                              borderRadius: 1,
                              "&:hover": {
                                transform: (jd.status || "open") === "open"
                                  ? "translateY(-2px)"
                                  : (jd.status || "open") === "applied"
                                  ? "translateY(-1px)"
                                  : "none",
                                transition: "transform 0.2s ease-in-out",
                              },
                            }}
                          >
                            <JobDescriptionCard
                              jobDescription={jd}
                              isParsing={jd.is_parsing}
                              variant="default"
                              showSelectButton={false}
                              onEdit={handleEditJobDescription}
                              onStatusUpdate={handleUpdateStatus}
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
          </>
        ) : (
          // Compact card view when user has CVs - matching Job Applications style
          <Card
            sx={{
              mb: 5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 1,
              "&:hover": {
                boxShadow: 4,
                transition: "box-shadow 0.2s ease-in-out"
              },
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  flex: 1,
                  letterSpacing: "-0.025em"
                }}>
                  My CVs
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ flex: 1, justifyContent: "center" }}>
                  <Chip
                    label={`${cvStatusCounts.parsed} Ready`}
                    size="small"
                    sx={{
                      backgroundColor: "success.light",
                      color: "success.dark",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "success.main",
                        color: "success.contrastText"
                      }
                    }}
                  />
                  <Chip
                    label={`${cvStatusCounts.parsing} Processing`}
                    size="small"
                    sx={{
                      backgroundColor: "warning.light",
                      color: "warning.dark",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "warning.main",
                        color: "warning.contrastText"
                      }
                    }}
                  />
                  {cvStatusCounts.error > 0 && (
                    <Chip
                      label={`${cvStatusCounts.error} Errors`}
                      size="small"
                      sx={{
                        backgroundColor: "error.light",
                        color: "error.dark",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "error.main",
                          color: "error.contrastText"
                        }
                      }}
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={2} sx={{ flex: 1, justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    startIcon={<TemplateIcon />}
                    onClick={handleCreateFromTemplate}
                    disabled={creating}
                    data-testid="create-from-template-button"
                    sx={{
                      fontWeight: 600,
                      textTransform: "none",
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                      "&:hover": {
                        backgroundColor: "action.hover"
                      }
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
                      fontWeight: 600,
                      textTransform: "none",
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                      "&:hover": {
                        backgroundColor: "action.hover"
                      }
                    }}
                  >
                    From Scratch
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => setUploadOpen(true)}
                    data-testid="upload-cv-button"
                    sx={{
                      fontWeight: 600,
                      textTransform: "none",
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      boxShadow: 2,
                      whiteSpace: "nowrap",
                      "&:hover": {
                        boxShadow: 4
                      }
                    }}
                  >
                    Upload
                  </Button>
                </Stack>
              </Stack>

              {/* Full CV Cards Grid - Scrollable */}
              <Box
                sx={{
                  maxHeight: 600,
                  overflowY: "auto",
                  pr: 1,
                  pt: 2,
                  "&::-webkit-scrollbar": {
                    width: 8,
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1",
                    borderRadius: 4,
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#c1c1c1",
                    borderRadius: 4,
                    "&:hover": {
                      backgroundColor: "#a8a8a8",
                    },
                  },
                }}
              >
                <Grid container spacing={3}>
                  {cvs.map((cv) => (
                    <Grid item xs={12} sm={6} lg={4} key={cv.id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: 2,
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 6,
                          borderColor: "primary.light"
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1, p: 3 }}>
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
                                  handleDownloadCV(cv);
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
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/cv/${cv.id}`)}
                            disabled={!cv.is_parsed && !cv.parse_error}
                            data-testid={`edit-cv-button-${cv.id}`}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              flex: 1,
                              borderRadius: 2,
                              boxShadow: 1,
                              "&:hover": {
                                boxShadow: 2
                              },
                              "&:disabled": {
                                backgroundColor: "action.disabled",
                                color: "action.disabled"
                              }
                            }}
                          >
                            {!cv.is_parsed && !cv.parse_error ? "Processing..." : "Edit CV"}
                          </Button>
                          <Tooltip title="Duplicate this CV">
                            <IconButton
                              size="small"
                              onClick={() => handleDuplicate(cv)}
                              sx={{
                                color: "primary.main",
                                "&:hover": {
                                  backgroundColor: "primary.light",
                                  color: "primary.dark"
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
                                color: "error.main",
                                "&:hover": {
                                  backgroundColor: "error.light",
                                  color: "error.dark"
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
              </Box>
            </CardContent>
          </Card>
        )}


        {/* Empty state - Welcome banner when no CVs */}
        {cvs.length === 0 && (
          <Paper
            sx={{
              p: 8,
              textAlign: "center",
              borderRadius: 4,
              background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 3
            }}
          >
            <DocumentIcon sx={{
              fontSize: 96,
              color: "primary.main",
              mb: 4,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))"
            }} />
            <Typography variant="h4" gutterBottom sx={{
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "-0.025em",
              mb: 3
            }}>
              Create or import your CV
            </Typography>
            <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap">
              <Button
                variant="outlined"
                size="large"
                startIcon={<TemplateIcon />}
                onClick={handleCreateFromTemplate}
                disabled={creating}
                data-testid="create-cv-from-template-empty-state-button"
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 5,
                  py: 2,
                  "&:hover": {
                    backgroundColor: "action.hover"
                  },
                  "&:disabled": {
                    backgroundColor: "action.disabled",
                    color: "action.disabled"
                  }
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
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 5,
                  py: 2,
                  "&:hover": {
                    backgroundColor: "action.hover"
                  },
                  "&:disabled": {
                    backgroundColor: "action.disabled",
                    color: "action.disabled"
                  }
                }}
              >
                {creating ? "Creating..." : "Start from Scratch"}
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<UploadIcon />}
                onClick={() => setUploadOpen(true)}
                data-testid="upload-cv-empty-state-button"
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 5,
                  py: 2,
                  boxShadow: 3,
                  "&:hover": {
                    boxShadow: 6
                  }
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

        {/* Status Update Dialog */}
        <JobDescriptionStatusDialog
          open={statusDialogOpen}
          onClose={handleStatusDialogClose}
          jobDescription={statusEditingJobDescription}
          onSave={handleStatusSave}
        />

      </Container>
    </Box>
  );
};

export default Dashboard;
