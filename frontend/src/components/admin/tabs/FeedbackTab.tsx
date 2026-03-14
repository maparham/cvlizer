/**
 * FeedbackTab - Admin dashboard tab for viewing and managing user feedback.
 * Shows stats, filters, paginated table, and a detail dialog to update status and admin notes.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Refresh, Visibility } from "@mui/icons-material";
import { feedbackService } from "../../../services/feedbackService";
import type {
  Feedback,
  FeedbackStats,
  FeedbackStatus,
  FeedbackType,
} from "../../../types/feedback";
import { formatDateTime } from "../../../utils/dateFormat";
import { normalizeApiError } from "../../../services/api";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const STATUS_OPTIONS: FeedbackStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];
const TYPE_OPTIONS: FeedbackType[] = ["bug", "suggestion", "general"];

interface FeedbackTabProps {
  /** When this value changes, stats and feedback list are reloaded (e.g. from dashboard Refresh button). */
  refreshTrigger?: number;
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({
  refreshTrigger,
}) => {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailStatus, setDetailStatus] = useState<FeedbackStatus | "">("");
  const [detailAdminNotes, setDetailAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await feedbackService.getStats();
      setStats(data);
    } catch (err) {
      setError(normalizeApiError(err));
    }
  }, []);

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await feedbackService.listFeedback(
        page,
        pageSize,
        statusFilter || undefined,
        typeFilter || undefined,
      );
      setFeedbacks(res.feedbacks);
      setTotal(res.total);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  useEffect(() => {
    if (typeof refreshTrigger === "number" && refreshTrigger > 0) {
      loadStats();
      loadFeedbacks();
    }
  }, [refreshTrigger, loadStats, loadFeedbacks]);

  const handleRefresh = () => {
    loadStats();
    loadFeedbacks();
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleTypeFilterChange = (event: SelectChangeEvent<string>) => {
    setTypeFilter(event.target.value);
    setPage(1);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage + 1);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(1);
  };

  const openDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setDetailStatus(feedback.status);
    setDetailAdminNotes(feedback.admin_notes ?? "");
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedFeedback(null);
  };

  const handleSaveDetail = async () => {
    if (!selectedFeedback) return;
    setSaving(true);
    try {
      await feedbackService.updateFeedback(selectedFeedback.id, {
        status: detailStatus || undefined,
        admin_notes: detailAdminNotes,
      });
      closeDetail();
      loadFeedbacks();
      loadStats();
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const getTypeColor = (
    t: string,
  ): "error" | "info" | "default" | "success" => {
    if (t === "bug") return "error";
    if (t === "suggestion") return "info";
    return "default";
  };

  const getStatusColor = (
    s: string,
  ): "default" | "warning" | "success" | "info" => {
    if (s === "open") return "warning";
    if (s === "in_progress") return "info";
    if (s === "resolved" || s === "closed") return "success";
    return "default";
  };

  if (loading && feedbacks.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total feedback
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                By type
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {TYPE_OPTIONS.map((t) => (
                  <Chip
                    key={t}
                    size="small"
                    label={`${t}: ${stats.by_type[t] ?? 0}`}
                    color={getTypeColor(t)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                By status
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((s) => (
                  <Chip
                    key={s}
                    size="small"
                    label={`${s}: ${stats.by_status[s] ?? 0}`}
                    color={getStatusColor(s)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters and refresh */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="">All</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={handleTypeFilterChange}
          >
            <MenuItem value="">All</MenuItem>
            {TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Submitted by</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  No feedback found.
                </TableCell>
              </TableRow>
            ) : (
              feedbacks.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Chip
                      size="small"
                      label={f.type}
                      color={getTypeColor(f.type)}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={f.title}>
                      <span>
                        {f.title.length > 50
                          ? `${f.title.slice(0, 50)}…`
                          : f.title}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{f.submitter_email ?? f.user_id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={f.status}
                      color={getStatusColor(f.status)}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(f.created_at)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View / Edit">
                      <IconButton
                        size="small"
                        onClick={() => openDetail(f)}
                        aria-label="View feedback"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={handleChangePage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        />
      </TableContainer>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>Feedback details</DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Type: {selectedFeedback.type} · Status: {selectedFeedback.status}
              </Typography>
              <Typography variant="subtitle2">Title</Typography>
              <Typography variant="body1">{selectedFeedback.title}</Typography>
              <Typography variant="subtitle2">Body</Typography>
              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap", bgcolor: "grey.50", p: 1, borderRadius: 1 }}
              >
                {selectedFeedback.body}
              </Typography>
              {selectedFeedback.page_url && (
                <>
                  <Typography variant="subtitle2">Page URL</Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {selectedFeedback.page_url}
                  </Typography>
                </>
              )}
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={detailStatus}
                  label="Status"
                  onChange={(e) =>
                    setDetailStatus(e.target.value as FeedbackStatus)
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Admin notes"
                value={detailAdminNotes}
                onChange={(e) => setDetailAdminNotes(e.target.value)}
                multiline
                minRows={2}
                placeholder="Internal notes (not shown to user)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveDetail}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeedbackTab;
