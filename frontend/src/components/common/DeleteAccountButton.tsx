/**
 * DeleteAccountButton Component
 *
 * A button component that handles user account deletion with confirmation dialog.
 * Includes safety measures like requiring user to type their email for confirmation.
 */

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Delete as DeleteIcon, Warning } from "@mui/icons-material";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { authApi, normalizeApiError } from "../../services/api";

interface DeleteAccountButtonProps {
  /**
   * Button variant style
   */
  variant?: "contained" | "outlined" | "text";

  /**
   * Button size
   */
  size?: "small" | "medium" | "large";

  /**
   * Full width button
   */
  fullWidth?: boolean;
}

export const DeleteAccountButton: React.FC<DeleteAccountButtonProps> = ({
  variant = "contained",
  size = "medium",
  fullWidth = false,
}) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredText = "DELETE";

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setConfirmText("");
    setError(null);
  };

  const handleCloseDialog = () => {
    if (!loading) {
      setDialogOpen(false);
      setConfirmText("");
      setError(null);
    }
  };

  const handleDeleteAccount = async () => {
    // Validate text confirmation
    if (confirmText !== requiredText) {
      setError("Text does not match. Please type 'DELETE' exactly as shown.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call backend to delete account
      await authApi.deleteAccount();

      // Sign out from Clerk
      await signOut();

      // Redirect to home page
      navigate("/", { replace: true });
    } catch (err) {
      const errorMessage = normalizeApiError(err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        color="error"
        size={size}
        fullWidth={fullWidth}
        startIcon={<DeleteIcon />}
        onClick={handleOpenDialog}
      >
        Delete Account
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
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
              Delete Account
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
                Deleting your account will permanently remove:
              </Typography>
            </Alert>

            <Box sx={{ pl: 3, mb: 2 }}>
              <Typography variant="body2" component="ul" sx={{ mt: 1 }}>
                <li>Your user account and profile</li>
                <li>All your CVs and uploaded files</li>
                <li>All your job descriptions</li>
                <li>All AI-generated content and enhancements</li>
                <li>All your activity history</li>
                <li>Your authentication credentials</li>
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You will be immediately signed out and will not be able to recover
              this data.
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
            onClick={handleCloseDialog}
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={loading || confirmText !== requiredText}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? "Deleting..." : "Delete My Account"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteAccountButton;
