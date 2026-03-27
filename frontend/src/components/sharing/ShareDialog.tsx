import React, { useEffect, useMemo, useState } from "react";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import ConfirmDialog from "../common/ConfirmDialog";
import { useNotifications } from "../../packages/notifications";
import { shareService } from "../../services/shareService";
import type {
  ShareAnalytics,
  ShareInfo,
  ShareResourceType,
} from "../../types/share";

interface ShareDialogProps {
  open: boolean;
  resourceType: ShareResourceType;
  resourceId: string;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  resourceType,
  resourceId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const { showError, showSuccess } = useNotifications();

  const resourceLabel = useMemo(
    () => (resourceType === "cv" ? "CV" : "Job Description"),
    [resourceType],
  );

  const regenerateWarningMessage = useMemo(
    () =>
      resourceType === "cv"
        ? "This will create a new link. Anyone with the old link will no longer be able to open this CV."
        : "This will create a new link. Anyone with the old link will no longer be able to open this job description.",
    [resourceType],
  );

  const loadShareState = async () => {
    try {
      setLoading(true);
      const [currentInfo, analyticsInfo] =
        resourceType === "cv"
          ? await Promise.all([
              shareService.getCVShareInfo(resourceId),
              shareService.getCVShareAnalytics(resourceId),
            ])
          : await Promise.all([
              shareService.getJobDescriptionShareInfo(resourceId),
              shareService.getJobDescriptionShareAnalytics(resourceId),
            ]);
      setShareInfo(currentInfo);
      setAnalytics(analyticsInfo);
    } catch (error) {
      showError("Share setup failed", `Could not load ${resourceLabel} sharing state.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !resourceId) return;
    loadShareState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resourceId, resourceType]);

  const handleCopyLink = async () => {
    if (!shareInfo?.public_url) return;
    try {
      await navigator.clipboard.writeText(shareInfo.public_url);
      showSuccess("Link copied to clipboard");
    } catch {
      showError("Copy failed", "Could not copy link to clipboard.");
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      const next =
        resourceType === "cv"
          ? await shareService.disableCVSharing(resourceId)
          : await shareService.disableJobDescriptionSharing(resourceId);
      setShareInfo(next);
      showSuccess("Public link disabled");
    } catch {
      showError("Disable failed", "Could not disable public sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      const next =
        resourceType === "cv"
          ? await shareService.enableCVSharing(resourceId)
          : await shareService.enableJobDescriptionSharing(resourceId);
      setShareInfo(next);
      showSuccess("Public link enabled");
    } catch {
      showError("Enable failed", "Could not enable public sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      const next =
        resourceType === "cv"
          ? await shareService.regenerateCVShareToken(resourceId)
          : await shareService.regenerateJobDescriptionShareToken(resourceId);
      setShareInfo(next);
      showSuccess("Public link regenerated. Old link is now invalid.");
    } catch {
      showError("Regenerate failed", "Could not regenerate public link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{resourceLabel} Sharing</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Share" />
          <Tab label="Analytics" />
        </Tabs>
        <Divider sx={{ mb: 2 }} />

        {tab === 0 && (
          <Stack spacing={2}>
            <Alert severity={shareInfo?.is_shared ? "success" : "info"}>
              {shareInfo?.is_shared
                ? `${resourceLabel} is publicly accessible via link.`
                : `${resourceLabel} public sharing is disabled.`}
            </Alert>
            <TextField
              fullWidth
              label="Public Link"
              value={shareInfo?.public_url || ""}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Copy public link"
                      edge="end"
                      onClick={handleCopyLink}
                      disabled={
                        loading ||
                        !shareInfo?.public_url ||
                        !shareInfo?.is_shared
                      }
                      size="small"
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              placeholder="No public link yet"
            />
            {resourceType === "cv" && (
              <Typography variant="body2" color="text.secondary">
                Public CV style: Branded shell
              </Typography>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                onClick={handleEnable}
                disabled={loading || shareInfo?.is_shared}
              >
                Enable
              </Button>
              <Button
                variant="outlined"
                onClick={handleDisable}
                disabled={loading || !shareInfo?.is_shared}
              >
                Disable
              </Button>
              <Button
                variant="outlined"
                onClick={() => setRegenerateConfirmOpen(true)}
                disabled={loading || !shareInfo?.is_shared}
              >
                Regenerate
              </Button>
            </Stack>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <Typography variant="body1">
              Total views: <strong>{analytics?.total_views ?? 0}</strong>
            </Typography>
            <Typography variant="body1">
              Unique IPs: <strong>{analytics?.unique_ips ?? 0}</strong>
            </Typography>
            <Divider />
            <Typography variant="subtitle2">Recent Views</Typography>
            <Stack spacing={1} sx={{ maxHeight: 320, overflowY: "auto" }}>
              {(analytics?.recent_views || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No views yet.
                </Typography>
              )}
              {(analytics?.recent_views || []).map((row, idx) => (
                <Box key={`${row.viewed_at}-${idx}`} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Typography variant="body2">IP: {row.viewer_ip || "unknown"}</Typography>
                  <Typography variant="body2">
                    Time: {row.viewed_at ? new Date(row.viewed_at).toLocaleString() : "unknown"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    UA: {row.user_agent || "unknown"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <ConfirmDialog
        open={regenerateConfirmOpen}
        onClose={() => setRegenerateConfirmOpen(false)}
        onConfirm={handleRegenerate}
        title="Regenerate public link?"
        message={regenerateWarningMessage}
        confirmButtonText="Regenerate link"
        confirmButtonColor="warning"
        severity="warning"
        warning="This action cannot be undone."
      />
    </Dialog>
  );
};
