/**
 * AI Top Users Table Component.
 *
 * This component displays a table of users ranked by AI usage,
 * showing token consumption, costs, and operation counts.
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
  IconButton,
  Tooltip,
} from "@mui/material";
import { Person, TrendingUp } from "@mui/icons-material";
import { UserAIUsage } from "../../types/admin";
import {
  formatCost,
  formatTokens,
  formatNumber,
  formatOperationType,
} from "../../utils/formatters";

interface AITopUsersTableProps {
  users: UserAIUsage[];
  loading: boolean;
  onUserClick: (userId: string) => void;
}

const AITopUsersTable: React.FC<AITopUsersTableProps> = ({
  users,
  loading,
  onUserClick,
}) => {
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

  if (!Array.isArray(users) || users.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={300}
          >
            <Typography color="text.secondary">
              No user data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          Top Users by AI Usage
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>User</TableCell>
                <TableCell align="right">Total Tokens</TableCell>
                <TableCell align="right">Input/Output</TableCell>
                <TableCell align="right">Total Cost</TableCell>
                <TableCell align="right">Operations</TableCell>
                <TableCell align="center">Most Used</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={user.user_id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" color="primary">
                        #{index + 1}
                      </Typography>
                      {index < 3 && (
                        <Chip
                          label={index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Person color="action" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.user_id.slice(0, 8)}...
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatTokens(user.total_tokens)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatNumber(user.total_tokens)} tokens
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="info.main"
                    >
                      {formatTokens(user.total_prompt_tokens)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTokens(user.total_completion_tokens)}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="success.main"
                    >
                      {formatCost(user.total_cost)}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(user.operation_count)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {user.most_used_operation ? (
                      <Chip
                        label={formatOperationType(user.most_used_operation)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Tooltip title="View detailed logs for this user">
                      <IconButton
                        size="small"
                        onClick={() => onUserClick(user.user_id)}
                        color="primary"
                      >
                        <TrendingUp />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default AITopUsersTable;
