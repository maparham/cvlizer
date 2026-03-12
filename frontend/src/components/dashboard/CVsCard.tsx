/**
 * CVs Card Component
 *
 * This module displays the "My CVs" section on the Dashboard,
 * providing a card wrapper for the CV grid or table with status indicators and action buttons.
 *
 * Key responsibilities:
 * - Display status chips showing ready/processing/errors counts
 * - Provide action buttons (From Template, Create Empty, Upload)
 * - View toggle (card / list) with persisted preference
 * - Wrap CV grid (card view) or sortable table (list view) in scrollable container
 *
 * Usage:
 * - Used in Dashboard component to display user's CV collection
 * - Card view: accepts CV cards as children in Grid
 * - List view: renders CVsTable with cvs and handlers
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Article as TemplateIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import { CV } from "../../types";
import CVsTable, { CVTableSortColumn } from "./CVsTable";

interface CVsCardProps {
  cvs: CV[];
  statusCounts: { parsed: number; parsing: number; error: number };
  creating: boolean;
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  tableSortBy: CVTableSortColumn;
  tableSortDirection: "asc" | "desc";
  onTableSortChange: (sortBy: CVTableSortColumn, sortDirection: "asc" | "desc") => void;
  onCreateFromTemplate: () => void;
  onStartFromScratch: () => void;
  onUpload: () => void;
  onEdit: (cvId: string) => void;
  onDelete: (cv: CV) => void;
  onDuplicate: (cv: CV) => void;
  onTitleSave: (cv: CV, newTitle: string) => Promise<void>;
  onDownload: (cv: CV) => void;
  onFileSelected: (file: File) => void;
  onValidationError?: (error: string) => void;
  children: React.ReactNode;
}

const CVsCard: React.FC<CVsCardProps> = ({
  cvs,
  statusCounts,
  creating,
  viewMode,
  onViewModeChange,
  tableSortBy,
  tableSortDirection,
  onTableSortChange,
  onCreateFromTemplate,
  onStartFromScratch,
  onUpload,
  onEdit,
  onDelete,
  onDuplicate,
  onTitleSave,
  onDownload,
  onFileSelected,
  onValidationError,
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
            My CVs
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
          <Stack
            direction="row"
            alignItems="center"
            flexWrap={{ xs: "wrap", sm: "nowrap" }}
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
              Create Empty
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

        {/* CV content: grid (card view) or table (list view) */}
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
          {viewMode === "card" ? (
            <Grid container spacing={3}>
              {children}
            </Grid>
          ) : (
            <CVsTable
              cvs={cvs}
              sortBy={tableSortBy}
              sortDirection={tableSortDirection}
              onSortChange={onTableSortChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onTitleSave={onTitleSave}
              onDownload={onDownload}
              onFileSelected={onFileSelected}
              onValidationError={onValidationError}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CVsCard;
