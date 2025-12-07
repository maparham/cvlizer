/**
 * Job Applications Card Component
 *
 * This module displays the job applications section on the Dashboard,
 * showing recent job descriptions with status indicators and quick actions.
 *
 * Key responsibilities:
 * - Display status chips showing open/applied/archived counts
 * - Render horizontal scrollable list of recent job descriptions
 * - Provide "New Job" and "View All" action buttons
 * - Show job description cards with sorting (newest first)
 * - Apply visual styling based on application status
 *
 * Usage:
 * - Used in Dashboard component to show recent job applications
 * - Integrates with JobDescriptionCard for individual card display
 * - Connects to job description state and handlers
 */

import React from "react";
import { Card, CardContent, Typography, Button, Stack, Chip, Box } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { JobDescriptionCard } from "../cv/ai";
import { JobDescription } from "../../types/ai";

interface JobApplicationsCardProps {
  jobDescriptions: JobDescription[];
  statusCounts: { open: number; applied: number; archived: number };
  onEditJobDescription: (jd: JobDescription) => void;
  onUpdateStatus: (jd: JobDescription) => void;
  onAddJob: () => void;
  onViewAll: () => void;
}

const JobApplicationsCard: React.FC<JobApplicationsCardProps> = ({
  jobDescriptions,
  statusCounts,
  onEditJobDescription,
  onUpdateStatus,
  onAddJob,
  onViewAll,
}) => {
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
        <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              flex: 1,
              letterSpacing: "-0.025em",
            }}
          >
            Job Applications
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flex: 1, justifyContent: "center" }}>
            <Chip
              label={`${statusCounts.open} Open`}
              size="small"
              sx={{
                backgroundColor: "success.light",
                color: "success.dark",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "success.main",
                  color: "success.contrastText",
                },
              }}
            />
            <Chip
              label={`${statusCounts.applied} Applied`}
              size="small"
              sx={{
                backgroundColor: "grey.300",
                color: "grey.700",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "grey.400",
                  color: "grey.800",
                },
              }}
            />
            <Chip
              label={`${statusCounts.archived} Archived`}
              size="small"
              sx={{
                backgroundColor: "grey.100",
                color: "grey.600",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "grey.200",
                },
              }}
            />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ flex: 1, justifyContent: "flex-end" }}>
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
                      onEdit={onEditJobDescription}
                      onStatusUpdate={onUpdateStatus}
                    />
                  </Box>
                ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default JobApplicationsCard;
