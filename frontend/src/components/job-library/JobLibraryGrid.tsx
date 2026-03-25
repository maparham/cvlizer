/**
 * JobLibrary Grid Component
 *
 * Displays job descriptions in a responsive grid layout with empty state.
 *
 * Key responsibilities:
 * - Grid layout with responsive columns
 * - Map job descriptions to JobDescriptionCard components
 * - Display empty state when no jobs match filters
 * - Provide action button in empty state
 *
 * Usage:
 * - Used as the main content area in JobLibrary page
 * - Requires jobs array and action handlers
 */

import React from "react";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { JobDescription } from "../../types/ai";
import JobDescriptionCard from "../cv/ai/JobDescriptionCard";

interface JobLibraryGridProps {
  jobs: JobDescription[];
  searchQuery: string;
  statusFilter: string;
  onEdit: (jobDescription: JobDescription) => void;
  onDelete: (jobDescription: JobDescription) => void;
  onUpdateStatus: (jobDescription: JobDescription) => void;
  onAddJob: () => void;
}

export const JobLibraryGrid: React.FC<JobLibraryGridProps> = ({
  jobs,
  searchQuery,
  statusFilter,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddJob,
}) => {
  const hasActiveFilters = searchQuery || statusFilter !== "all";

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      {jobs.length === 0 ? (
        <Paper
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 2,
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          }}
        >
          <Typography
            variant="h5"
            color="text.primary"
            gutterBottom
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.025em",
              mb: 2,
            }}
          >
            {hasActiveFilters
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
              lineHeight: 1.6,
            }}
          >
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Add your first job description to start tracking your applications"}
          </Typography>
          {!hasActiveFilters && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddJob}
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
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              Add Job Description
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={4}>
          {jobs.map((jd) => (
            <Grid item xs={12} sm={6} lg={4} key={jd.id}>
              <JobDescriptionCard
                jobDescription={jd}
                isActive={false}
                isParsing={jd.is_parsing}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusUpdate={onUpdateStatus}
                showSelectButton={false}
                variant="default"
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};
