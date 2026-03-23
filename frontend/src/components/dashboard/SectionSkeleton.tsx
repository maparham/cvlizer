/**
 * Section Skeleton
 *
 * Reusable loading UI for dashboard sections while data is being fetched.
 */
import React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";

interface SectionSkeletonProps {
  title: string;
  loadingMessage: string;
  subtitle: string;
  minHeight?: number;
}

const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  title,
  loadingMessage,
  subtitle,
  minHeight = 200,
}) => {
  return (
    <Card
      sx={{
        mb: 5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 1,
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            letterSpacing: "-0.025em",
            mb: 4,
          }}
        >
          {title}
        </Typography>

        <Box
          sx={{
            minHeight,
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            backgroundColor: "background.paper",
          }}
        >
          <CircularProgress size={30} thickness={4} />
          <Stack spacing={0.5} alignItems="center">
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {loadingMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SectionSkeleton;
