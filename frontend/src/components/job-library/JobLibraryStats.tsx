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
            color={statusFilter === "all" ? "primary" : "default"}
            onClick={() => onStatusFilterChange("all")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                backgroundColor:
                  statusFilter === "all" ? "primary.dark" : "action.hover",
              },
            }}
          />
          <Chip
            label={`Open: ${statusCounts.open}`}
            color={statusFilter === "open" ? "success" : "default"}
            onClick={() => onStatusFilterChange("open")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                backgroundColor:
                  statusFilter === "open" ? "success.dark" : "action.hover",
              },
            }}
          />
          <Chip
            label={`Applied: ${statusCounts.applied}`}
            color={statusFilter === "applied" ? "info" : "default"}
            onClick={() => onStatusFilterChange("applied")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                backgroundColor:
                  statusFilter === "applied" ? "info.dark" : "action.hover",
              },
            }}
          />
          <Chip
            label={`Archived: ${statusCounts.archived}`}
            color="default"
            onClick={() => onStatusFilterChange("archived")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              backgroundColor:
                statusFilter === "archived" ? "grey.200" : "grey.100",
              color: statusFilter === "archived" ? "grey.800" : "grey.600",
              "&:hover": {
                backgroundColor:
                  statusFilter === "archived" ? "grey.300" : "grey.200",
              },
            }}
          />
        </Stack>
      </Container>
    </Box>
  );
};
