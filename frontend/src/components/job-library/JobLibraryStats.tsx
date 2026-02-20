/**
 * JobLibrary Stats Component
 *
 * Displays status filter chips showing counts for Total, Open, Applied, and Archived job descriptions.
 *
 * Key responsibilities:
 * - Display status counts
 * - Handle status filter changes
 * - Highlight active filter
 *
 * Usage:
 * - Used to filter job descriptions by status
 * - Requires statusCounts, statusFilter, and onStatusFilterChange props
 */

import React from "react";
import { Box, Container, Stack, Chip } from "@mui/material";

interface StatusCounts {
  total: number;
  open: number;
  applied: number;
  archived: number;
}

interface JobLibraryStatsProps {
  statusCounts: StatusCounts;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const JobLibraryStats: React.FC<JobLibraryStatsProps> = ({
  statusCounts,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Chip
            label={`Total: ${statusCounts.total}`}
            variant="outlined"
            onClick={() => onStatusFilterChange("all")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              borderColor: statusFilter === "all" ? "primary.main" : "divider",
              color: statusFilter === "all" ? "primary.main" : "text.secondary",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "transparent",
                borderColor: "primary.main",
                color: "primary.main",
              },
            }}
          />
          <Chip
            label={`Open: ${statusCounts.open}`}
            variant="outlined"
            onClick={() => onStatusFilterChange("open")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              borderColor: statusFilter === "open" ? "success.main" : "divider",
              color: statusFilter === "open" ? "success.dark" : "text.secondary",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "transparent",
                borderColor: "success.main",
                color: "success.dark",
              },
            }}
          />
          <Chip
            label={`Applied: ${statusCounts.applied}`}
            variant="outlined"
            onClick={() => onStatusFilterChange("applied")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              borderColor:
                statusFilter === "applied" ? "info.main" : "divider",
              color: statusFilter === "applied" ? "info.dark" : "text.secondary",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "transparent",
                borderColor: "info.main",
                color: "info.dark",
              },
            }}
          />
          <Chip
            label={`Archived: ${statusCounts.archived}`}
            variant="outlined"
            onClick={() => onStatusFilterChange("archived")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              borderColor:
                statusFilter === "archived" ? "grey.600" : "divider",
              color: statusFilter === "archived" ? "grey.800" : "text.secondary",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "transparent",
                borderColor: "grey.600",
                color: "grey.800",
              },
            }}
          />
        </Stack>
      </Container>
    </Box>
  );
};
