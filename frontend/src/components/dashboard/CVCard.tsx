/**
 * CV Card Component
 *
 * This module displays an individual CV card in the Dashboard grid,
 * showing CV metadata, status indicators, and action buttons.
 *
 * Key responsibilities:
 * - Display CV title with EditableTitle
 * - Show status icon (ready/parsing/error) with tooltip
 * - Display file type chips (download, modified, sections count)
 * - Show created/modified timestamps
 * - Display processing status or error messages
 * - Provide action buttons (Edit, Duplicate, Delete)
 * - Integrate CVQuickActions for additional options
 *
 * Usage:
 * - Used within CVsCard component, mapped over cvs array
 * - Receives CV data and action handlers as props
 * - Handles individual CV display and interactions
 */

import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import DuplicateIcon from "@mui/icons-material/FileCopy";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { EditableTitle } from "../cv";
import CVQuickActions from "../cv/CVQuickActions";
import { CV } from "../../types";
import {
  getCVStatusIcon,
  getSectionCount,
  isUploadedCV,
  hasBeenEdited,
} from "../../utils/dashboardUtils";
import { formatDateTime } from "../../utils/dateFormat";

interface CVCardProps {
  cv: CV;
  onEdit: (cvId: string) => void;
  onDelete: (cv: CV) => void;
  onDuplicate: (cv: CV) => void;
  onTitleSave: (cv: CV, newTitle: string) => Promise<void>;
  onDownload: (cv: CV) => void;
}

const CVCard: React.FC<CVCardProps> = ({
  cv,
  onEdit,
  onDelete,
  onDuplicate,
  onTitleSave,
  onDownload,
}) => {
  return (
    <Grid item xs={12} sm={6} lg={4} key={cv.id}>
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 2,
          boxSizing: "border-box",
          // Force GPU acceleration to prevent sub-pixel rendering issues
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          WebkitFontSmoothing: "subpixel-antialiased",
          transition: "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.18s ease, box-shadow 0.18s ease",
          transform: "translateZ(0)",
          "&:hover": {
            willChange: "transform, border-color, box-shadow",
            transform: "translateY(-2px) translateZ(0)",
            boxShadow: 6,
            borderColor: "grey.400",
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1, p: 3 }}>
          {/* CV Header with Status */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ flexGrow: 1, mr: 1 }}>
              <EditableTitle
                title={cv.original_filename}
                onSave={(newTitle) => onTitleSave(cv, newTitle)}
                variant="h6"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  lineHeight: 1.2,
                }}
              />
            </Box>
            <Tooltip
              title={
                cv.parse_error
                  ? "Parsing failed"
                  : cv.is_parsed
                  ? "Ready for editing"
                  : "Draft"
              }
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                }}
              >
                {getCVStatusIcon(cv)}
              </Box>
            </Tooltip>
          </Box>

          {/* File Type and Metadata */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {isUploadedCV(cv) && (
              <Tooltip title="Download PDF">
                <Chip
                  label={cv.file_type.split("/")[1].toUpperCase()}
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={<DownloadIcon />}
                  clickable={!cv.parse_error}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!cv.parse_error) {
                      onDownload(cv);
                    }
                  }}
                  sx={{ borderRadius: 1.5 }}
                />
              </Tooltip>
            )}
            {hasBeenEdited(cv) && (
              <Tooltip title="This CV has been modified">
                <Chip
                  label="Modified"
                  size="small"
                  color="warning"
                  variant="outlined"
                  icon={<EditIcon />}
                  sx={{ borderRadius: 1.5 }}
                />
              </Tooltip>
            )}
            {cv.is_parsed && (
              <Chip
                label={`${getSectionCount(cv)} sections`}
                size="small"
                variant="outlined"
                sx={{ borderRadius: 1.5 }}
              />
            )}
          </Stack>

          {/* File Info */}
          <Box sx={{ mb: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Created {formatDateTime(cv.created_at)}
              </Typography>
            </Stack>
            {cv.updated_at && cv.updated_at !== cv.created_at && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <EditIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Modified {formatDateTime(cv.updated_at)}
                </Typography>
              </Stack>
            )}
          </Box>

          {/* Processing Status */}
          {!cv.is_parsed && !cv.parse_error && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Importing your CV...
              </Typography>
              <LinearProgress
                sx={{
                  borderRadius: 1,
                  backgroundColor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "grey.500",
                  },
                }}
              />
            </Box>
          )}

          {/* Error Status */}
          {cv.parse_error && (
            <Box
              sx={{
                p: 2,
                backgroundColor: "error.light",
                borderRadius: 1,
                mb: 2,
              }}
            >
              <Typography
                variant="body2"
                color="error.dark"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                }}
              >
                Processing Error
              </Typography>
              <Typography
                variant="body2"
                color="error.dark"
                sx={{
                  fontSize: "0.8rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {cv.parse_error}
              </Typography>
            </Box>
          )}
        </CardContent>

        {/* CV Actions */}
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ width: "100%" }}
            alignItems="center"
          >
            <Button
              size="small"
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => onEdit(cv.id)}
              disabled={!cv.is_parsed || !!cv.parse_error}
              data-testid={`edit-cv-button-${cv.id}`}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                flex: 1,
                borderRadius: 2,
                boxShadow: 1,
                "&:hover": {
                  boxShadow: 2,
                },
                "&:disabled": {
                  backgroundColor: "action.disabled",
                  color: "action.disabled",
                },
              }}
            >
              {!cv.is_parsed && !cv.parse_error ? "Processing..." : "Edit CV"}
            </Button>
            <Tooltip title="Duplicate this CV">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onDuplicate(cv)}
                  disabled={!cv.is_parsed || !!cv.parse_error}
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      backgroundColor: "action.hover",
                      color: "text.primary",
                    },
                  }}
                >
                  <DuplicateIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete this CV">
              <IconButton
                size="small"
                onClick={() => onDelete(cv)}
                data-testid={`delete-cv-button-${cv.id}`}
                sx={{
                  color: "error.main",
                  "&:hover": {
                    backgroundColor: "error.light",
                    color: "error.dark",
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <CVQuickActions
              cv={cv}
              onDuplicate={onDuplicate}
              onRename={(cv, newTitle) => onTitleSave(cv, newTitle)}
              onDownload={onDownload}
            />
          </Stack>
        </CardActions>
      </Card>
    </Grid>
  );
};

export default CVCard;
