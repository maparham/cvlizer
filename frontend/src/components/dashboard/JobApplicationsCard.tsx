/**
 * Job Applications Card Component
 *
 * This module displays the job applications section on the Dashboard,
 * showing recent job descriptions with status indicators and quick actions.
 *
 * Key responsibilities:
 * - Display status chips showing open/applied/archived counts
 * - View toggle (card / list) with persisted preference
 * - Card view: horizontal scrollable list of recent job descriptions
 * - List view: sortable JobApplicationsTable
 * - Provide "New Job" and "View All" action buttons
 *
 * Usage:
 * - Used in Dashboard component to show recent job applications
 * - Integrates with JobDescriptionCard for individual card display
 * - Connects to job description state and handlers
 */

import React, { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import { JobDescriptionCard } from "../cv/ai";
import { JobDescription } from "../../types/ai";
import JobApplicationsTable, { JobTableSortColumn } from "./JobApplicationsTable";

interface JobApplicationsCardProps {
  jobDescriptions: JobDescription[];
  statusCounts: { open: number; applied: number; archived: number };
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  tableSortBy: JobTableSortColumn;
  tableSortDirection: "asc" | "desc";
  onTableSortChange: (sortBy: JobTableSortColumn, sortDirection: "asc" | "desc") => void;
  onEditJobDescription: (jd: JobDescription) => void;
  onUpdateStatus: (jd: JobDescription) => void;
  onAddJob: () => void;
  onViewAll: () => void;
  onSharingMutation?: () => void;
}

const JobApplicationsCard: React.FC<JobApplicationsCardProps> = ({
  jobDescriptions,
  statusCounts,
  viewMode,
  onViewModeChange,
  tableSortBy,
  tableSortDirection,
  onTableSortChange,
  onEditJobDescription,
  onUpdateStatus,
  onAddJob,
  onViewAll,
  onSharingMutation,
}) => {
  const cardViewJDs = useMemo(() => {
    const copy = [...jobDescriptions];
    copy.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
    return copy.slice(0, 10);
  }, [jobDescriptions]);

  return (
    <Card
      sx={{
        mb: 5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 1,
        "&:hover": {
          boxShadow: 4,
          transition: "box-shadow 0.2s ease-in-out",
        },
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={{ xs: 2, sm: 0 }}
          sx={{ mb: 4 }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              flex: { xs: "none", sm: 1 },
              letterSpacing: "-0.025em",
            }}
          >
            Job Applications
          </Typography>
          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              flex: { xs: "none", sm: 1 },
              justifyContent: { xs: "flex-start", sm: "center" },
              gap: 1.5,
            }}
          >
            <Chip
              label={`${statusCounts.open} Open`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: "success.main",
                color: "success.dark",
                fontWeight: 600,
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                  borderColor: "success.dark",
                },
              }}
            />
            <Chip
              label={`${statusCounts.applied} Applied`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: "grey.400",
                color: "grey.700",
                fontWeight: 600,
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                  borderColor: "grey.600",
                },
              }}
            />
            <Chip
              label={`${statusCounts.archived} Archived`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: "grey.400",
                color: "grey.600",
                fontWeight: 600,
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                  borderColor: "grey.600",
                },
              }}
            />
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            flexWrap="wrap"
            sx={{
              flex: { xs: "none", sm: 1 },
              justifyContent: { xs: "flex-start", sm: "flex-end" },
              gap: 1.5,
            }}
          >
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_e, mode: "card" | "list" | null) => {
                if (mode !== null) onViewModeChange(mode);
              }}
              size="small"
              sx={{ mr: 1 }}
            >
              <Tooltip title="Card view">
                <ToggleButton value="card" aria-label="Card view">
                  <ViewModuleIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="List view">
                <ToggleButton value="list" aria-label="List view">
                  <ViewListIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddJob}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                px: 3,
                py: 1.5,
                borderRadius: 2,
                boxShadow: 2,
                "&:hover": {
                  boxShadow: 4,
                },
              }}
            >
              New Job
            </Button>
            <Button
              variant="outlined"
              onClick={onViewAll}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                px: 3,
                py: 1.5,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              View All
            </Button>
          </Stack>
        </Stack>

        {jobDescriptions.length > 0 && (
          <Box
            sx={{
              maxHeight: 600,
              overflowY: viewMode === "list" ? "auto" : "unset",
              pr: viewMode === "list" ? 1 : 0,
              "&::-webkit-scrollbar": { width: 8 },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#f1f1f1",
                borderRadius: 4,
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#c1c1c1",
                borderRadius: 4,
                "&:hover": { backgroundColor: "#a8a8a8" },
              },
            }}
          >
            {viewMode === "card" ? (
              /* Horizontal scrollable card view */
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  overflowX: "auto",
                  pt: 1,
                  pb: 1,
                  "&::-webkit-scrollbar": { height: 6 },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1",
                    borderRadius: 3,
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#c1c1c1",
                    borderRadius: 3,
                    "&:hover": { backgroundColor: "#a8a8a8" },
                  },
                }}
              >
                {cardViewJDs.map((jd) => (
                    <Box
                      key={jd.id}
                      sx={{
                        minWidth: 280,
                        maxWidth: 280,
                        opacity:
                          (jd.status || "open") === "open"
                            ? 1
                            : (jd.status || "open") === "applied"
                            ? 0.75
                            : 0.6,
                        filter:
                          (jd.status || "open") === "open"
                            ? "none"
                            : (jd.status || "open") === "applied"
                            ? "grayscale(15%) brightness(0.98)"
                            : "grayscale(40%) brightness(0.96)",
                        backgroundColor:
                          (jd.status || "open") === "open"
                            ? "transparent"
                            : (jd.status || "open") === "applied"
                            ? "rgba(0,0,0,0.02)"
                            : "rgba(0,0,0,0.04)",
                        borderRadius: 1,
                        "&:hover": {
                          transform:
                            (jd.status || "open") === "open"
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
                        onEdit={onEditJobDescription}
                        onStatusUpdate={onUpdateStatus}
                        onSharingMutation={onSharingMutation}
                      />
                    </Box>
                  ))}
              </Box>
            ) : (
              /* Sortable table view */
              <JobApplicationsTable
                jobDescriptions={jobDescriptions}
                sortBy={tableSortBy}
                sortDirection={tableSortDirection}
                onSortChange={onTableSortChange}
                onEditJobDescription={onEditJobDescription}
                onUpdateStatus={onUpdateStatus}
                onSharingMutation={onSharingMutation}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default JobApplicationsCard;
