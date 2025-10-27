/**
 * Notification Toast Component
 *
 * This module provides a toast preview notification that appears automatically
 * when new notifications arrive, then auto-dismisses and remains in the drawer history.
 *
 * Key features:
 * - Listens for new notifications (where shown: false)
 * - Displays toast for newest unshown notification
 * - Positioned below toolbar, right of CV view
 * - Same width as notification drawer (400px)
 * - Auto-dismisses after 5 seconds
 * - User can manually close it
 * - Smooth slide-in/slide-out animation
 * - Clicking toast opens the notification drawer
 * - After showing, marks notification as shown: true
 * - Shows count badges for grouped notifications
 * - Optional CV filtering when cvId prop is provided
 *
 * Usage:
 * - CVEditor: Pass cvId prop to show only relevant toasts (global + current CV)
 * - Dashboard: No cvId prop to show all notification toasts
 * - Uses useNotifications hook for state management
 * - Works alongside NotificationDrawer component
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Slide,
  Alert,
  ClickAwayListener,
  Badge,
} from "@mui/material";
import {
  Close as CloseIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useNotificationStore } from "../store";
import { formatRelativeTime } from "../utils";
import { NotificationToastProps } from "../types";
import { toastNotificationEmitter } from "../store";

const NotificationToast: React.FC<NotificationToastProps> = ({ onOpenDrawer, cvId }) => {
  const { notifications: allNotifications, markNotificationAsShown } = useNotificationStore();
  const [currentToast, setCurrentToast] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [toastOnlyQueue, setToastOnlyQueue] = useState<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentToastRef = useRef<any>(null);

  // Filter notifications if cvId provided
  const notifications = cvId
    ? allNotifications.filter(n => n.cvId === cvId)
    : allNotifications;

  // Listen for toast-only notifications
  useEffect(() => {
    const unsubscribe = toastNotificationEmitter.subscribe((toastNotification) => {
      // Check if this toast-only notification should be shown for current CV
      const shouldShow = !toastNotification.cvId || toastNotification.cvId === cvId;
      if (shouldShow) {
        setToastOnlyQueue(prev => [...prev, toastNotification]);
      }
    });

    return unsubscribe;
  }, [cvId]);

  // Define handleClose before it's used in useEffect
  const handleClose = useCallback(() => {
    // Use ref to get current value without stale closure
    const toastToRemove = currentToastRef.current;

    setIsVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Remove toast-only notification from queue immediately (fix stale closure issue)
    const toastIdToRemove = toastToRemove?.id;
    if (toastIdToRemove && toastToRemove && !toastToRemove.shown) {
      setToastOnlyQueue(prev => prev.filter(n => n.id !== toastIdToRemove));
    }

    // Clear current toast after animation completes
    setTimeout(() => {
      setCurrentToast(null);
      currentToastRef.current = null;
    }, 300); // Match the slide animation duration
  }, []);

  // Find the newest unshown notification (from both persistent and toast-only)
  const getNewestUnshownNotification = () => {
    // Check toast-only queue first (highest priority)
    if (toastOnlyQueue.length > 0) {
      return toastOnlyQueue[0];
    }

    // Then check persistent notifications
    const unshownNotifications = notifications.filter(n => !n.shown);
    if (unshownNotifications.length === 0) return null;

    // Sort by timestamp descending (newest first) and return the first one
    return unshownNotifications.sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime()
    )[0];
  };

  // Show toast for newest unshown notification
  useEffect(() => {
    const newestUnshown = getNewestUnshownNotification();

    if (newestUnshown && !currentToast) {
      setCurrentToast(newestUnshown);
      currentToastRef.current = newestUnshown;
      setIsVisible(true);

      // Mark as shown immediately (only for persistent notifications)
      if (newestUnshown.shown !== undefined) {
        markNotificationAsShown(newestUnshown.id);
      }

      // Auto-dismiss after 5 seconds
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, toastOnlyQueue, currentToast]);

  const handleClick = useCallback(() => {
    onOpenDrawer();
    handleClose();
  }, [onOpenDrawer, handleClose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!currentToast) return null;

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Slide
        direction="left"
        in={isVisible}
        timeout={300}
        style={{
          position: "fixed",
          top: 64, // Below toolbar
          right: 16,
          width: 400,
          maxWidth: "90vw",
          zIndex: 999, // Below drawer but above content
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: "100%",
            borderRadius: 2,
            overflow: "hidden",
            cursor: "pointer",
            "&:hover": {
              boxShadow: 12,
            },
            transition: "box-shadow 0.2s ease-in-out",
          }}
          onClick={handleClick}
        >
          <Alert
            severity={currentToast.type}
            action={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  sx={{ p: 0.5 }}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  aria-label="open drawer"
                  color="inherit"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  sx={{ p: 0.5 }}
                >
                  <ChevronRightIcon fontSize="inherit" />
                </IconButton>
              </Box>
            }
            sx={{
              "& .MuiAlert-action": {
                alignSelf: "flex-start",
                marginTop: 0,
                marginRight: 0,
              },
            }}
          >
            <Box sx={{ width: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600 }}>
                  {currentToast.message || currentToast.title}
                </Typography>
                {currentToast.count > 1 && (
                  <Badge
                    badgeContent={currentToast.count}
                    color="primary"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.7rem",
                        height: 20,
                        minWidth: 20,
                        right: -8,
                        top: -8,
                      },
                    }}
                  >
                    <Box sx={{ width: 8, height: 8 }} />
                  </Badge>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.5,
                  color: "text.disabled",
                  fontSize: "0.75rem",
                }}
              >
                {formatRelativeTime(currentToast.timestamp)}
              </Typography>
            </Box>
          </Alert>
        </Paper>
      </Slide>
    </ClickAwayListener>
  );
};

export default NotificationToast;
