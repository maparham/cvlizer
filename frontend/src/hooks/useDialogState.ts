/**
 * Dialog State Management Hook
 *
 * This module provides reusable hooks for common dialog state patterns,
 * reducing repetitive useState declarations and providing consistent
 * dialog management across components.
 *
 * Key responsibilities:
 * - Manage dialog open/close state
 * - Provide helper functions for common dialog operations
 * - Support confirmation dialogs and simple dialogs
 * - Handle dialog state cleanup and reset
 *
 * Usage:
 * - Import useDialogState for simple dialogs
 * - Import useConfirmationDialog for confirmation dialogs
 * - Use in components that need dialog functionality
 * - Reduces boilerplate code in dialog-heavy components
 */

import { useState, useCallback } from "react";
import type { MouseEvent } from "react";

/**
 * Simple dialog state management
 */
export const useDialogState = (initialOpen = false) => {
  const [open, setOpen] = useState(initialOpen);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);
  const toggleDialog = useCallback(() => setOpen((prev) => !prev), []);

  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    toggleDialog,
  };
};

/**
 * Confirmation dialog state management
 */
export const useConfirmationDialog = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);
  const [confirmText, setConfirmText] = useState("Confirm");
  const [cancelText, setCancelText] = useState("Cancel");
  const [severity, setSeverity] = useState<"error" | "warning" | "info">(
    "warning",
  );

  const showConfirmation = useCallback(
    ({
      title: newTitle,
      message: newMessage,
      onConfirm: newOnConfirm,
      confirmText: newConfirmText = "Confirm",
      cancelText: newCancelText = "Cancel",
      severity: newSeverity = "warning",
    }: {
      title: string;
      message: string;
      onConfirm: () => void;
      confirmText?: string;
      cancelText?: string;
      severity?: "error" | "warning" | "info";
    }) => {
      setTitle(newTitle);
      setMessage(newMessage);
      setOnConfirm(() => newOnConfirm);
      setConfirmText(newConfirmText);
      setCancelText(newCancelText);
      setSeverity(newSeverity);
      setOpen(true);
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    setOpen(false);
    resetState();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resetState();
  }, []);

  const resetState = useCallback(() => {
    setTitle("");
    setMessage("");
    setOnConfirm(null);
    setConfirmText("Confirm");
    setCancelText("Cancel");
    setSeverity("warning");
  }, []);

  return {
    open,
    title,
    message,
    confirmText,
    cancelText,
    severity,
    showConfirmation,
    handleConfirm,
    handleCancel,
    closeDialog: handleCancel,
  };
};

/**
 * Menu state management for dropdowns and context menus
 */
export const useMenuState = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const openMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const closeMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const isOpen = Boolean(anchorEl);

  return {
    anchorEl,
    openMenu,
    closeMenu,
    isOpen,
  };
};

/**
 * Form state management with validation
 */
export const useFormState = <T extends Record<string, any>>(
  initialValues: T,
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const setError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setError,
    setFieldTouched,
    setIsSubmitting,
    reset,
    isValid,
  };
};
