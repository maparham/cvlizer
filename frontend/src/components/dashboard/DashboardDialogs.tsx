/**
 * Dashboard Dialogs Component
 *
 * This module consolidates all dialog components used in the Dashboard,
 * including upload, template selector, delete confirmation, and job description modals.
 *
 * Key responsibilities:
 * - Manage CV upload dialog with file handling
 * - Display CV template selector for creating from templates
 * - Show delete confirmation dialog with warning
 * - Display job description creation/editing modal
 * - Manage job description status update dialog
 *
 * Usage:
 * - Used in Dashboard component to handle all modal interactions
 * - Receives dialog state and handlers as props
 * - Provides consistent dialog UI across dashboard features
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import { CVUpload } from "../cv";
import CVTemplateSelector from "../cv/CVTemplateSelector";
import { JobDescriptionsModal } from "../cv/ai";
import JobDescriptionStatusDialog from "../cv/ai/JobDescriptionStatusDialog";
import { CV } from "../../types";
import { JobDescription } from "../../types/ai";

interface DashboardDialogsProps {
  // Upload dialog
  uploadOpen: boolean;
  onUploadClose: () => void;
  onUploadSuccess: () => void;

  // Template selector
  templateSelectorOpen: boolean;
  onTemplateSelectorClose: () => void;
  onTemplateSelect: (template: any) => void;

  // Delete dialog
  deleteDialogOpen: boolean;
  cvToDelete: CV | null;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;

  // Job description modal
  jobDescriptionModalOpen: boolean;
  editingJobDescription: JobDescription | null;
  onJobDescriptionClose: () => void;
  onJobDescriptionCreated: () => void;

  // Status dialog
  statusDialogOpen: boolean;
  statusEditingJobDescription: JobDescription | null;
  onStatusDialogClose: () => void;
  onStatusSave: (updates: any) => void;
}

const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  uploadOpen,
  onUploadClose,
  onUploadSuccess,
  templateSelectorOpen,
  onTemplateSelectorClose,
  onTemplateSelect,
  deleteDialogOpen,
  cvToDelete,
  onDeleteCancel,
  onDeleteConfirm,
  jobDescriptionModalOpen,
  editingJobDescription,
  onJobDescriptionClose,
  onJobDescriptionCreated,
  statusDialogOpen,
  statusEditingJobDescription,
  onStatusDialogClose,
  onStatusSave,
}) => {
  return (
    <>
      <CVUpload
        open={uploadOpen}
        onClose={onUploadClose}
        onSuccess={onUploadSuccess}
      />

      {/* Template Selector */}
      <CVTemplateSelector
        open={templateSelectorOpen}
        onClose={onTemplateSelectorClose}
        onSelectTemplate={onTemplateSelect}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={onDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <WarningIcon color="warning" />
            Delete CV
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{cvToDelete?.original_filename}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onDeleteCancel}>Cancel</Button>
          <Button
            onClick={onDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete CV
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Descriptions Modal */}
      <JobDescriptionsModal
        open={jobDescriptionModalOpen}
        onClose={onJobDescriptionClose}
        onJobDescriptionCreated={onJobDescriptionCreated}
        cvId="" // No CV context when creating from Dashboard
        editingJobDescription={editingJobDescription}
      />

      {/* Status Update Dialog */}
      <JobDescriptionStatusDialog
        open={statusDialogOpen}
        onClose={onStatusDialogClose}
        jobDescription={statusEditingJobDescription}
        onSave={onStatusSave}
      />
    </>
  );
};

export default DashboardDialogs;
