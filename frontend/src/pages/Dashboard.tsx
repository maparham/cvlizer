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
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Chip,
  LinearProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  CardActions,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Pagination,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Description as DocumentIcon,
  Schedule as ScheduleIcon,
  EditNote as EditedIcon,
  Article as TemplateIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CVUpload, EditableTitle } from "../components/cv";
import CVTemplateSelector from "../components/cv/CVTemplateSelector";
import CVQuickActions from "../components/cv/CVQuickActions";
import { useCVStore } from "../stores/cvStore";
import { useNotifications } from "../packages/notifications";
import { useActivityLogger } from "../hooks/useActivityLogger";
import { NotificationDrawer, NotificationToast, NotificationDrawerRef } from "../packages/notifications";
import { cvApi } from "../services/api";
import { CV } from "../types";
import {
  isUploadedCV,
  hasBeenEdited,
  getCVStatusIcon,
  getSectionCount,
} from "../utils/dashboardUtils";
import { formatDateTime } from "../utils/dateFormat";

const Dashboard: React.FC = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [creatingSimilar, setCreatingSimilar] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<CV | null>(null);
  const notificationDrawerRef = useRef<NotificationDrawerRef>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "parsed" | "parsing" | "error"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "created" | "modified">(
    "modified",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const {
    logout,
    isAdmin: authIsAdmin,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, notifications, removeNotification } =
    useNotifications();
  const { logUserAction } = useActivityLogger();

  // Use CV store instead of local state
  const {
    cvs,
    loading,
    error,
    currentPage,
    totalPages,
    totalCVs,
    fetchCVs,
    setPage,
    createTemporaryCV,
    saveTemporaryCV,
    updateCVTitle,
    deleteCV: deleteCVFromStore,
    duplicateCV: duplicateCVFromStore,
  } = useCVStore();

  // Fetch CVs on component mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchCVs();
      // Log dashboard view (page view is already logged by useActivityLogger)
      logUserAction("dashboard_view", "User viewed dashboard");
    }
  }, [isAuthenticated, authLoading]); // Depend on auth state only

  // Show error notifications
  useEffect(() => {
    if (error) {
      showError("Error", error);
    }
  }, [error]); // Remove showError from dependencies to prevent infinite loop

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

  const handleDeleteClick = (cv: CV) => {
    setCvToDelete(cv);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCvToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!cvToDelete) return;

    setDeleting(true);
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
    } finally {
      setDeleting(false);
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

  const handleDownloadCV = async (cv: CV) => {
    if (downloading) return;

    setDownloading(true);
    try {
      await cvApi.downloadCV(cv.id, cv.original_filename);
      showSuccess("Success", "CV download started");
    } catch (error) {
      showError("Error", "Failed to download CV");
    } finally {
      setDownloading(false);
    }
  };

  const handleDuplicateCV = async (cv: CV) => {
    if (duplicating) return;

    setDuplicating(true);
    try {
      await duplicateCVFromStore(cv.id);
      showSuccess(
        "Success",
        `CV "${cv.original_filename}" duplicated successfully`,
      );
    } catch (error) {
      showError("Error", "Failed to duplicate CV");
    } finally {
      setDuplicating(false);
    }
  };

  const handleCreateSimilarCV = async (cv: CV) => {
    if (creatingSimilar) return;

    setCreatingSimilar(true);
    try {
      // Create a new CV based on the existing one
      const newCV = await createTemporaryCV();

      // Copy the parsed data from the existing CV
      if (cv.parsed_data) {
        newCV.parsed_data = JSON.parse(JSON.stringify(cv.parsed_data));
        newCV.original_filename = `Similar to ${cv.original_filename}`;
      }

      // Save the temporary CV to the backend
      const savedCV = await saveTemporaryCV({
        parsed_data: newCV.parsed_data!,
      });

      navigate(`/cv/${savedCV.id}`);
      showSuccess(
        "Success",
        `Created similar CV based on "${cv.original_filename}"`,
      );
    } catch (error) {
      showError("Error", "Failed to create similar CV");
    } finally {
      setCreatingSimilar(false);
    }
  };

  // Filter and sort CVs
  const filteredAndSortedCVs = useMemo(() => {
    const filtered = cvs.filter((cv) => {
      // Search filter
      const matchesSearch = cv.original_filename
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filterStatus === "parsed") {
        matchesStatus = cv.is_parsed && !cv.parse_error;
      } else if (filterStatus === "parsing") {
        matchesStatus = !cv.is_parsed && !cv.parse_error;
      } else if (filterStatus === "error") {
        matchesStatus = !!cv.parse_error;
      }

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.original_filename.localeCompare(b.original_filename);
      } else if (sortBy === "created") {
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "modified") {
        comparison =
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [cvs, searchTerm, filterStatus, sortBy, sortOrder]);

  // Get status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts = {
      all: cvs.length,
      parsed: cvs.filter((cv) => cv.is_parsed && !cv.parse_error).length,
      parsing: cvs.filter((cv) => !cv.is_parsed && !cv.parse_error).length,
      error: cvs.filter((cv) => !!cv.parse_error).length,
    };
    return counts;
  }, [cvs]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            CV Optimizer
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
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
        {/* Header */}
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
          {/* Only show header buttons when there are CVs */}
          {cvs.length > 0 && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<TemplateIcon />}
                onClick={handleCreateFromTemplate}
                disabled={creating}
                data-testid="create-cv-from-template-button"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {creating ? "Creating..." : "Create CV from Template"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleStartFromScratch}
                disabled={creating}
                data-testid="start-from-scratch-button"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {creating ? "Creating..." : "Start from Scratch"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadOpen(true)}
                data-testid="upload-cv-button"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Upload CV
              </Button>
            </Box>
          )}
        </Box>

        {/* Search and Filter Controls */}
        {cvs.length > 5 && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Stack spacing={3}>
              {/* Search Bar */}
              <TextField
                fullWidth
                placeholder="Search CVs by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-cvs-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Filter and Sort Controls */}
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Status Filter Chips */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <FilterIcon color="action" fontSize="small" />
                  <Chip
                    label={`All (${statusCounts.all})`}
                    variant={filterStatus === "all" ? "filled" : "outlined"}
                    onClick={() => setFilterStatus("all")}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={`Ready (${statusCounts.parsed})`}
                    variant={filterStatus === "parsed" ? "filled" : "outlined"}
                    onClick={() => setFilterStatus("parsed")}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`Processing (${statusCounts.parsing})`}
                    variant={filterStatus === "parsing" ? "filled" : "outlined"}
                    onClick={() => setFilterStatus("parsing")}
                    color="warning"
                    size="small"
                  />
                  {statusCounts.error > 0 && (
                    <Chip
                      label={`Errors (${statusCounts.error})`}
                      variant={filterStatus === "error" ? "filled" : "outlined"}
                      onClick={() => setFilterStatus("error")}
                      color="error"
                      size="small"
                    />
                  )}
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* Sort Controls */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <SortIcon color="action" fontSize="small" />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Sort by</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort by"
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as "name" | "created" | "modified",
                        )
                      }
                    >
                      <MenuItem value="modified">Last Modified</MenuItem>
                      <MenuItem value="created">Date Created</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    sx={{ minWidth: "auto", px: 1 }}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <LinearProgress sx={{ width: 200 }} />
          </Box>
        ) : cvs.length === 0 ? (
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
        ) : filteredAndSortedCVs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <SearchIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No CVs match your search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search terms or filters
            </Typography>
          </Paper>
        ) : (
          <>
            <Grid container spacing={3}>
              {filteredAndSortedCVs.map((cv) => (
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
                                ? "Ready to edit"
                                : "Processing"
                          }
                        >
                          {getCVStatusIcon(cv)}
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
                              icon={<EditedIcon />}
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
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            AI is analyzing your CV...
                          </Typography>
                          <LinearProgress sx={{ borderRadius: 1 }} />
                        </Box>
                      )}

                      {/* Error State */}
                      {cv.parse_error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                          <Typography variant="body2">
                            {cv.parse_error}
                          </Typography>
                        </Alert>
                      )}
                    </CardContent>

                    {/* Action Buttons */}
                    <CardActions
                      sx={{ p: 2, pt: 0, justifyContent: "space-between" }}
                    >
                      <Button
                        size="medium"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/cv/${cv.id}`)}
                        disabled={!cv.is_parsed}
                        data-testid={`edit-cv-button-${cv.id}`}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 600,
                          flexGrow: 1,
                          mr: 1,
                        }}
                      >
                        {cv.is_parsed ? "Edit CV" : "Processing..."}
                      </Button>

                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(cv)}
                        disabled={deleting}
                        color="error"
                        sx={{
                          opacity: 0.7,
                          "&:hover": { opacity: 1 },
                          transition: "opacity 0.2s",
                        }}
                        data-testid={`delete-cv-button-${cv.id}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>

                      <CVQuickActions
                        cv={cv}
                        onDuplicate={handleDuplicateCV}
                        onRename={handleTitleSave}
                        onDownload={handleDownloadCV}
                        onCreateSimilar={handleCreateSimilarCV}
                        duplicating={duplicating}
                        downloading={downloading}
                        creatingSimilar={creatingSimilar}
                      />
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 4,
                }}
              >
                <Stack spacing={2} alignItems="center">
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(_, page) => setPage(page)}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    data-testid="cv-pagination"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Showing {cvs.length} of {totalCVs} CVs
                  </Typography>
                </Stack>
              </Box>
            )}
          </>
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
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{ fontWeight: 600, fontSize: "1.25rem", color: "error.main" }}
            >
              Delete CV
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{cvToDelete?.original_filename}"?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={handleDeleteCancel} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="contained"
              color="error"
              disabled={deleting}
              sx={{ borderRadius: 2 }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Toast */}
        <NotificationToast
          onOpenDrawer={() => notificationDrawerRef.current?.openDrawer()}
        />

        {/* Notification Drawer */}
        <NotificationDrawer ref={notificationDrawerRef} />

      </Container>
    </Box>
  );
};

export default Dashboard;
