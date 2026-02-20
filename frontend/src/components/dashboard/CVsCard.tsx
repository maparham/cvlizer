/**
 * CVs Card Component
 *
 * This module displays the "My CVs" section on the Dashboard,
 * providing a card wrapper for the CV grid with status indicators and action buttons.
 *
 * Key responsibilities:
 * - Display status chips showing ready/processing/errors counts
 * - Provide action buttons (From Template, From Scratch, Upload)
 * - Wrap CV grid with scrollable container
 * - Render children (CVCard components) in Grid layout
 *
 * Usage:
 * - Used in Dashboard component to display user's CV collection
 * - Accepts CV cards as children to render in Grid
 * - Connects to CV creation and management handlers
 */

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Box,
  Grid,
} from "@mui/material";
import { Add as AddIcon, Upload as UploadIcon, Article as TemplateIcon } from "@mui/icons-material";
import { CV } from "../../types";

interface CVsCardProps {
  cvs: CV[];
  statusCounts: { parsed: number; parsing: number; error: number };
  creating: boolean;
  onCreateFromTemplate: () => void;
  onStartFromScratch: () => void;
  onUpload: () => void;
  children: React.ReactNode;
}

const CVsCard: React.FC<CVsCardProps> = ({
  statusCounts,
  creating,
  onCreateFromTemplate,
  onStartFromScratch,
  onUpload,
  children,
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
            My CVs
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flex: 1, justifyContent: "center" }}>
            <Chip
              label={`${statusCounts.parsed} Ready`}
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
              label={`${statusCounts.parsing} Processing`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: "warning.main",
                color: "warning.dark",
                fontWeight: 600,
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                  borderColor: "warning.dark",
                },
              }}
            />
            {statusCounts.error > 0 && (
              <Chip
                label={`${statusCounts.error} Errors`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: "error.main",
                  color: "error.dark",
                  fontWeight: 600,
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "transparent",
                    borderColor: "error.dark",
                  },
                }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ flex: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              startIcon={<TemplateIcon />}
              onClick={onCreateFromTemplate}
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
                  backgroundColor: "action.hover",
                },
              }}
            >
              From Template
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onStartFromScratch}
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
                  backgroundColor: "action.hover",
                },
              }}
            >
              From Scratch
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={onUpload}
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
                  boxShadow: 4,
                },
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
            {children}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CVsCard;
