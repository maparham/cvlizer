/**
 * Tab icon with optional badge (loading spinner or count).
 * Used for AI sub-tabs in CVEditionSidebarContent.
 */

import React from "react";
import {
  Box,
  Badge,
  Tooltip,
  CircularProgress,
} from "@mui/material";

export interface TabWithBadgeProps {
  tooltipTitle: string;
  loading: boolean;
  count: number;
  icon: React.ReactElement;
}

export function TabWithBadge({
  tooltipTitle,
  loading,
  count,
  icon: Icon,
}: TabWithBadgeProps): React.ReactElement {
  const showBadge = loading || count > 0;
  return (
    <Tooltip title={tooltipTitle}>
      <Box component="span" sx={{ display: "inline-flex" }}>
        {showBadge ? (
          <Badge
            badgeContent={
              loading ? (
                <CircularProgress
                  size={10}
                  color="inherit"
                  sx={{ color: "primary.main" }}
                />
              ) : (
                count
              )
            }
            color={loading ? "default" : "error"}
            max={99}
          >
            {Icon}
          </Badge>
        ) : (
          Icon
        )}
      </Box>
    </Tooltip>
  );
}
