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
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
