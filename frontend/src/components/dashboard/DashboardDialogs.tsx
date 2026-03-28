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
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import WarningIcon from "@mui/icons-material/Warning";
import { CVFromTextDialog, CVUpload } from "../cv";
import CVTemplateSelector from "../cv/CVTemplateSelector";
import { JobDescriptionsModal } from "../cv/ai";
import JobDescriptionStatusDialog from "../cv/ai/JobDescriptionStatusDialog";
import { CV } from "../../types";
import { JobDescription, JobDescriptionStatusUpdate } from "../../types/ai";

interface DashboardDialogsProps {
  // Upload dialog
  uploadOpen: boolean;
  onUploadClose: () => void;
  onUploadSuccess: (cvId: string) => void;
  /** Pre-selected file when opening from placeholder card (click or drop). */
  initialFile?: File | null;

  // CV from text dialog
  fromTextOpen: boolean;
  onFromTextClose: () => void;
  onFromTextSuccess: (cvId: string) => void;

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
  onStatusSave: (updates: JobDescriptionStatusUpdate) => Promise<void>;
}

const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  uploadOpen,
  onUploadClose,
  onUploadSuccess,
  initialFile = null,
  fromTextOpen,
  onFromTextClose,
  onFromTextSuccess,
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
        initialFile={initialFile}
      />

      <CVFromTextDialog
        open={fromTextOpen}
        onClose={onFromTextClose}
        onSuccess={onFromTextSuccess}
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
          {cvToDelete?.is_public_shared ? (
            <>
              <Typography sx={{ mb: 1 }}>
                You cannot delete &quot;{cvToDelete.original_filename}&quot; while a public share link
                is active.
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Open the Share dialog on this CV&apos;s card and turn off public sharing first. After
                that, you can delete the CV.
              </Typography>
            </>
          ) : (
            <Typography>Delete &quot;{cvToDelete?.original_filename}&quot;?</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onDeleteCancel}>Cancel</Button>
          {!cvToDelete?.is_public_shared && (
            <Button onClick={onDeleteConfirm} color="error" variant="contained">
              Delete CV
            </Button>
          )}
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
