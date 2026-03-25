/**
 * AI Enhancement Loading State Component
 *
 * Displays an enhanced loading experience during AI enhancement generation,
 * featuring rotating progress messages, progress indicators, and time expectations.
 *
 * Features:
 * - Rotating messages that cycle every 8-10 seconds
 * - Indeterminate progress indicators
 * - Time estimate display
 * - Helpful tips about the AI process
 */

import React, { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Fade from "@mui/material/Fade";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import RotatingTips from "./RotatingTips";

const messages = [
  "Analyzing your CV...",
  "Matching with job requirements...",
  "Generating skill suggestions...",
  "Creating personalized recommendations...",
  "Optimizing work experience...",
  "Almost ready...",
];

const MESSAGE_ROTATION_INTERVAL = 9000; // 9 seconds per message

/**
 * Custom hook to handle rotating messages
 */
const useRotatingMessage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setFadeIn(false);

      // Clear any pending timeout before creating a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After fade out completes, change message and fade in
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setFadeIn(true);
        timeoutRef.current = null;
      }, 300); // Half of fade transition duration
    }, MESSAGE_ROTATION_INTERVAL);

    return () => {
      clearInterval(interval);
      // Clear any pending timeout when component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    currentMessage: messages[currentIndex],
    fadeIn,
  };
};

interface AIEnhancementLoadingStateProps {
  /** Optional className for styling */
  className?: string;
}

const AIEnhancementLoadingState: React.FC<AIEnhancementLoadingStateProps> = ({
  className,
}) => {
  const { currentMessage, fadeIn } = useRotatingMessage();

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
        width: "100%",
      }}
    >
      {/* Circular Progress Indicator */}
      <CircularProgress
        size={60}
        thickness={4}
        sx={{
          mb: 3,
          color: "primary.main",
        }}
      />

      {/* Rotating Message with Fade Effect */}
      <Fade in={fadeIn} timeout={600}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontWeight: 500,
            color: "text.primary",
            minHeight: 32, // Prevent layout shift during message changes
          }}
        >
          {currentMessage}
        </Typography>
      </Fade>

      {/* Linear Progress Bar */}
      <Box sx={{ width: "100%", maxWidth: 400, mb: 2 }}>
        <LinearProgress
          variant="indeterminate"
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
            },
          }}
        />
      </Box>

      {/* Time Estimate */}
      <Typography
        variant="body2"
        sx={{
          mb: 1.5,
          color: "text.secondary",
          fontWeight: 500,
        }}
      >
        ⏱️ This typically takes 45-60 seconds
      </Typography>

      {/* Rotating Practical Tips */}
      <RotatingTips variant="loading" />
    </Box>
  );
};

export default AIEnhancementLoadingState;
