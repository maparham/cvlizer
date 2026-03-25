/**
 * CV Editor Dialogs Component
 *
 * Handles all dialog components used in CV Editor:
 * - Delete confirmation dialog with error styling
 */
import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { CVEditorDialogsProps } from "./types";

export const CVEditorDialogs: React.FC<CVEditorDialogsProps> = ({
  deleteDialogOpen,
  onDeleteCancel,
  onDeleteConfirm,
  activeCV,
}) => {
  return (
    <Dialog
      open={deleteDialogOpen}
      onClose={onDeleteCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{ fontWeight: 600, fontSize: "1.25rem", color: "error.main" }}
        >
          Delete CV
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Delete "{activeCV?.original_filename}"?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onDeleteCancel} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={onDeleteConfirm}
          variant="contained"
          color="error"
          sx={{ borderRadius: 2 }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
