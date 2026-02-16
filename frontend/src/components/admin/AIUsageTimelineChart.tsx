/**
 * AI Usage Timeline Chart Component.
 *
 * This component displays AI usage data over time using Recharts,
 * showing stacked Input/Output tokens and cost in a time-series format.
 */
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TimelineData } from "../../types/admin";
import { formatCost, formatTokens } from "../../utils/formatters";
import { formatDate } from "../../utils/dateFormat";

interface AIUsageTimelineChartProps {
  data: TimelineData[];
  loading: boolean;
  granularity: "day" | "week" | "month" | "hour";
  onGranularityChange: (granularity: "day" | "week" | "month" | "hour") => void;
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
          {formatDate(label)}
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

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Operations: {data.operation_count}
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

const AIUsageTimelineChart: React.FC<AIUsageTimelineChartProps> = ({
  data,
  loading,
  granularity,
  onGranularityChange,
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
              No timeline data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart
  const chartData = data.map((item) => ({
    ...item,
    date: item.date
      ? (() => {
          // Handle different timestamp formats from backend
          let date: Date;

          if (
            item.date.includes(" ") &&
            !item.date.includes("T") &&
            !item.date.includes("Z")
          ) {
            // Format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
            date = new Date(item.date + "Z");
          } else if (
            item.date.includes("T") &&
            !item.date.includes("Z") &&
            !item.date.includes("+")
          ) {
            // Format: "YYYY-MM-DDTHH:MM:SS" - treat as UTC (ISO format without timezone)
            date = new Date(item.date + "Z");
          } else {
            // Other formats (ISO with timezone, etc.) - let JavaScript handle it
            date = new Date(item.date);
          }

          return date.toLocaleDateString();
        })()
      : "Unknown",
    promptTokens: item.total_prompt_tokens,
    completionTokens: item.total_completion_tokens,
    cost: item.total_cost,
  }));

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
            AI Usage Timeline
          </Typography>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Granularity</InputLabel>
            <Select
              value={granularity}
              label="Granularity"
              onChange={(e) =>
                onGranularityChange(
                  e.target.value as "day" | "week" | "month" | "hour",
                )
              }
            >
              <MenuItem value="hour">Hour</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
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
                dataKey="promptTokens"
                stackId="tokens"
                fill="#1976d2"
                name="Input Tokens"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="tokens"
                dataKey="completionTokens"
                stackId="tokens"
                fill="#9c27b0"
                name="Output Tokens"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Cost"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIUsageTimelineChart;
