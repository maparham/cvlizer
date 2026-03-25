/**
 * Validation Error Banner Component
 *
 * Displays a prominent banner when validation errors exist, informing users
 * that they need to provide missing data before AI suggestions can be generated.
 * Includes functionality to scroll to the first validation error.
 */

import React, { useCallback } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import { ValidationError } from "../../utils/validation";

interface ValidationErrorBannerProps {
  validationErrors: ValidationError[];
}

export const ValidationErrorBanner: React.FC<ValidationErrorBannerProps> = ({
  validationErrors,
}) => {
  // Don't render if there are no validation errors
  if (validationErrors.length === 0) {
    return null;
  }

  const handleScrollToFirstError = useCallback(() => {
    // Find first validation error that has a section (skip "general" errors)
    const firstError = validationErrors.find(
      (e) => e.section !== "general",
    );

    if (!firstError) {
      // If all errors are general, find the scrollable container and scroll to top
      const scrollableContainer = document.querySelector(
        '[data-scrollable-container]',
      ) as HTMLElement;
      if (scrollableContainer) {
        scrollableContainer.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const sectionElement = document.querySelector(
        `[data-section="${firstError.section}"]`,
      );

      if (!sectionElement) {
        console.warn(
          `[ValidationErrorBanner] Could not find section element: ${firstError.section}`,
        );
        const scrollableContainer = document.querySelector(
          '[data-scrollable-container]',
        ) as HTMLElement;
        if (scrollableContainer) {
          scrollableContainer.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      let targetElement: Element | null = null;

      // If we have an itemIndex, try to find the specific item
      if (firstError.itemIndex !== undefined) {
        const items =
          sectionElement.querySelectorAll(".individual-item-container");
        if (items[firstError.itemIndex]) {
          targetElement = items[firstError.itemIndex];
        }
      }

      // Fallback to the section element
      if (!targetElement) {
        targetElement = sectionElement;
      }

      // Find the scrollable container
      const scrollableContainer = document.querySelector(
        '[data-scrollable-container]',
      ) as HTMLElement;

      if (scrollableContainer && targetElement) {
        // Calculate position relative to scrollable container
        const containerRect = scrollableContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();

        // Calculate scroll position: element position relative to container + current scroll
        const scrollTop =
          scrollableContainer.scrollTop +
          elementRect.top -
          containerRect.top -
          100; // 100px offset from top for better visibility

        scrollableContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      } else if (targetElement) {
        // Fallback to scrollIntoView if container not found
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  }, [validationErrors]);

  const errorCount = validationErrors.length;
  const errorText =
    errorCount === 1
      ? "1 validation error"
      : `${errorCount} validation errors`;

  return (
    <Alert
      severity="warning"
      icon={<ErrorOutline />}
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <AlertTitle sx={{ fontWeight: "bold", mb: 1 }}>
        Missing Required Information
      </AlertTitle>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            flex: 1,
          }}
        >
          Please provide the missing data before proceeding.
          <Box
            component="span"
            sx={{
              display: "block",
              mt: 0.5,
              fontWeight: 600,
              color: "warning.dark",
            }}
          >
            {errorText} found.
          </Box>
        </Typography>
        <Button
          variant="contained"
          color="warning"
          size="small"
          startIcon={<ArrowDownward />}
          onClick={handleScrollToFirstError}
          sx={{
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          View First Error
        </Button>
      </Box>
    </Alert>
  );
};

export default ValidationErrorBanner;
