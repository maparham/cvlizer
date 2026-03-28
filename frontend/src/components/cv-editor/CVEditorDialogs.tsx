/**
 * CV Editor Dialogs Component
 *
 * Handles all dialog components used in CV Editor:
 * - Delete confirmation (destructive styling) or blocked state (warning) when shared
 */
import React from "react";
import WarningIcon from "@mui/icons-material/Warning";
import Alert from "@mui/material/Alert";
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
  const isBlocked = !!activeCV?.is_public_shared;

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
        {isBlocked ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontWeight: 600,
              fontSize: "1.25rem",
            }}
          >
            <WarningIcon color="warning" fontSize="medium" />
            Cannot delete CV
          </Box>
        ) : (
          <Box
            sx={{ fontWeight: 600, fontSize: "1.25rem", color: "error.main" }}
          >
            Delete CV
          </Box>
        )}
      </DialogTitle>
      <DialogContent>
        {isBlocked ? (
          <Alert severity="warning" variant="outlined" sx={{ mt: 0 }}>
            <Box component="p" sx={{ m: 0, mb: 1 }}>
              You cannot delete this CV while a public share link is active.
            </Box>
            <Box component="p" sx={{ m: 0, color: "text.secondary" }}>
              Use Share in the header to turn off public sharing first, then you can delete
              the CV.
            </Box>
          </Alert>
        ) : (
          <DialogContentText>Delete &quot;{activeCV?.original_filename}&quot;?</DialogContentText>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onDeleteCancel} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        {!isBlocked && (
          <Button
            onClick={onDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
