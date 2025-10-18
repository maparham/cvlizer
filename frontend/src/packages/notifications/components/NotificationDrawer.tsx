/**
 * Notification Drawer Component
 *
 * This module provides a right-side expandable notification drawer similar to macOS notification center.
 * It displays all notifications in a slide-out drawer with timestamps and individual dismiss options.
 *
 * Key features:
 * - Floating button on the right edge of the screen
 * - Badge showing total notification count (including grouped)
 * - Slide-out drawer that expands from the right side
 * - Scrollable list of all notifications with timestamps
 * - Individual close buttons for each notification
 * - "Clear All" button at the top
 * - Material-UI Drawer component for smooth slide animation
 * - Position fixed on the right side, doesn't interfere with content
 * - Grouped notifications with expand/collapse functionality
 * - CV navigation button for CV-specific notifications
 * - Optional CV filtering when cvId prop is provided
 *
 * Usage:
 * - CVEditor: Pass cvId prop to filter notifications (global + current CV only)
 * - Dashboard: No cvId prop to show all notifications with navigation icons
 * - Uses useNotifications hook for state management
 * - Automatically updates when notifications change
 */
import React, { useState, useImperativeHandle, forwardRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  IconButton,
  Divider,
  Paper,
  Drawer,
  Fab,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  ClearAll as ClearAllIcon,
  Close as CloseIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks";
import { formatRelativeTime } from "../utils";
import { NotificationDrawerRef } from "../types";

interface NotificationDrawerProps {
  cvId?: string; // Optional: filter to specific CV
}

const NotificationDrawer = forwardRef<NotificationDrawerRef, NotificationDrawerProps>(({ cvId }, ref) => {
  const { notifications: allNotifications, removeNotification, clearNotifications } = useNotifications();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter notifications if cvId provided
  const notifications = cvId
    ? allNotifications.filter(n => !n.cvId || n.cvId === cvId)
    : allNotifications;

  // Calculate total count of individual notifications (including grouped ones)
  const totalNotificationCount = notifications.reduce((total, notification) => {
    return total + notification.count;
  }, 0);

  const handleToggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  const openDrawer = () => {
    setIsOpen(true);
  };

  // Expose openDrawer method to parent components
  useImperativeHandle(ref, () => ({
    openDrawer,
  }));

  const handleClearAll = () => {
    clearNotifications();
  };

  const handleRemoveNotification = (id: string) => {
    removeNotification(id);
  };

  const handleToggleGroup = (notificationId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleNavigateToCV = (cvIdToNavigate: string) => {
    navigate(`/cv/${cvIdToNavigate}`);
    setIsOpen(false); // Close drawer after navigation
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        size="medium"
        onClick={handleToggleDrawer}
        sx={{
          position: "fixed",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1000,
          boxShadow: 3,
          "&:hover": {
            boxShadow: 6,
          },
        }}
      >
        <Badge
          badgeContent={totalNotificationCount}
          color="error"
          max={99}
        >
          <NotificationsIcon />
        </Badge>
      </Fab>

      {/* Notification Drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleToggleDrawer}
        sx={{
          "& .MuiDrawer-paper": {
            width: 400,
            maxWidth: "90vw",
            boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="h6" component="h2">
              Notifications
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {notifications.length > 0 && (
                <Button
                  startIcon={<ClearAllIcon />}
                  onClick={handleClearAll}
                  size="small"
                  color="inherit"
                  sx={{ textTransform: "none" }}
                >
                  Clear All
                </Button>
              )}
              <IconButton
                onClick={handleToggleDrawer}
                size="small"
                sx={{ ml: 1 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Notifications List */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 1,
            }}
          >
            {notifications.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  p: 3,
                  textAlign: "center",
                }}
              >
                <NotificationsIcon
                  sx={{
                    fontSize: 48,
                    color: "text.secondary",
                    mb: 2,
                    opacity: 0.5,
                  }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You're all caught up! New notifications will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {notifications.map((notification, index) => {
                  const isExpanded = expandedGroups.has(notification.id);
                  const isGrouped = notification.count > 1;

                  return (
                    <React.Fragment key={notification.id}>
                      <Paper
                        elevation={1}
                        sx={{
                          overflow: "hidden",
                          "& .MuiAlert-root": {
                            alignItems: "flex-start",
                            "& .MuiAlert-message": {
                              width: "100%",
                            },
                          },
                        }}
                      >
                        <Alert
                          severity={notification.type}
                          action={
                            <Box sx={{ display: "flex", gap: 0.5, alignSelf: "flex-start" }}>
                              {notification.cvId && (
                                <Tooltip title="Open CV">
                                  <IconButton
                                    aria-label="navigate to CV"
                                    color="inherit"
                                    size="small"
                                    onClick={() => handleNavigateToCV(notification.cvId!)}
                                  >
                                    <OpenInNewIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => handleRemoveNotification(notification.id)}
                              >
                                <CloseIcon fontSize="inherit" />
                              </IconButton>
                            </Box>
                          }
                          sx={{
                            "& .MuiAlert-message": {
                              width: "100%",
                              padding: 0,
                              flex: 1,
                            },
                            "& .MuiAlert-action": {
                              alignSelf: "flex-start",
                              marginTop: 0,
                              marginRight: 0,
                            },
                            display: "flex",
                            alignItems: "flex-start",
                            minHeight: "auto",
                          }}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {notification.title}
                            </Typography>
                            {notification.message && (
                              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                                {notification.message}
                              </Typography>
                            )}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "text.disabled",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {formatRelativeTime(notification.timestamp)}
                              </Typography>
                              {isGrouped && (
                                <Box
                                  sx={{
                                    bgcolor: "primary.main",
                                    color: "primary.contrastText",
                                    borderRadius: "50%",
                                    width: 18,
                                    height: 18,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.6rem",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                  }}
                                >
                                  {notification.count}
                                </Box>
                              )}
                              {isGrouped && (
                                <IconButton
                                  aria-label={isExpanded ? "collapse" : "expand"}
                                  color="inherit"
                                  size="small"
                                  onClick={() => handleToggleGroup(notification.id)}
                                  sx={{ p: 0.25 }}
                                >
                                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </IconButton>
                              )}
                            </Box>

                            {/* Expanded grouped notifications - simple bulleted list */}
                            {isGrouped && isExpanded && (
                              <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                {notification.groupedTimestamps.slice(0, -1).map((groupedTimestamp, index) => (
                                  <Typography
                                    key={`${notification.groupedIds[index]}-${index}`}
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      color: "text.disabled",
                                      fontSize: "0.7rem",
                                      mb: 0.25,
                                    }}
                                  >
                                    • {formatRelativeTime(groupedTimestamp)}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Alert>
                      </Paper>


                      {index < notifications.length - 1 && <Divider sx={{ mx: 1 }} />}
                    </React.Fragment>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
});

export default NotificationDrawer;
