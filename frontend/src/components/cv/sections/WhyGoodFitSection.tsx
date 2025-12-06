/**
 * Why I'm a Good Fit Section Component
 *
 * This component renders the AI-generated "Why I'm a Good Fit" section in the CV.
 * It displays the generated content with confidence score and key matches.
 *
 * Key responsibilities:
 * - Display AI-generated content in a professional format
 * - Show confidence score and key matches
 * - Allow editing and deletion of the section
 * - Integrate with CV editor context for updates
 *
 * Usage:
 * - Used in CVContentArea to render the why_good_fit section
 * - Requires WhyGoodFit data and standard section props
 * - Integrates with CV editor context for state management
 */

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import MarkdownEditor from "../core/MarkdownEditor";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { WhyGoodFit } from "../../../types/cv";
import { EditableTitle } from "../EditableTitle";
import { useNotifications } from "../../../packages/notifications";

interface WhyGoodFitSectionProps {
  data?: WhyGoodFit;
  onUpdate: (data: WhyGoodFit) => void;
  onSave: (data: WhyGoodFit | null, message?: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUnsavedChanges: (hasChanges: boolean) => void;
  title?: string;
  onTitleSave?: (newTitle: string) => Promise<void>;
}

const WhyGoodFitSection: React.FC<WhyGoodFitSectionProps> = ({
  data,
  // onUpdate, // Unused parameter removed
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title,
  onTitleSave,
}) => {
  // Use prop title from section_config (set during approval), fallback to data title, fallback to default
  const sectionTitle = title || data?.title || "Why I'm a Good Fit";
  const { showSuccess } = useNotifications();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editContent, setEditContent] = useState(
    data?.content || data?.fit_analysis || "",
  );

  const copyToClipboard = () => {
    const content = data?.content || data?.fit_analysis || "";
    navigator.clipboard.writeText(content);
    showSuccess("Copied to clipboard");
  };

  const copyKeyMatches = () => {
    if (!data?.key_matches || data.key_matches.length === 0) return;

    const keyMatchesText = [
      "Key Matches",
      "",
      ...data.key_matches.map((match, index) => `${index + 1}. ${match}`),
    ].join("\n");

    navigator.clipboard.writeText(keyMatchesText);
    showSuccess("Key matches copied to clipboard");
  };

  const handleEdit = () => {
    setEditContent(data?.content || data?.fit_analysis || "");
    onEdit();
  };

  const handleSave = () => {
    if (!data) return;

    const updatedData: WhyGoodFit = {
      ...data,
      content: editContent,
      fit_analysis: editContent, // Backend requires both content and fit_analysis
    };

    onSave(updatedData, "Why I'm a Good Fit section updated");
    onClose();
  };

  const handleCancel = () => {
    setEditContent(data?.content || data?.fit_analysis || "");
    onClose();
  };

  const handleDelete = () => {
    if (!data) return;

    // Close edit mode if open
    if (isEditing) {
      onClose();
    }

    // Set section to null to properly delete it
    onSave(null, "Why I'm a Good Fit section deleted");
    setShowDeleteDialog(false);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  if (!data || (!data.content && !data.fit_analysis)) {
    return null;
  }

  return (
    <Box data-section="why_good_fit">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        {onTitleSave ? (
          <EditableTitle
            title={sectionTitle}
            onSave={onTitleSave}
            variant="h5"
            sx={{
              "& .MuiTypography-root": {
                fontWeight: 600,
                color: "primary.main",
              },
            }}
          />
        ) : (
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: 600, color: "primary.main" }}
          >
            {sectionTitle}
          </Typography>
        )}
        <Box display="flex" gap={0.5}>
          <Tooltip title="Copy Content">
            <IconButton onClick={copyToClipboard} size="small">
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Section">
            <IconButton
              onClick={() => setShowDeleteDialog(true)}
              size="small"
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Section">
            <IconButton onClick={handleEdit} size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isEditing ? (
        <Card>
          <CardContent>
            <Box mb={2}>
              <Typography variant="h6" mb={2}>
                Edit Why I'm a Good Fit
              </Typography>
              <MarkdownEditor
                value={editContent}
                onChange={(value) => {
                  const newValue = value || "";
                  setEditContent(newValue);
                  onUnsavedChanges(
                    newValue !== (data?.content || data?.fit_analysis),
                  );
                }}
                placeholder="Enter why you're a good fit for this role... (Markdown supported)"
                rows={8}
              />
            </Box>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button onClick={handleCancel} variant="outlined">
                Cancel
              </Button>
              <Button onClick={handleSave} variant="contained">
                Save
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            {/* Confidence Score */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip
                icon={<AutoAwesomeIcon />}
                label={`${data.confidence_score}% Match`}
                color={getConfidenceColor(data.confidence_score)}
                variant="filled"
                size="small"
              />
            </Box>

            {/* Main Content */}
            <Box
              sx={{
                lineHeight: 1.6,
                textAlign: "justify",
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  marginTop: 2,
                  marginBottom: 1,
                  fontWeight: 600,
                },
                "& p": {
                  marginBottom: 2,
                },
                "& ul, & ol": {
                  marginBottom: 2,
                  paddingLeft: 3,
                },
                "& li": {
                  marginBottom: 0.5,
                },
                "& strong": {
                  fontWeight: 600,
                },
                "& em": {
                  fontStyle: "italic",
                },
              }}
            >
              <ReactMarkdown>{data.content || data.fit_analysis}</ReactMarkdown>
            </Box>

            {/* Key Matches */}
            {data.key_matches && data.key_matches.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <TrendingUpIcon color="primary" />
                      Key Matches
                    </Typography>
                    <Tooltip title="Copy Key Matches">
                      <IconButton onClick={copyKeyMatches} size="small">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <List dense>
                    {data.key_matches.map((match, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={match}
                          primaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}

            {/* Generation Info */}
            <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="caption" color="text.secondary">
                Generated on {new Date(data.generated_at).toLocaleDateString()}{" "}
                at {new Date(data.generated_at).toLocaleTimeString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Section</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Delete this section?</strong>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            You can always regenerate the section later. However, the new content may differ from the current one.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhyGoodFitSection;
