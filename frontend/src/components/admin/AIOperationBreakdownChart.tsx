/**
 * AI Operation Breakdown Chart Component.
 *
 * This component displays AI usage breakdown by operation type using Recharts,
 * showing token consumption and costs for each operation in a bar chart format.
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { OperationAIUsage } from "../../types/admin";
import {
  formatCost,
  formatTokens,
  formatOperationType,
  getOperationTypeColor,
} from "../../utils/formatters";

interface AIOperationBreakdownChartProps {
  data: OperationAIUsage[];
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <Box
        sx={{
          backgroundColor: "white",
          border: "1px solid #ccc",
          borderRadius: 1,
          p: 2,
          boxShadow: 2,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {formatOperationType(label)}
        </Typography>

        {payload.map((entry: any, index: number) => (
          <Box key={index} display="flex" alignItems="center" gap={1} mb={0.5}>
            <Box
              sx={{
                width: 12,
                height: 12,
                backgroundColor: entry.color,
                borderRadius: "50%",
              }}
            />
            <Typography variant="body2">
              {entry.name}:{" "}
              {entry.name === "Cost"
                ? formatCost(entry.value)
                : formatTokens(entry.value)}
            </Typography>
          </Box>
        ))}

        <Typography variant="body2" color="text.secondary">
          Operations: {data.operation_count}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Avg Tokens/Op: {formatTokens(data.average_tokens_per_operation)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Input: {formatTokens(data.total_prompt_tokens)} | Output:{" "}
          {formatTokens(data.total_completion_tokens)}
        </Typography>
      </Box>
    );
  }

  return null;
};

const AIOperationBreakdownChart: React.FC<AIOperationBreakdownChartProps> = ({
  data,
  loading,
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

  if (!data || data.length === 0) {
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
              No operation data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart
  const chartData = data.map((item) => ({
    ...item,
    operation_type: formatOperationType(item.operation_type),
    tokens: item.total_tokens,
    promptTokens: item.total_prompt_tokens,
    completionTokens: item.total_completion_tokens,
    cost: item.total_cost,
  }));

  // Sort by tokens descending
  chartData.sort((a, b) => b.tokens - a.tokens);

  // Get colors for each operation type
  const getBarColor = (operationType: string) => {
    // Find the original operation type from the formatted name
    const originalType = data.find(
      (d) => formatOperationType(d.operation_type) === operationType,
    )?.operation_type;
    return originalType ? getOperationTypeColor(originalType) : "#8884d8";
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          Operation Breakdown
        </Typography>

        <Box sx={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="operation_type"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                yAxisId="tokens"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatTokens(value)}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCost(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Bar
                yAxisId="tokens"
                dataKey="tokens"
                name="Total Tokens"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-total-${index}`}
                    fill={getBarColor(entry.operation_type)}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="tokens"
                dataKey="promptTokens"
                name="Input Tokens"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-prompt-${index}`} fill="#1976d2" />
                ))}
              </Bar>
              <Bar
                yAxisId="tokens"
                dataKey="completionTokens"
                name="Output Tokens"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-completion-${index}`} fill="#9c27b0" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIOperationBreakdownChart;
