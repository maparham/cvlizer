/**
 * Rotating Tips Component
 *
 * Displays practical tips that rotate every 12 seconds with fade transitions.
 * Used during AI loading and after suggestions are generated to provide
 * helpful guidance to users about reviewing AI suggestions.
 */

import React, { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";

const practicalTips = [
  "AI suggestions need human review. Use them as a starting point, but ensure your CV reflects your own voice. You are the master of your CV.",
  "Review each suggestion carefully before accepting. Make sure it accurately reflects your experience and skills.",
  "Customize AI suggestions to match your personal style and voice. Your CV should sound like you, not a robot.",
  "Don't accept suggestions blindly. Verify facts, dates, and achievements before adding them to your CV.",
];

const TIP_ROTATION_INTERVAL = 12000; // 12 seconds per tip

/**
 * Custom hook to handle rotating tips
 */
const useRotatingTip = () => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFadeIn, setTipFadeIn] = useState(true);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setTipFadeIn(false);

      // Clear any pending timeout before creating a new one
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
      }

      // After fade out completes, change tip and fade in
      tipTimeoutRef.current = setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % practicalTips.length);
        setTipFadeIn(true);
        tipTimeoutRef.current = null;
      }, 300); // Half of fade transition duration
    }, TIP_ROTATION_INTERVAL);

    return () => {
      clearInterval(interval);
      // Clear any pending timeout when component unmounts
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
        tipTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    currentTip: practicalTips[currentTipIndex],
    tipFadeIn,
  };
};

interface RotatingTipsProps {
  /** Optional className for styling */
  className?: string;
  /** Optional variant for different styling contexts */
  variant?: "loading" | "sidebar";
}

const RotatingTips: React.FC<RotatingTipsProps> = ({
  className,
  variant = "sidebar",
}) => {
  const { currentTip, tipFadeIn } = useRotatingTip();

  // Different styling for loading vs sidebar contexts
  const boxSx =
    variant === "loading"
      ? {
          mt: 2,
          p: 2,
          borderRadius: 2,
          backgroundColor: "rgba(25, 118, 210, 0.05)",
          border: "1px solid rgba(25, 118, 210, 0.2)",
          maxWidth: 500,
        }
      : {
          mt: 2,
          p: 2,
          borderRadius: 2,
          backgroundColor: "rgba(25, 118, 210, 0.05)",
          border: "1px solid rgba(25, 118, 210, 0.2)",
        };

  return (
    <Box className={className} sx={boxSx}>
      <Fade in={tipFadeIn} timeout={600}>
        <Typography
          variant="body2"
          sx={{
            color: "text.primary",
            lineHeight: 1.6,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          💡 {currentTip}
        </Typography>
      </Fade>
    </Box>
  );
};

export default RotatingTips;
