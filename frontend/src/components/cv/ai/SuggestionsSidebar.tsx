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
  Collapse,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import { CVData, WorkExperience, Education } from "../../../types";
import {
  SkillSuggestion,
  ProfessionalSummarySuggestion,
  ItemDescriptionSuggestion,
} from "../../../types/ai";

interface SuggestionItem {
  id: string;
  title: string;
  section: string;
  type: "why_good_fit" | "skill" | "summary" | "work_experience" | "education";
}

interface SuggestionsSidebarProps {
  cvData?: CVData;
}

interface SuggestionGroupProps {
  title: string;
  items: SuggestionItem[];
  icon: React.ReactNode;
  chipLabel: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onItemClick: (item: SuggestionItem) => void;
  showDivider?: boolean;
}

const SuggestionGroup: React.FC<SuggestionGroupProps> = ({
  title,
  items,
  icon,
  chipLabel,
  expanded,
  onToggleExpanded,
  onItemClick,
  showDivider = false,
}) => {
  if (items.length === 0) return null;

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          onClick={onToggleExpanded}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
            {icon}
            <ListItemText
              primary={`${title} (${items.length})`}
              primaryTypographyProps={{
                variant: "body2",
                sx: { fontWeight: 600 },
              }}
            />
            {expanded ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </Box>
        </ListItemButton>
      </ListItem>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => onItemClick(item)}
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
                      minWidth: 0, // Critical: allows flex children to shrink below content size
                    }}
                  >
                    <ListItemText
                      primary={item.title}
                      sx={{
                        flex: 1,
                        minWidth: 0, // Critical: allows text to truncate
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
                      label={chipLabel}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: "0.7rem",
                        height: 20,
                        flexShrink: 0, // Prevent chip from shrinking
                      }}
                    />
                  </Box>
                </ListItemButton>
              </ListItem>
              {index < items.length - 1 && <Divider sx={{ ml: 2 }} />}
            </React.Fragment>
          ))}
        </List>
      </Collapse>
      {showDivider && <Divider sx={{ my: 1 }} />}
    </>
  );
};

const SuggestionsSidebar: React.FC<SuggestionsSidebarProps> = ({ cvData }) => {
  const { allSuggestions } = useAISuggestionsStore();

  // Ref to store timeout IDs for cleanup
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, []);

  // Helper function to get shortened title for a suggestion
  const getSuggestionTitle = useCallback(
    (
      suggestion:
        | SkillSuggestion
        | ProfessionalSummarySuggestion
        | ItemDescriptionSuggestion,
      type: "skill" | "summary" | "work_experience" | "education",
    ): string => {
      switch (type) {
        case "skill": {
          const skillSuggestion = suggestion as SkillSuggestion;
          return `Add ${skillSuggestion.skill}`;
        }
        case "summary":
          return "Improve Professional Summary";
        case "work_experience": {
          const itemSuggestion = suggestion as ItemDescriptionSuggestion;
          // Find the work experience item in cvData
          if (
            cvData?.work_experience &&
            Array.isArray(cvData.work_experience) &&
            cvData.work_experience.length > 0
          ) {
            const workExp = cvData.work_experience.find(
              (item: WorkExperience) => item.id === itemSuggestion.id,
            );
            if (workExp) {
              const position = workExp.position || "Position";
              const company = workExp.company || "Company";
              return `Improve ${position} at ${company}`;
            }
          }
          return "Improve Work Experience Item";
        }
        case "education": {
          const itemSuggestion = suggestion as ItemDescriptionSuggestion;
          // Find the education item in cvData
          if (
            cvData?.education &&
            Array.isArray(cvData.education) &&
            cvData.education.length > 0
          ) {
            const edu = cvData.education.find(
              (item: Education) => item.id === itemSuggestion.id,
            );
            if (edu) {
              const degree = edu.degree || "Degree";
              const institution = edu.institution || "Institution";
              return `Improve ${degree} at ${institution}`;
            }
          }
          return "Improve Education Item";
        }
        default:
          return "Suggestion";
      }
    },
    [cvData],
  );


  // Group all suggestions by section
  const groupedSuggestions = useMemo(() => {
    if (!allSuggestions) {
      return {
        whyGoodFit: [],
        skills: [],
        professionalSummary: [],
        workExperience: [],
        education: [],
      };
    }

    const whyGoodFit: SuggestionItem[] = [];
    const skills: SuggestionItem[] = [];
    const professionalSummary: SuggestionItem[] = [];
    const workExperience: SuggestionItem[] = [];
    const education: SuggestionItem[] = [];

    // Add why_good_fit suggestion (FIRST priority)
    // Only show if both fit_analysis and title exist
    if (allSuggestions.why_good_fit?.fit_analysis && allSuggestions.why_good_fit?.title) {
      whyGoodFit.push({
        id: "why_good_fit",
        title: allSuggestions.why_good_fit.title,
        section: "why_good_fit",
        type: "why_good_fit",
      });
    }

    // Add skill suggestions (combine technical and soft)
    allSuggestions.skills?.technical?.forEach((skill) => {
      skills.push({
        id: `skill-technical-${skill.skill}`,
        title: getSuggestionTitle(skill, "skill"),
        section: "skills",
        type: "skill",
      });
    });

    allSuggestions.skills?.soft?.forEach((skill) => {
      skills.push({
        id: `skill-soft-${skill.skill}`,
        title: getSuggestionTitle(skill, "skill"),
        section: "skills",
        type: "skill",
      });
    });

    // Add professional summary suggestion
    if (allSuggestions.professional_summary?.suggested_text) {
      professionalSummary.push({
        id: "professional_summary",
        title: getSuggestionTitle(
          allSuggestions.professional_summary,
          "summary",
        ),
        section: "professional_summary",
        type: "summary",
      });
    }

    // Add work experience suggestions
    allSuggestions.work_experience?.forEach((suggestion) => {
      if (suggestion.suggested) {
        workExperience.push({
          id: `work_experience-${suggestion.id}`,
          title: getSuggestionTitle(suggestion, "work_experience"),
          section: "work_experience",
          type: "work_experience",
        });
      }
    });

    // Add education suggestions
    allSuggestions.education?.forEach((suggestion) => {
      if (suggestion.suggested) {
        education.push({
          id: `education-${suggestion.id}`,
          title: getSuggestionTitle(suggestion, "education"),
          section: "education",
          type: "education",
        });
      }
    });

    return {
      whyGoodFit,
      skills,
      professionalSummary,
      workExperience,
      education,
    };
  }, [allSuggestions, getSuggestionTitle]);

  // State for expandable groups
  const [skillsExpanded, setSkillsExpanded] = useState(true);
  const [professionalSummaryExpanded, setProfessionalSummaryExpanded] = useState(true);
  const [workExperienceExpanded, setWorkExperienceExpanded] = useState(true);
  const [educationExpanded, setEducationExpanded] = useState(true);

  const totalCount =
    groupedSuggestions.whyGoodFit.length +
    groupedSuggestions.skills.length +
    groupedSuggestions.professionalSummary.length +
    groupedSuggestions.workExperience.length +
    groupedSuggestions.education.length;

  // Handle clicking on a suggestion item - scroll to its section or specific item
  const handleItemClick = useCallback((item: SuggestionItem) => {
    let targetElement: HTMLElement | null = null;

    // Why Good Fit draft - scroll to draft card in the same tab
    if (item.type === 'why_good_fit') {
      targetElement = document.querySelector(
        '[data-section="why_good_fit_draft"]'
      ) as HTMLElement;

      if (!targetElement) {
        console.warn(
          'SuggestionsSidebar: Could not find why_good_fit draft. The draft may not be rendered yet.'
        );
        return;
      }
    }
    // For multi-item sections (work_experience, education), scroll to specific item
    else if (item.type === 'work_experience' || item.type === 'education') {
      // Extract the actual item ID from the composite suggestion ID
      // Format: "work_experience-{itemId}" or "education-{itemId}"
      // Use robust prefix removal to handle edge cases where item ID contains the section name
      const prefix = `${item.section}-`;
      const itemId = item.id.startsWith(prefix)
        ? item.id.substring(prefix.length)
        : item.id; // Fallback if format doesn't match expected pattern

      // Find the specific item by its data-item-id attribute
      targetElement = document.querySelector(
        `[data-item-id="${itemId}"]`
      ) as HTMLElement;

      if (!targetElement) {
        console.warn(
          `SuggestionsSidebar: Could not find item with data-item-id="${itemId}" for suggestion "${item.title}". ` +
          `The item may have been deleted or the page needs to be refreshed.`
        );
        return; // Exit early if item not found
      }
    }
    // For single-content sections (skills, professional_summary), scroll to section
    else {
      targetElement = document.querySelector(
        `[data-section="${item.section}"]`
      ) as HTMLElement;

      if (!targetElement) {
        console.warn(
          `SuggestionsSidebar: Could not find section with data-section="${item.section}" for suggestion "${item.title}". ` +
          `The section may not be rendered yet.`
        );
        return; // Exit early if section not found
      }
    }

    // Clear any existing timeouts from previous clicks
    timeoutRefs.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutRefs.current = [];

    // Find the CV content scrollable container
    const scrollContainer = document.querySelector('[data-scrollable-container]') as HTMLElement;

    if (!scrollContainer) {
      console.warn('SuggestionsSidebar: Could not find scrollable container with data-scrollable-container attribute');
      return;
    }

    // Calculate the target element's position relative to the scroll container
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Calculate relative position
    const relativeTop = targetRect.top - containerRect.top;
    const currentScrollTop = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;
    const targetHeight = targetElement.clientHeight;

    // Calculate scroll position to center the target in the viewport
    const targetScrollTop = currentScrollTop + relativeTop - (containerHeight / 2) + (targetHeight / 2);

    // Smooth scroll the container to the target position
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });

    // Apply temporary highlight animation using inline styles
    const originalTransition = targetElement.style.transition;
    const originalBackground = targetElement.style.backgroundColor;

    targetElement.style.transition = "background-color 1s ease-in-out";
    targetElement.style.backgroundColor = "rgba(25, 118, 210, 0.2)";

    // First timeout: fade background to transparent
    const timeoutId1 = setTimeout(() => {
      // Check if element still exists and is in the DOM
      if (targetElement && document.contains(targetElement)) {
        targetElement.style.backgroundColor = "transparent";

        // Second timeout: restore original styles
        const timeoutId2 = setTimeout(() => {
          // Check again if element still exists
          if (targetElement && document.contains(targetElement)) {
            targetElement.style.transition = originalTransition;
            targetElement.style.backgroundColor = originalBackground;
          }
          // Remove timeout ID from ref array
          timeoutRefs.current = timeoutRefs.current.filter((id) => id !== timeoutId2);
        }, 1000);

        timeoutRefs.current.push(timeoutId2);
      }
      // Remove timeout ID from ref array
      timeoutRefs.current = timeoutRefs.current.filter((id) => id !== timeoutId1);
    }, 1000);

    timeoutRefs.current.push(timeoutId1);
  }, []);

  if (totalCount === 0) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <AutoAwesomeIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
          AI Suggestions ({totalCount})
        </Typography>
      </Box>

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

        <SuggestionGroup
          title="Skills"
          items={groupedSuggestions.skills}
          icon={<CodeIcon fontSize="small" />}
          chipLabel="Skills"
          expanded={skillsExpanded}
          onToggleExpanded={() => setSkillsExpanded(!skillsExpanded)}
          onItemClick={handleItemClick}
          showDivider={
            groupedSuggestions.professionalSummary.length > 0 ||
            groupedSuggestions.workExperience.length > 0 ||
            groupedSuggestions.education.length > 0
          }
        />

        <SuggestionGroup
          title="Professional Summary"
          items={groupedSuggestions.professionalSummary}
          icon={<PersonIcon fontSize="small" />}
          chipLabel="Professional Summary"
          expanded={professionalSummaryExpanded}
          onToggleExpanded={() =>
            setProfessionalSummaryExpanded(!professionalSummaryExpanded)
          }
          onItemClick={handleItemClick}
          showDivider={
            groupedSuggestions.workExperience.length > 0 ||
            groupedSuggestions.education.length > 0
          }
        />

        <SuggestionGroup
          title="Work Experience"
          items={groupedSuggestions.workExperience}
          icon={<WorkIcon fontSize="small" />}
          chipLabel="Work Experience"
          expanded={workExperienceExpanded}
          onToggleExpanded={() =>
            setWorkExperienceExpanded(!workExperienceExpanded)
          }
          onItemClick={handleItemClick}
          showDivider={groupedSuggestions.education.length > 0}
        />

        <SuggestionGroup
          title="Education"
          items={groupedSuggestions.education}
          icon={<SchoolIcon fontSize="small" />}
          chipLabel="Education"
          expanded={educationExpanded}
          onToggleExpanded={() => setEducationExpanded(!educationExpanded)}
          onItemClick={handleItemClick}
        />
      </List>
    </Box>
  );
};

export default SuggestionsSidebar;
