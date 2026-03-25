/**
 * DeleteConfirmationDialog - Generic confirmation dialog for destructive actions
 *
 * This component provides a reusable confirmation dialog for destructive actions.
 * Shows warnings, confirmation input, and action buttons.
 *
 * Key responsibilities:
 * - Display warning messages for destructive actions
 * - Collect confirmation text input
 * - Handle confirmation and cancellation
 * - Show loading states during action
 *
 * Usage context:
 * - Used in admin dashboard for destructive operations
 * - Can be reused for various confirmation scenarios
 * - Provides consistent warning and confirmation UI
 */

import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Delete from "@mui/icons-material/Delete";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
  title: string;
  message: string;
  confirmText: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
  title,
  message,
  confirmText,
}) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirmationChange = (value: string) => {
    setConfirmationText(value);
    setIsConfirmed(value === confirmText);
  };

  const handleConfirm = async () => {
    if (isConfirmed) {
      await onConfirm();
      setConfirmationText("");
      setIsConfirmed(false);
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    setIsConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Delete color="error" />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom></Typography>
          <Typography variant="body2">{message}</Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary">
          Type <strong>{confirmText}</strong> in the box below to confirm:
        </Typography>

        <TextField
          fullWidth
          label="Confirmation"
          placeholder={`Type ${confirmText} to confirm`}
          value={confirmationText}
          onChange={(e) => handleConfirmationChange(e.target.value)}
          variant="outlined"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading || !isConfirmed}
          startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
        >
          {loading ? "Processing..." : "Confirm Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
