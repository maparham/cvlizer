/**
 * Drafts List Component
 *
 * This component displays all draft AI-generated sections for a CV.
 * It shows a list of draft sections with their content and actions.
 *
 * Key responsibilities:
 * - Display all drafts for a CV
 * - Handle loading and error states
 * - Provide refresh functionality
 * - Show empty state when no drafts exist
 *
 * Usage:
 * - Used in CV editor to show all pending AI-generated content
 * - Requires cvId prop to fetch drafts
 * - Integrates with AI store for state management
 */

import React, { useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { useAIStore, useCVDrafts } from "../../../stores/aiStore";
import { useNotifications } from "../../../packages/notifications";
import { aiService } from "../../../services/aiService";
import DraftSection from "./DraftSection";

interface DraftsListProps {
  cvId: string;
  onDraftChange?: () => void;
}

const DraftsList: React.FC<DraftsListProps> = ({ cvId, onDraftChange }) => {
  const { getCVDrafts } = useAIStore();
  const { showError } = useNotifications();
  const drafts = useCVDrafts(cvId);
  const { isLoading, error } = useAIStore((state) => state.drafts);

  const loadDrafts = useCallback(async () => {
    try {
      // Clear cache before fetching to ensure we get fresh data from backend
      // This is especially important for drafts that complete in background
      aiService.clearCacheForCV(cvId);
      await getCVDrafts(cvId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load drafts";
      showError("Error", errorMessage);
    }
  }, [cvId, getCVDrafts, showError]);

  // Load drafts on component mount
  useEffect(() => {
    if (cvId) {
      loadDrafts();
    }
  }, [cvId, loadDrafts]);

  const handleDraftChange = useCallback(() => {
    // The store already updates the drafts list when approve/discard is called
    // Just trigger the parent callback if provided
    onDraftChange?.();
  }, [onDraftChange]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={loadDrafts}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (drafts.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <AutoAwesomeIcon
          sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Drafts Available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Generate AI content to see drafts here
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDrafts}
          size="small"
        >
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <AutoAwesomeIcon />
          AI Drafts ({drafts.length})
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadDrafts}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      <Stack spacing={2}>
        {drafts.map((draft) => (
          <DraftSection
            key={draft.id}
            cvId={cvId}
            draft={draft}
            onApprove={handleDraftChange}
            onDiscard={handleDraftChange}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default DraftsList;
