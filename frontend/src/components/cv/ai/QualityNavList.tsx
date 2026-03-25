/**
 * QualityNavList - Renders the quality (proofread/coaching) suggestions list.
 *
 * Extracted from SuggestionsSidebar for readability and testability.
 */

import React from "react";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import CodeIcon from "@mui/icons-material/Code";
import ArticleIcon from "@mui/icons-material/Article";
import { NavGroup, CustomSectionNavItem } from "./NavGroup";
import { hasNonEmptyGroupsAfter } from "./suggestionListUtils";
import type { GroupedQualitySuggestions, QualityNavItem } from "../../../hooks/useQualityNavigation";

export interface QualityNavListProps {
  groupedSuggestions: GroupedQualitySuggestions;
  expandedSections: Map<string, boolean>;
  onToggleSection: (key: string) => void;
  onItemClick: (item: QualityNavItem) => void;
}

export function QualityNavList({
  groupedSuggestions,
  expandedSections,
  onToggleSection,
  onItemClick,
}: QualityNavListProps): React.ReactElement {
  // Array of groups rendered as NavGroup components (excludes customSections which are individual rows)
  const navGroupsOnly = [
    groupedSuggestions.personalInfo,
    groupedSuggestions.workExperience,
    groupedSuggestions.education,
    groupedSuggestions.skills,
    groupedSuggestions.professionalSummary,
  ];

  return (
    <List disablePadding sx={{ maxHeight: 400, overflow: "auto" }}>
      <NavGroup
        title="Personal Info"
        items={groupedSuggestions.personalInfo}
        icon={<PersonIcon fontSize="small" />}
        chipLabel="Personal"
        expanded={expandedSections.get("quality-personalInfo") ?? true}
        onToggleExpanded={() => onToggleSection("quality-personalInfo")}
        onItemClick={onItemClick}
        showDivider={
          groupedSuggestions.customSections.length > 0 ||
          hasNonEmptyGroupsAfter(navGroupsOnly, 0)
        }
      />
      {groupedSuggestions.customSections.map((item, index) => (
        <React.Fragment key={item.id}>
          <CustomSectionNavItem
            item={item}
            icon={<ArticleIcon fontSize="small" />}
            chipLabel="Section"
            onItemClick={onItemClick}
          />
          {index < groupedSuggestions.customSections.length - 1 && (
            <Divider sx={{ ml: 2 }} />
          )}
        </React.Fragment>
      ))}
      {groupedSuggestions.customSections.length > 0 &&
        hasNonEmptyGroupsAfter(navGroupsOnly, 0) && (
          <Divider sx={{ my: 1 }} />
        )}
      <NavGroup
        title="Work Experience"
        items={groupedSuggestions.workExperience}
        icon={<WorkIcon fontSize="small" />}
        chipLabel="Work"
        expanded={expandedSections.get("quality-work") ?? true}
        onToggleExpanded={() => onToggleSection("quality-work")}
        onItemClick={onItemClick}
        showDivider={hasNonEmptyGroupsAfter(navGroupsOnly, 1)}
      />
      <NavGroup
        title="Education"
        items={groupedSuggestions.education}
        icon={<SchoolIcon fontSize="small" />}
        chipLabel="Education"
        expanded={expandedSections.get("quality-education") ?? true}
        onToggleExpanded={() => onToggleSection("quality-education")}
        onItemClick={onItemClick}
        showDivider={hasNonEmptyGroupsAfter(navGroupsOnly, 2)}
      />
      <NavGroup
        title="Skills"
        items={groupedSuggestions.skills}
        icon={<CodeIcon fontSize="small" />}
        chipLabel="Skills"
        expanded={expandedSections.get("quality-skills") ?? true}
        onToggleExpanded={() => onToggleSection("quality-skills")}
        onItemClick={onItemClick}
        showDivider={hasNonEmptyGroupsAfter(navGroupsOnly, 3)}
      />
      <NavGroup
        title="Professional Summary"
        items={groupedSuggestions.professionalSummary}
        icon={<PersonIcon fontSize="small" />}
        chipLabel="Summary"
        expanded={expandedSections.get("quality-professionalSummary") ?? true}
        onToggleExpanded={() => onToggleSection("quality-professionalSummary")}
        onItemClick={onItemClick}
      />
    </List>
  );
}
