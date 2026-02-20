import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import { Info as InfoIcon, Edit as EditIcon } from "@mui/icons-material";

interface UnsavedChangesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pendingChanges: Map<string, any>;
  /** Optional map of custom section id -> title for display (e.g. from cvData.custom_sections). */
  customSectionTitles?: Record<string, string>;
}

const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onClose,
  onConfirm,
  pendingChanges,
  customSectionTitles,
}) => {
  const getSectionDisplayName = (sectionId: string): string => {
    const sectionNames: Record<string, string> = {
      personal_info: "Personal Information",
      work_experience: "Work Experience",
      education: "Education",
      skills: "Skills",
      certifications: "Certifications",
      projects: "Projects",
      awards: "Awards",
      publications: "Publications",
      volunteer_experience: "Volunteer Experience",
    };
    if (sectionNames[sectionId]) return sectionNames[sectionId];
    if (customSectionTitles?.[sectionId]) return customSectionTitles[sectionId];
    return sectionId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getChangedSections = (): string[] => {
    return Array.from((pendingChanges || new Map()).keys());
  };

  const changedSections = getChangedSections();

  if (changedSections.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      data-testid="unsaved-changes-dialog"
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pb: 1,
          fontWeight: 500,
          color: "#1976d2",
          fontSize: "1.25rem",
        }}
      >
        <InfoIcon color="info" sx={{ color: "#1976d2" }} />
        Unsaved Changes
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2, color: "text.primary" }}>
          Unsaved changes in the following sections:
        </Typography>

        <Box sx={{ maxHeight: 200, overflow: "auto" }}>
          <List dense>
            {changedSections.map((sectionId) => (
              <ListItem key={sectionId} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <EditIcon fontSize="small" sx={{ color: "#1976d2" }} />
                </ListItemIcon>
                <ListItemText
                  primary={getSectionDisplayName(sectionId)}
                  secondary="Has pending changes"
                  primaryTypographyProps={{ sx: { fontWeight: 500 } }}
                  secondaryTypographyProps={{
                    sx: { color: "text.secondary", fontSize: "0.875rem" },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ gap: 1, px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          data-testid="unsaved-changes-continue-button"
          sx={{
            fontWeight: 500,
            px: 3,
            py: 1,
          }}
        >
          Continue Editing
        </Button>
        <Button
          onClick={onConfirm}
          variant="outlined"
          color="secondary"
          data-testid="unsaved-changes-discard-button"
          sx={{
            fontWeight: 500,
            px: 3,
            py: 1,
            borderColor: "#e0e0e0",
            color: "#666",
            "&:hover": {
              borderColor: "#bdbdbd",
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          Discard Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesDialog;
