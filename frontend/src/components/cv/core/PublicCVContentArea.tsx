/**
 * Read-only CV body for public share links: same section components and ordering
 * as the editor (SectionFactory + section_config), without editor context actions.
 */

import React, { useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import type { CVSection } from "../../../types";
import type { CVData } from "../../../types/cv";
import SectionFactory from "../sections/SectionFactory";
import {
  buildCvSectionsFromData,
  isSectionEmpty,
} from "../../../utils/buildCvSectionsFromData";
import { getPublicSectionFactoryData } from "../../../utils/getPublicSectionFactoryData";

export interface PublicCVContentAreaProps {
  cvData: CVData;
  /** Object URL from shareService; revoked by parent on unmount. */
  readOnlyProfilePictureUrl?: string | null;
}

function resolvePublicCVSections(cvData: CVData): CVSection[] {
  if (cvData.section_config?.sections?.length) {
    const synced = cvData.section_config.sections
      .filter((section) => {
        if (section.id === "why_good_fit") {
          return !isSectionEmpty("why_good_fit", cvData);
        }
        return true;
      })
      .map((section) => {
        if (section.id === "why_good_fit" && section.type === "custom") {
          const customSection = cvData.custom_sections?.find(
            (s) => s.id === "why_good_fit",
          );
          if (customSection?.title) {
            return { ...section, title: customSection.title };
          }
        }
        return section;
      });
    return synced.filter((s) => s.visible).sort((a, b) => a.order - b.order);
  }
  return buildCvSectionsFromData(cvData);
}

const PublicCVContentArea: React.FC<PublicCVContentAreaProps> = ({
  cvData,
  readOnlyProfilePictureUrl,
}) => {
  const sections = useMemo(() => resolvePublicCVSections(cvData), [cvData]);

  const noop = useCallback(() => {}, []);
  const noopUpdate = useCallback((_data: unknown) => {
    void _data;
  }, []);
  const noopSave = useCallback(async (_data: unknown, _message?: string) => {
    void _data;
    void _message;
  }, []);
  const noopUnsaved = useCallback((_id: string, _has: boolean) => {
    void _id;
    void _has;
  }, []);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: "#f5f5f5",
        p: { xs: 1, md: 2 },
      }}
    >
      <Paper
        id="public-cv-print-page"
        sx={{
          width: { xs: "100%", md: "210mm" },
          minHeight: "297mm",
          margin: "0 auto",
          bgcolor: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          p: { xs: 2, md: 4 },
          position: "relative",
        }}
      >
        {sections.map((section) => {
          if (!section.visible) return null;

          const payload = getPublicSectionFactoryData(
            section,
            cvData,
            readOnlyProfilePictureUrl,
          );
          if (!payload) return null;

          return (
            <Box key={section.id} sx={{ mb: 3 }}>
              <SectionFactory
                sectionType={payload.sectionType}
                sectionId={payload.sectionId}
                sectionTitle={payload.sectionTitle}
                data={payload.data}
                onUpdate={(data: unknown) => noopUpdate(data)}
                onSave={(data: unknown, message?: string) =>
                  noopSave(data, message)
                }
                isEditing={false}
                onEdit={noop}
                onClose={noop}
                onUnsavedChanges={noopUnsaved}
                readOnly
                readOnlyProfilePictureUrl={payload.readOnlyProfilePictureUrl}
                isCustomSection={payload.isCustomSection}
              />
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
};

export default PublicCVContentArea;
