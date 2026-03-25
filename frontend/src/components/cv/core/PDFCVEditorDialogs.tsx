import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import ResetIcon from "@mui/icons-material/RestartAlt";
import { UnsavedChangesDialog } from "./";

interface PDFCVEditorDialogsProps {
  showResetDialog: boolean;
  showUnsavedChangesDialog: boolean;
  pendingChanges: Map<string, any>;
  onCloseResetDialog: () => void;
  onConfirmReset: () => void;
  onCloseUnsavedChangesDialog: () => void;
  onConfirmUnsavedChanges: () => void;
  /** Optional map of custom section id -> title for unsaved changes dialog labels. */
  customSectionTitles?: Record<string, string>;
}

const PDFCVEditorDialogs: React.FC<PDFCVEditorDialogsProps> = ({
  showResetDialog,
  showUnsavedChangesDialog,
  pendingChanges,
  onCloseResetDialog,
  onConfirmReset,
  onCloseUnsavedChangesDialog,
  onConfirmUnsavedChanges,
  customSectionTitles,
}) => {
  return (
    <>
      {/* Reset Confirmation Dialog */}
      <Dialog
        open={showResetDialog}
        onClose={onCloseResetDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset Section Order</DialogTitle>
        <DialogContent>
          <Typography>
            Reset the section order to the default arrangement?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseResetDialog}>Cancel</Button>
          <Button
            onClick={onConfirmReset}
            variant="contained"
            color="primary"
            startIcon={<ResetIcon />}
          >
            Reset Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onClose={onCloseUnsavedChangesDialog}
        onConfirm={onConfirmUnsavedChanges}
        pendingChanges={pendingChanges}
        customSectionTitles={customSectionTitles}
      />
    </>
  );
};

export default PDFCVEditorDialogs;
