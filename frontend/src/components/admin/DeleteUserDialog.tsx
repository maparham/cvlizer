/**
 * DeleteUserDialog Component
 *
 * Confirmation dialog for admin user deletion with safety checks.
 * Requires admin to type "DELETE" to confirm the action.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Warning, DeleteForever } from "@mui/icons-material";

interface DeleteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName: string;
  userEmail: string;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  open,
  onClose,
  onConfirm,
  userName,
  userEmail,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredText = "DELETE";

  const handleClose = () => {
    if (!loading) {
      setConfirmText("");
      setError(null);
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (confirmText !== requiredText) {
      setError("Text does not match. Please type 'DELETE' exactly as shown.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to delete user");
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: "4px solid",
          borderColor: "error.main",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="error" />
          <Typography variant="h6" component="span">
            Delete User Account
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>This action cannot be undone!</strong>
            </Typography>
            <Typography variant="body2">
              You are about to permanently delete this user's account:
            </Typography>
          </Alert>

          <Box sx={{ pl: 3, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>User:</strong> {userName || userEmail}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Email:</strong> {userEmail}
            </Typography>

            <Typography variant="body2" component="div">
              This will permanently delete:
              <ul style={{ margin: "8px 0" }}>
                <li>User account and profile</li>
                <li>All CVs and uploaded files</li>
                <li>All job descriptions</li>
                <li>All AI-generated content</li>
                <li>All activity history</li>
                <li>Authentication credentials</li>
              </ul>
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The user will be immediately signed out and unable to access their account.
          </Typography>

          <Typography variant="body2" sx={{ mb: 1 }}>
            To confirm, please type the word:
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              p: 1,
              bgcolor: "grey.100",
              borderRadius: 1,
              fontFamily: "monospace",
              fontWeight: "bold",
              color: "error.main",
            }}
          >
            {requiredText}
          </Typography>

          <TextField
            fullWidth
            label="Type DELETE to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={loading}
            error={!!error && confirmText !== ""}
            placeholder={requiredText}
            autoComplete="off"
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={loading || confirmText !== requiredText}
          startIcon={loading ? <CircularProgress size={20} /> : <DeleteForever />}
        >
          {loading ? "Deleting..." : "Delete User Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteUserDialog;
