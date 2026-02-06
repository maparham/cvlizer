/**
 * AI Usage Logs Table Component.
 *
 * This component displays detailed AI usage logs in a table format
 * with filtering, pagination, and sorting capabilities.
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
} from "@mui/material";
import {
  Download,
  Refresh,
  CheckCircle,
  Error,
  Person,
  Speed,
  AttachMoney,
} from "@mui/icons-material";
import { PaginatedAIUsageLogs, AIUsageFilters } from "../../types/admin";
import {
  formatCost,
  formatTokens,
  formatDateTime,
  formatDuration,
  formatOperationType,
  formatModelName,
  formatSuccessStatus,
} from "../../utils/formatters";

interface AIUsageLogsTableProps {
  data: PaginatedAIUsageLogs | null;
  loading: boolean;
  filters: AIUsageFilters;
  onFilterChange: (filters: Partial<AIUsageFilters>) => void;
  onPaginationChange: (page: number, rowsPerPage: number) => void;
  onRefresh: () => void;
  onExport?: () => void;
  onClearAllFilters?: () => void;
  availableUsers?: Array<{ user_id: string; email: string }>;
}

const AIUsageLogsTable: React.FC<AIUsageLogsTableProps> = ({
  data,
  loading,
  filters,
  onFilterChange,
  onPaginationChange,
  onRefresh,
  onExport,
  onClearAllFilters,
  availableUsers = [],
}) => {
  const handlePageChange = (_event: unknown, newPage: number) => {
    onPaginationChange(newPage, data?.limit || 50);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onPaginationChange(0, parseInt(event.target.value, 10));
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={300}
          >
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.logs.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={300}
          >
            <Typography color="text.secondary">No logs available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h6" component="div">
            AI Usage Logs
          </Typography>

          <Box display="flex" gap={1}>
            <Button startIcon={<Refresh />} onClick={onRefresh} size="small">
              Refresh
            </Button>

            {onExport && (
              <Button
                startIcon={<Download />}
                onClick={onExport}
                size="small"
                variant="outlined"
              >
                Export
              </Button>
            )}
          </Box>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>User</InputLabel>
              <Select
                value={filters.user_id || ""}
                label="User"
                onChange={(e) =>
                  onFilterChange({ user_id: e.target.value || undefined })
                }
              >
                <MenuItem value="">All Users</MenuItem>
                {availableUsers.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.email}
                  </MenuItem>
                ))}
                {/* Show current user if they're not in the available users list */}
                {filters.user_id &&
                  !availableUsers.find(
                    (u) => u.user_id === filters.user_id,
                  ) && (
                    <MenuItem value={filters.user_id}>
                      {filters.user_id.slice(0, 8)}... (Selected)
                    </MenuItem>
                  )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Operation Type</InputLabel>
              <Select
                value={filters.operation_type || ""}
                label="Operation Type"
                onChange={(e) =>
                  onFilterChange({
                    operation_type: e.target.value || undefined,
                  })
                }
              >
                <MenuItem value="">All Operations</MenuItem>
                <MenuItem value="parse_cv">Parse CV</MenuItem>
                <MenuItem value="generate_section">Generate Section</MenuItem>
                <MenuItem value="job_fit_analysis">Job Fit Analysis</MenuItem>
                <MenuItem value="enhance_content">Enhance Content</MenuItem>
                <MenuItem value="ats_optimization">ATS Optimization</MenuItem>
                <MenuItem value="generate_suggestions">
                  Generate Suggestions
                </MenuItem>
                <MenuItem value="extract_job_description">
                  Extract Job Description
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={
                  filters.success === undefined
                    ? ""
                    : filters.success.toString()
                }
                label="Status"
                onChange={(e) =>
                  onFilterChange({
                    success:
                      e.target.value === ""
                        ? undefined
                        : e.target.value === "true",
                  })
                }
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="true">Success</MenuItem>
                <MenuItem value="false">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              value={filters.start_date || ""}
              onChange={(e) =>
                onFilterChange({ start_date: e.target.value || undefined })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              value={filters.end_date || ""}
              onChange={(e) =>
                onFilterChange({ end_date: e.target.value || undefined })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() =>
                onClearAllFilters ? onClearAllFilters() : onFilterChange({})
              }
              sx={{ height: "40px" }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Operation</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell align="right">Tokens</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Duration</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.logs.map((log) => {
                const status = formatSuccessStatus(log.success);

                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(log.timestamp)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Person color="action" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {log.user_email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.user_id.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={formatOperationType(log.operation_type)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {formatModelName(log.model_used)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {log.service_tier ?? "—"}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Box textAlign="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatTokens(log.total_tokens)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.prompt_tokens} in / {log.completion_tokens} out
                          {log.cached_tokens > 0 && (
                            <span style={{ color: '#4caf50' }}>
                              {' '}
                              ({log.cached_tokens} cached)
                            </span>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AttachMoney color="success" fontSize="small" />
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color="success.main"
                        >
                          {formatCost(log.estimated_cost)}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Speed color="action" fontSize="small" />
                        <Typography variant="body2">
                          {formatDuration(log.generation_time)}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        icon={
                          status.text === "Success" ? (
                            <CheckCircle />
                          ) : (
                            <Error />
                          )
                        }
                        label={status.text}
                        size="small"
                        color={status.color}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[20, 50, 100]}
          component="div"
          count={data.total}
          rowsPerPage={data.limit}
          page={Math.floor(data.offset / data.limit)}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </CardContent>
    </Card>
  );
};

export default AIUsageLogsTable;
