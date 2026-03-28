/**
 * Job Description Card Component
 *
 * Reusable card component for displaying job descriptions in both
 * the sidebar and modal contexts. Handles parsing states, errors,
 * and provides action buttons.
 *
 * Key responsibilities:
 * - Display job description details (title, company, location)
 * - Make title clickable when source URL exists
 * - Show parsing/loading states
 * - Show error states
 * - Provide edit, delete/hide, and select actions
 * - Support active/selected state highlighting
 *
 * Usage:
 * - Used in JobDescriptionSummary for sidebar display
 * - Used in JobDescriptionsModal for grid display
 */

import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import WorkIcon from "@mui/icons-material/Work";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import { JobDescription } from "../../../types/ai";
import { formatRelativeTime } from "../../../utils/formatters";
import { MarkdownRenderer } from "../../common";
import { useNotifications } from "../../../packages/notifications";
import { ShareDialog } from "../../sharing/ShareDialog";

/**
 * Strip markdown formatting and convert to plain text
 */
const stripMarkdown = (markdown: string): string => {
  return markdown
    .replace(/#{1,6}\s+/g, "") // Remove headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.+?)\*/g, "$1") // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links (keep text)
    .replace(/`(.+?)`/g, "$1") // Remove inline code
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/>\s+/g, "") // Remove blockquotes
    .replace(/^[-*+]\s+/gm, "") // Remove unordered list markers
    .replace(/^\d+\.\s+/gm, "") // Remove ordered list markers
    .trim();
};

/**
 * Get a clean content snippet without metadata fields like Location, Working hours, etc.
 */
const getCleanSnippet = (content: string, maxLength: number = 200): string => {
  // First strip markdown formatting
  let plain = stripMarkdown(content);

  // Remove common metadata patterns that appear at the start of job descriptions
  // These patterns match lines like "Location: Wien", "Working hours: Full-time", etc.
  plain = plain
    .replace(/^Location:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Working hours:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Occupational Area:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Employment Type:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Salary:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Experience Level:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Job Type:\s*.+?(?:\n|$)/gim, "")
    .replace(/^Remote:\s*.+?(?:\n|$)/gim, "")
    .replace(/\n+/g, " ") // Replace multiple newlines with single space
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // If content is short enough, return as-is
  if (plain.length <= maxLength) {
    return plain;
  }

  // Truncate at last complete word before maxLength
  const truncated = plain.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
};

export interface JobDescriptionCardProps {
  jobDescription: JobDescription;
  isActive?: boolean;
  isParsing?: boolean;
  onEdit?: (jobDescription: JobDescription) => void;
  onDelete?: (jobDescription: JobDescription) => void;
  onHide?: (jobDescriptionId: string) => void;
  onSelect?: (jobDescription: JobDescription) => void;
  onStatusUpdate?: (jobDescription: JobDescription) => void;
  onCancelParsing?: (jobDescription: JobDescription) => Promise<void>;
  showSelectButton?: boolean;
  variant?: "default" | "sidebar";
  maxChipWidth?: number;
  /** Refetch job descriptions after share enable/disable/regenerate */
  onSharingMutation?: () => void;
}

const JobDescriptionCard: React.FC<JobDescriptionCardProps> = ({
  jobDescription,
  isActive = false,
  isParsing: isParsingProp,
  onEdit,
  onDelete,
  onHide,
  onSelect,
  onStatusUpdate,
  onCancelParsing,
  showSelectButton = false,
  variant = "default",
  maxChipWidth: _maxChipWidth,
  onSharingMutation,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isCancellingParse, setIsCancellingParse] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showSuccess, showError } = useNotifications();

  const isParsing = isParsingProp || jobDescription.is_parsing;
  const hasError = jobDescription.parse_error;

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(jobDescription.content);
      showSuccess("Job description copied to clipboard");
    } catch (err) {
      showError("Error", "Failed to copy to clipboard");
    }
  };

  const handleCancelParsing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCancelParsing || isCancellingParse) {
      return;
    }

    setIsCancellingParse(true);
    try {
      await onCancelParsing(jobDescription);
      showSuccess("Parsing cancelled");
    } catch (_err) {
      showError("Error", "Failed to cancel parsing");
    } finally {
      setIsCancellingParse(false);
    }
  };

  // Parsing/Error state card
  if (isParsing || hasError) {
    return (
      <>
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: 2,
          borderColor: hasError ? "error.main" : "warning.main",
          backgroundColor: hasError
            ? "rgba(244, 67, 54, 0.04)"
            : "rgba(255, 193, 7, 0.04)",
          transition: "all 0.2s ease-in-out",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: variant === "sidebar" ? 150 : 200,
          }}
        >
          {jobDescription.is_public_shared && (
            <Box sx={{ alignSelf: "stretch", mb: 1 }}>
              <Tooltip title="Click to manage public sharing">
                <Chip
                  icon={<ShareIcon />}
                  label="Shared"
                  size="small"
                  color="info"
                  variant="outlined"
                  clickable
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareDialogOpen(true);
                  }}
                  sx={{ cursor: "pointer" }}
                />
              </Tooltip>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {hasError ? (
              <>
                <Typography variant="h6" color="error" sx={{ fontWeight: 500 }}>
                  Parsing Failed
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Unable to extract job details from URL
                </Typography>
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ textAlign: "center", maxWidth: 200 }}
                >
                  {jobDescription.parse_error}
                </Typography>
                {onDelete && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => onDelete(jobDescription)}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                )}
              </>
            ) : (
              <>
                <CircularProgress size={40} thickness={4} />
                <Typography
                  variant="h6"
                  color="primary"
                  sx={{ fontWeight: 500 }}
                >
                  Parsing Job Description
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Extracting details from URL...
                </Typography>
                <Box sx={{ width: "100%", maxWidth: 200 }}>
                  <LinearProgress
                    variant="indeterminate"
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "rgba(25, 118, 210, 0.1)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}
                >
                  <HourglassEmptyIcon
                    sx={{ fontSize: 16, color: "text.secondary" }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    This may take a few moments
                  </Typography>
                </Box>
                {onCancelParsing && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={handleCancelParsing}
                    disabled={isCancellingParse}
                    sx={{ mt: 1 }}
                  >
                    {isCancellingParse ? "Cancelling..." : "Cancel parsing"}
                  </Button>
                )}
              </>
            )}
          </Box>
        </CardContent>
      </Card>
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        resourceType="job_description"
        resourceId={jobDescription.id}
        onSharingMutation={onSharingMutation}
      />
      </>
    );
  }

  // Normal job description card
  return (
    <>
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          border: isActive ? 2 : 1,
          borderColor: isActive ? "primary.main" : "divider",
          backgroundColor: "background.paper",
          boxShadow: isActive ? 3 : 1,
          boxSizing: "border-box",
          // Force GPU acceleration to prevent sub-pixel rendering issues
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          WebkitFontSmoothing: "subpixel-antialiased",
          transition: "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
          transform: "translateZ(0)",
          "&:hover": {
            willChange: "transform, border-color, box-shadow",
            boxShadow: isActive ? 6 : 3,
            transform: "translateY(-2px) translateZ(0)",
            borderColor: isActive ? "primary.dark" : "primary.light",
          },
        }}
      >
        <CardContent sx={{ flex: 1, pb: showSelectButton ? 1 : 2 }}>
          {/* Header with title and actions */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1.5,
            }}
          >
            {jobDescription.source_url ? (
              <Typography
                variant="h6"
                component="a"
                href={jobDescription.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  fontWeight: isActive ? 700 : 600,
                  flex: 1,
                  color: "grey.700",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textDecoration: "none",
                  cursor: "pointer",
                  "&:hover": {
                    textDecoration: "underline",
                    opacity: 0.8,
                  },
                }}
              >
                {jobDescription.title || "Untitled Job Description"}
              </Typography>
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: isActive ? 700 : 600,
                  flex: 1,
                  color: "grey.700",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {jobDescription.title || "Untitled Job Description"}
              </Typography>
            )}
            <Box>
              {onEdit && (
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(jobDescription);
                    }}
                    sx={{
                      "&:hover": {
                        backgroundColor: "primary.light",
                        color: "primary.contrastText",
                      },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onHide && (
                <Tooltip title="Remove from sidebar">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHide(jobDescription.id);
                    }}
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        color: "text.secondary",
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(jobDescription);
                    }}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Company, Location, Status, Shared chips */}
          {(jobDescription.company ||
            jobDescription.location ||
            jobDescription.status ||
            jobDescription.is_public_shared) && (
            <Box
              sx={{
                display: "flex",
                gap: 0.75,
                flexWrap: "wrap",
                mb: 1.5,
                justifyContent: "flex-start",
              }}
            >
              {jobDescription.company && (
                <Chip
                  icon={<WorkIcon />}
                  label={jobDescription.company}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: "primary.light",
                    "& .MuiChip-icon": {
                      fontSize: "16px",
                    },
                    flex: "1 1 0",
                    minWidth: 0,
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              )}
              {jobDescription.location && (
                <Chip
                  icon={<LocationOnIcon />}
                  label={jobDescription.location}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: "success.light",
                    "& .MuiChip-icon": {
                      fontSize: "16px",
                    },
                    flex: "1 1 0",
                    minWidth: 0,
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              )}
              {jobDescription.status && (
                <Chip
                  label={jobDescription.status.charAt(0).toUpperCase() + jobDescription.status.slice(1)}
                  size="small"
                  onClick={
                    onStatusUpdate
                      ? (e) => {
                          e.stopPropagation();
                          onStatusUpdate(jobDescription);
                        }
                      : undefined
                  }
                  sx={{
                    backgroundColor:
                      jobDescription.status === "open"
                        ? "rgba(33, 150, 243, 0.1)"
                        : jobDescription.status === "applied"
                        ? "rgba(255, 152, 0, 0.1)"
                        : "rgba(158, 158, 158, 0.1)",
                    color:
                      jobDescription.status === "open"
                        ? "#1976d2"
                        : jobDescription.status === "applied"
                        ? "#ed6c02"
                        : "#757575",
                    fontWeight: 600,
                    cursor: onStatusUpdate ? "pointer" : "default",
                    "&:hover": onStatusUpdate
                      ? {
                          opacity: 0.8,
                        }
                      : {},
                  }}
                />
              )}
              {jobDescription.is_public_shared && (
                <Tooltip title="Click to manage public sharing">
                  <Chip
                    icon={<ShareIcon />}
                    label="Shared"
                    size="small"
                    color="info"
                    variant="outlined"
                    clickable
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareDialogOpen(true);
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                </Tooltip>
              )}
            </Box>
          )}

          {/* Created date */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5 }}
          >
            Added: {formatRelativeTime(jobDescription.created_at)}
          </Typography>

          {/* Content preview - Plain text snippet */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: variant === "sidebar" ? 3 : 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.6,
              mb: 1,
              mt: 0,
            }}
          >
            {getCleanSnippet(
              jobDescription.content,
              variant === "sidebar" ? 150 : 300,
            )}
          </Typography>
        </CardContent>

        {/* Action buttons */}
        <CardActions
          sx={{
            justifyContent: "space-between",
            px: 2,
            pb: 2,
            pt: 0,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {/* Select button (only shown in modal) - moved to left */}
          {showSelectButton && onSelect && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(jobDescription);
              }}
              variant={isActive ? "contained" : "outlined"}
              sx={{ flex: 1, minWidth: "fit-content" }}
            >
              {isActive ? "Selected" : "Select"}
            </Button>
          )}

          {/* Action buttons centered */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              flex: 1,
              justifyContent: "center",
            }}
          >
            {/* Copy content button */}
            <Tooltip title="Copy markdown content">
              <IconButton
                size="small"
                onClick={handleCopyContent}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                    borderColor: "text.secondary",
                  },
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* URL link icon button */}
            {jobDescription.source_url && (
              <Tooltip title="View original posting">
                <IconButton
                  size="small"
                  component="a"
                  href={jobDescription.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                      borderColor: "text.secondary",
                    },
                  }}
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Preview icon button */}
            <Tooltip title="Preview job description">
              <IconButton
                size="small"
                onClick={handlePreviewClick}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "primary.light",
                    color: "primary.contrastText",
                    borderColor: "primary.light",
                  },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share public readonly link">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareDialogOpen(true);
                }}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                    borderColor: "text.secondary",
                  },
                }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </CardActions>
      </Card>

      {/* Job Description Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box>
            {jobDescription.source_url ? (
              <Link
                href={jobDescription.source_url}
                target="_blank"
                rel="noopener noreferrer"
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "text.primary",
                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                }}
              >
                {jobDescription.title || "Untitled Job Description"}
              </Link>
            ) : (
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {jobDescription.title || "Untitled Job Description"}
              </Typography>
            )}
            {/* Metadata chips */}
            {(jobDescription.company ||
              jobDescription.location ||
              jobDescription.is_public_shared) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", overflow: "hidden" }}>
                {jobDescription.company && (
                  <Chip
                    icon={<WorkIcon />}
                    label={jobDescription.company}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: "primary.light",
                      "& .MuiChip-icon": {
                        fontSize: "16px",
                      },
                      flex: "1 1 0",
                      minWidth: 0,
                      "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    }}
                  />
                )}
                {jobDescription.source_url && (
                  <Tooltip title="Open original job posting">
                    <IconButton
                      component="a"
                      href={jobDescription.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        flexShrink: 0,
                        color: "text.secondary",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      <LinkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {jobDescription.location && (
                  <Chip
                    icon={<LocationOnIcon />}
                    label={jobDescription.location}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: "success.light",
                      "& .MuiChip-icon": {
                        fontSize: "16px",
                      },
                      flex: "1 1 0",
                      minWidth: 0,
                      "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    }}
                  />
                )}
                {jobDescription.is_public_shared && (
                  <Tooltip title="Click to manage public sharing">
                    <Chip
                      icon={<ShareIcon />}
                      label="Shared"
                      size="small"
                      color="info"
                      variant="outlined"
                      clickable
                      onClick={() => {
                        handleCloseDialog();
                        setShareDialogOpen(true);
                      }}
                      sx={{ cursor: "pointer" }}
                    />
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <MarkdownRenderer
            content={jobDescription.content}
            variant="body1"
            color="text.primary"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        resourceType="job_description"
        resourceId={jobDescription.id}
        onSharingMutation={onSharingMutation}
      />
    </>
  );
};

export default JobDescriptionCard;
