/**
 * Marketing homepage copy for `/home` (alternate hero + sections layout).
 */
import React from "react";
import Box from "@mui/material/Box";

export interface MarketingHomeContent {
  headline: React.ReactNode;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  trustChips?: string[];
  heroFeatureMode: "comparison" | "bullets";
  heroBullets?: Array<{ title: string; description: string }>;
  comparisonSectionFirst: boolean;
  heroTone: "default" | "softTint";
}

const headlineYou = (
  <>
    A Resume That{" "}
    <Box component="span" sx={{ whiteSpace: "nowrap" }}>
      Reflects{" "}
      <Box component="span" sx={{ color: "primary.main", fontWeight: 800 }}>
        YOU
      </Box>
    </Box>
  </>
);

/** Default marketing variant: emotional headline, comparison hero, sections order. */
export function getMarketingHomeContent(): MarketingHomeContent {
  return {
    headline: headlineYou,
    subheadline: "Your voice, powered by GPT, so real people read it.",
    primaryCta: "Get started free",
    secondaryCta: "See how it works",
    heroFeatureMode: "comparison",
    comparisonSectionFirst: false,
    heroTone: "default",
  };
}
