/**
 * Job Library Page Component
 *
 * This component provides a dedicated page for managing job descriptions independently
 * of the CV editor. Features include:
 * - Grid view of all user's job descriptions
 * - Search by title, company, or location
 * - Filter by status (open, applied, archived)
 * - Sort by date, company, or title
 * - Create, edit, and delete operations
 * - CV association management
 *
 * Key responsibilities:
 * - Display all job descriptions in a searchable grid
 * - Provide filtering and sorting capabilities
 * - Enable status tracking workflow
 * - Show CV associations for each job description
 * - Integrate with existing JobDescriptionCard and modal components
 *
 * Usage:
 * - Accessible via /applications route
 * - Linked from Dashboard
 * - Uses AI store for state management
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAIStore } from "../stores/ai";
import { JobDescription } from "../types/ai";
import JobDescriptionCard from "../components/cv/ai/JobDescriptionCard";
import JobDescriptionsModal from "../components/cv/ai/JobDescriptionsModal";
import JobDescriptionStatusDialog from "../components/cv/ai/JobDescriptionStatusDialog";
import { useNotifications } from "../packages/notifications";

const JobLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();

  // AI Store state and actions
  const {
    jobDescriptions,
    loadJobDescriptions,
    deleteJobDescription,
    updateJobDescription,
  } = useAIStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] =
    useState<JobDescription | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusEditingJobDescription, setStatusEditingJobDescription] =
    useState<JobDescription | null>(null);

  // Load job descriptions on mount
  useEffect(() => {
    loadJobDescriptions();
  }, [loadJobDescriptions]);

  // Filter and sort job descriptions
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = [...jobDescriptions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (jd) =>
          jd.title?.toLowerCase().includes(query) ||
          jd.company?.toLowerCase().includes(query) ||
          jd.location?.toLowerCase().includes(query) ||
          jd.content.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((jd) => (jd.status || "open") === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "company":
          return (a.company || "").localeCompare(b.company || "");
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobDescriptions, searchQuery, statusFilter, sortBy]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      total: jobDescriptions.length,
      open: jobDescriptions.filter((jd) => (jd.status || "open") === "open").length,
      applied: jobDescriptions.filter((jd) => jd.status === "applied").length,
      archived: jobDescriptions.filter((jd) => jd.status === "archived").length,
    };
  }, [jobDescriptions]);

  const handleEditJobDescription = useCallback((jd: JobDescription) => {
    setEditingJobDescription(jd);
    setIsModalOpen(true);
  }, []);

  const handleDeleteJobDescription = useCallback(
    async (jd: JobDescription) => {
      if (window.confirm(`Are you sure you want to delete "${jd.title || "this job description"}"?`)) {
        try {
          await deleteJobDescription(jd.id);
          showSuccess("Job description deleted successfully");
        } catch (error) {
          showError("Error", "Failed to delete job description");
        }
      }
    },
    [deleteJobDescription, showSuccess, showError]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingJobDescription(null);
  }, []);

  const handleUpdateStatus = useCallback((jd: JobDescription) => {
    setStatusEditingJobDescription(jd);
    setStatusDialogOpen(true);
  }, []);

  const handleStatusDialogClose = useCallback(() => {
    setStatusDialogOpen(false);
    setStatusEditingJobDescription(null);
  }, []);

  const handleStatusSave = useCallback(
    async (updates: {
      status?: string;
      application_date?: string;
      notes?: string;
    }) => {
      if (!statusEditingJobDescription) return;

      try {
        await updateJobDescription(statusEditingJobDescription.id, updates);
        showSuccess("Status updated successfully");
      } catch (error) {
        showError("Error", "Failed to update status");
      }
    },
    [statusEditingJobDescription, updateJobDescription, showSuccess, showError]
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 3,
          boxShadow: 1
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" spacing={3}>
            <IconButton
              onClick={() => navigate("/dashboard")}
              edge="start"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  color: "text.primary"
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                color: "text.primary",
                letterSpacing: "-0.025em"
              }}
            >
              Job Applications
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsModalOpen(true)}
              size="large"
              sx={{
                fontWeight: 600,
                textTransform: "none",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                boxShadow: 2,
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-1px)"
                },
                transition: "all 0.2s ease-in-out"
              }}
            >
              New Application
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Stats Bar */}
      <Box sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        py: 3
      }}>
        <Container maxWidth="xl">
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip
              label={`Total: ${statusCounts.total}`}
              color={statusFilter === "all" ? "primary" : "default"}
              onClick={() => setStatusFilter("all")}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: statusFilter === "all" ? "primary.dark" : "action.hover"
                }
              }}
            />
            <Chip
              label={`Open: ${statusCounts.open}`}
              color={statusFilter === "open" ? "success" : "default"}
              onClick={() => setStatusFilter("open")}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: statusFilter === "open" ? "success.dark" : "action.hover"
                }
              }}
            />
            <Chip
              label={`Applied: ${statusCounts.applied}`}
              color={statusFilter === "applied" ? "info" : "default"}
              onClick={() => setStatusFilter("applied")}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: statusFilter === "applied" ? "info.dark" : "action.hover"
                }
              }}
            />
            <Chip
              label={`Archived: ${statusCounts.archived}`}
              color={statusFilter === "archived" ? "default" : "default"}
              onClick={() => setStatusFilter("archived")}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                backgroundColor: statusFilter === "archived" ? "grey.200" : "grey.100",
                color: statusFilter === "archived" ? "grey.800" : "grey.600",
                "&:hover": {
                  backgroundColor: statusFilter === "archived" ? "grey.300" : "grey.200"
                }
              }}
            />
          </Stack>
        </Container>
      </Box>

      {/* Search and Filters */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 1,
            "&:hover": {
              boxShadow: 2
            },
            transition: "box-shadow 0.2s ease-in-out"
          }}
        >
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
            <TextField
              fullWidth
              placeholder="Search by title, company, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                minWidth: 300,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.light"
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
                sx={{
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.light"
                  }
                }}
              >
                <MenuItem value="recent">Most Recent</MenuItem>
                <MenuItem value="company">Company</MenuItem>
                <MenuItem value="title">Job Title</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>
      </Container>

      {/* Job Descriptions Grid */}
      <Container maxWidth="xl" sx={{ pb: 6 }}>
        {filteredAndSortedJobs.length === 0 ? (
          <Paper
            sx={{
              p: 8,
              textAlign: "center",
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 2,
              background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
            }}
          >
            <Typography
              variant="h5"
              color="text.primary"
              gutterBottom
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.025em",
                mb: 2
              }}
            >
              {searchQuery || statusFilter !== "all"
                ? "No job descriptions match your filters"
                : "No job descriptions yet"}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mb: 4,
                maxWidth: 500,
                mx: "auto",
                lineHeight: 1.6
              }}
            >
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first job description to start tracking your applications"}
            </Typography>
            {!searchQuery && statusFilter === "all" && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsModalOpen(true)}
                size="large"
                sx={{
                  fontWeight: 600,
                  textTransform: "none",
                  px: 5,
                  py: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-1px)"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                Add Job Description
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={4}>
            {filteredAndSortedJobs.map((jd) => (
              <Grid item xs={12} sm={6} lg={4} key={jd.id}>
                <JobDescriptionCard
                  jobDescription={jd}
                  isActive={false}
                  isParsing={jd.is_parsing}
                  onEdit={handleEditJobDescription}
                  onDelete={handleDeleteJobDescription}
                  onStatusUpdate={handleUpdateStatus}
                  showSelectButton={false}
                  variant="default"
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Job Description Modal */}
      <JobDescriptionsModal
        open={isModalOpen}
        onClose={handleModalClose}
        cvId="" // No CV context in job library
        editingJobDescription={editingJobDescription}
      />

      {/* Status Update Dialog */}
      <JobDescriptionStatusDialog
        open={statusDialogOpen}
        onClose={handleStatusDialogClose}
        jobDescription={statusEditingJobDescription}
        onSave={handleStatusSave}
      />
    </Box>
  );
};

export default JobLibrary;
