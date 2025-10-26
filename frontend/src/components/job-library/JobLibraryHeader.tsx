/**
 * JobLibrary Header Component
 *
 * Displays the page header with back button, title, and new application button.
 *
 * Key responsibilities:
 * - Back button navigation to dashboard
 * - Page title display
 * - New Application button trigger
 *
 * Usage:
 * - Used as the header section in JobLibrary page
 * - Requires onAddJob callback for new application action
 */

import React from "react";
import { Box, Container, Typography, Button, Stack, IconButton } from "@mui/material";
import { Add as AddIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface JobLibraryHeaderProps {
  onAddJob: () => void;
}

export const JobLibraryHeader: React.FC<JobLibraryHeaderProps> = ({
  onAddJob,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        py: 3,
        boxShadow: 1,
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
                color: "text.primary",
              },
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
              letterSpacing: "-0.025em",
            }}
          >
            Job Applications
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddJob}
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
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            New Application
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};
