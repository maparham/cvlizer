/**
 * Suggestions Sidebar Component
 *
 * Displays all AI suggestions in the AI Tools tab, grouped by section.
 * All sections are expandable/collapsible groups:
 * - Technical Skills
 * - Soft Skills
 * - Professional Summary
 * - Work Experience
 * - Education
 * Users can click on items to scroll to the respective section in the CV.
 * Items are automatically removed when accepted or rejected.
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { useCVQualityStore } from "../../../stores/cvQualityStore";
import type { CVData } from "../../../types/cv";
import { useQualityNavigation } from "../../../hooks/useQualityNavigation";
import { useJobFitNavigation } from "../../../hooks/useJobFitNavigation";
import { scrollToAndHighlight } from "../../../utils/scrollToElement";
import { NavGroup } from "./NavGroup";
import { QualityNavList } from "./QualityNavList";
import { hasNonEmptyGroupsAfter } from "./suggestionListUtils";
import { CVQualityPanel } from "./CVQualityPanel";
import { useUIStore, clampAIToolsSubTab } from "../../../stores/uiStore";

interface SuggestionsSidebarProps {
  cvData?: CVData;
  cvId: string;
  /** When true, hide the CVQualityPanel (e.g. when it is rendered elsewhere above). */
  hideCVQualityPanel?: boolean;
}

const EXPANDED_SECTION_KEYS = [
  "job-skills",
  "job-professionalSummary",
  "job-workExperience",
  "job-education",
  "quality-personalInfo",
  "quality-work",
  "quality-education",
  "quality-skills",
  "quality-professionalSummary",
];

function getEmptyStateMessage(params: {
  nothingToShowOnThisTab: boolean;
  subTabIndex: number;
  allSuggestions: unknown;
  totalCount: number;
  qualityAnalysis: { correction_mode?: string } | null;
  qualityTotalCount: number;
}): string {
  const {
    nothingToShowOnThisTab,
    subTabIndex,
    allSuggestions,
    totalCount,
    qualityAnalysis,
    qualityTotalCount,
  } = params;
  if (!nothingToShowOnThisTab) return "";
  if (subTabIndex === 2) {
    if (allSuggestions != null && totalCount === 0) {
      return "No suggestions for this job.";
    }
    return "No suggestions available. Add a job description and generate suggestions to get started.";
  }
  const ranProofread = qualityAnalysis?.correction_mode === "proofread";
  const ranCoaching = qualityAnalysis?.correction_mode === "coaching";
  const ranThisTab =
    (subTabIndex === 0 && ranProofread) || (subTabIndex === 1 && ranCoaching);
  if (ranThisTab && qualityTotalCount === 0) {
    return "No issues found.";
  }
  return "No suggestions available. Analyze your CV quality to get started.";
}

const SuggestionsSidebar: React.FC<SuggestionsSidebarProps> = ({
  cvData,
  cvId,
  hideCVQualityPanel = false,
}) => {
  const { allSuggestions } = useAISuggestionsStore();
  const aiToolsSubTab = useUIStore((s) => s.getCVEditorAIToolsSubTab(cvId));
  const subTabIndex = clampAIToolsSubTab(aiToolsSubTab);
  const qualityAnalysis = useCVQualityStore((s) =>
    s.currentCvId === cvId ? s.qualityAnalysis : null
  );

  // Ref to store timeout IDs for cleanup
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Cleanup timeouts when cvData or cvId changes (not just on unmount)
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, [cvData, cvId]);

  /** Shared scroll-and-highlight; used by both job-fit and quality nav. */
  const scrollToElement = useCallback(
    (targetElement: HTMLElement, options?: { isFallback?: boolean }) => {
      const ok = scrollToAndHighlight(targetElement, options, timeoutRefs);
      if (!ok) {
        console.warn(
          "SuggestionsSidebar: Could not find scrollable container with data-scrollable-container attribute"
        );
      }
    },
    []
  );

  const {
    groupedSuggestions,
    totalCount,
    handleItemClick,
  } = useJobFitNavigation(allSuggestions, cvData, scrollToElement);

  const {
    groupedSuggestions: groupedQualitySuggestions,
    totalCount: qualityTotalCount,
    qualityListTitle,
    handleItemClick: handleQualityItemClick,
  } = useQualityNavigation(qualityAnalysis, cvData, scrollToElement);

  // State for expandable groups - Map for scalability
  const [expandedSections, setExpandedSections] = useState<Map<string, boolean>>(
    () => new Map(EXPANDED_SECTION_KEYS.map((k) => [k, true]))
  );
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => new Map(prev).set(key, !prev.get(key)));
  }, []);

  const jobGroups = useMemo(
    () => [
      groupedSuggestions.skills,
      groupedSuggestions.professionalSummary,
      groupedSuggestions.workExperience,
      groupedSuggestions.education,
    ],
    [groupedSuggestions]
  );

  const hasJobSuggestions = totalCount > 0;
  const tabMatchesQualityAnalysis =
    (subTabIndex === 0 && qualityAnalysis?.correction_mode === "proofread") ||
    (subTabIndex === 1 && qualityAnalysis?.correction_mode === "coaching");
  const showQualityList =
    qualityTotalCount > 0 && tabMatchesQualityAnalysis;
  const showJobFitList = subTabIndex === 2 && hasJobSuggestions;
  const showQualityListForTab =
    (subTabIndex === 0 || subTabIndex === 1) && showQualityList;
  const nothingToShowOnThisTab =
    subTabIndex === 2 ? !hasJobSuggestions : !showQualityList;

  const emptyStateMessage = getEmptyStateMessage({
    nothingToShowOnThisTab,
    subTabIndex,
    allSuggestions,
    totalCount,
    qualityAnalysis,
    qualityTotalCount,
  });

  if (nothingToShowOnThisTab) {
    return (
      <Box>
        {cvId && !hideCVQualityPanel && (
          <>
            <CVQualityPanel cvId={cvId} subTabIndex={subTabIndex} />
            <Divider sx={{ my: 2 }} />
          </>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          {emptyStateMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* CV Quality Panel - Shown if cvId available and not hidden (e.g. when rendered above by parent) */}
      {cvId && !hideCVQualityPanel && (
        <>
          <CVQualityPanel
            cvId={cvId}
            subTabIndex={subTabIndex}
          />
          {(showJobFitList || showQualityListForTab) && <Divider sx={{ my: 2 }} />}
        </>
      )}

      {/* Job-Based Suggestions (tab 2) */}
      {showJobFitList && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <AutoAwesomeIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              Job Fit Issues ({totalCount})
            </Typography>
          </Box>
        </>
      )}

      {/* Quality-based suggestions (tab 0 or 1) */}
      {showQualityListForTab && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <AutoAwesomeIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              {qualityListTitle} ({qualityTotalCount})
            </Typography>
          </Box>
        </>
      )}

      {showJobFitList && (
        <List disablePadding sx={{ maxHeight: 400, overflow: "auto" }}>
          {/* Why Good Fit - Direct item (no expandable group) */}
          {groupedSuggestions.whyGoodFit.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleItemClick(groupedSuggestions.whyGoodFit[0])}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <CheckCircleIcon fontSize="small" color="primary" />
                  <ListItemText
                    primary={groupedSuggestions.whyGoodFit[0].title}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                    primaryTypographyProps={{
                      variant: "body2",
                      sx: {
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    }}
                  />
                  <Chip
                    label="Why Good Fit"
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: "0.7rem",
                      height: 20,
                      flexShrink: 0,
                    }}
                  />
                </Box>
              </ListItemButton>
            </ListItem>
            {/* Divider if there are other sections below */}
            {(groupedSuggestions.skills.length > 0 ||
              groupedSuggestions.professionalSummary.length > 0 ||
              groupedSuggestions.workExperience.length > 0 ||
              groupedSuggestions.education.length > 0) && (
              <Divider sx={{ my: 1 }} />
            )}
          </>
        )}

        <NavGroup
          title="Skills"
          items={groupedSuggestions.skills}
          icon={<CodeIcon fontSize="small" />}
          chipLabel="Skills"
          expanded={expandedSections.get("job-skills") ?? true}
          onToggleExpanded={() => toggleSection("job-skills")}
          onItemClick={handleItemClick}
          showDivider={hasNonEmptyGroupsAfter(jobGroups, 0)}
        />

        <NavGroup
          title="Professional Summary"
          items={groupedSuggestions.professionalSummary}
          icon={<PersonIcon fontSize="small" />}
          chipLabel="Professional Summary"
          expanded={expandedSections.get("job-professionalSummary") ?? true}
          onToggleExpanded={() => toggleSection("job-professionalSummary")}
          onItemClick={handleItemClick}
          showDivider={hasNonEmptyGroupsAfter(jobGroups, 1)}
        />

        <NavGroup
          title="Work Experience"
          items={groupedSuggestions.workExperience}
          icon={<WorkIcon fontSize="small" />}
          chipLabel="Work Experience"
          expanded={expandedSections.get("job-workExperience") ?? true}
          onToggleExpanded={() => toggleSection("job-workExperience")}
          onItemClick={handleItemClick}
          showDivider={hasNonEmptyGroupsAfter(jobGroups, 2)}
        />

        <NavGroup
          title="Education"
          items={groupedSuggestions.education}
          icon={<SchoolIcon fontSize="small" />}
          chipLabel="Education"
          expanded={expandedSections.get("job-education") ?? true}
          onToggleExpanded={() => toggleSection("job-education")}
          onItemClick={handleItemClick}
        />
        </List>
      )}

      {showQualityListForTab && (
        <QualityNavList
          groupedSuggestions={groupedQualitySuggestions}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onItemClick={handleQualityItemClick}
        />
      )}
    </Box>
  );
};

export default SuggestionsSidebar;
