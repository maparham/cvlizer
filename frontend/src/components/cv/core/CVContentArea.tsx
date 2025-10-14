/**
 * CV Content Area Component
 *
 * This module renders the main PDF-style CV content area including:
 * - PDF-like paper layout with proper dimensions (A4 format)
 * - Dynamic section rendering based on visibility and order
 * - Integration with all CV section components (personal info, work experience, etc.)
 * - Real-time editing state management and individual item editing
 * - Context integration for CV data updates and saving
 */
import React from "react";
import { Box, Paper } from "@mui/material";
import { CVSection } from "../../../types";
import {
  PersonalInfo,
  ProfessionalSummary,
  WhyGoodFit,
  WorkExperience,
  Education,
  Skills,
  Certification,
  Project,
  Award,
  Publication,
  VolunteerExperience,
} from "../../../types/cv";
import SectionFactory from "../sections/SectionFactory";
import {
  useCVEditorControls,
  useCVEditorState,
  useCVEditor,
} from "../../../contexts/CVEditorContext";
import { useInlineDrafts } from "../../../hooks/useInlineDrafts";
import InlineDraftSection from "../ai/InlineDraftSection";

interface CVContentAreaProps {
  cvId?: string;
}

const CVContentArea: React.FC<CVContentAreaProps> = ({ cvId }) => {
  // Get data from context instead of props
  const { cvData, onUpdateCV, onSave } = useCVEditor();
  const { sections } = useCVEditorControls();
  const { editing, changes } = useCVEditorState();

  // Get section title update function
  const updateSectionTitle = sections.updateTitle;

  // Get inline drafts functionality
  const {
    getDraftsAfterSection,
    getDraftsBeforeSection,
    handleDraftApproved,
    handleDraftRejected,
  } = useInlineDrafts(cvId || "", cvData);

  // Extract editing-related functions for easier use
  const {
    section: editingSection,
    individualItem: editingIndividualItem,
    onSectionEdit: handleSectionEdit,
    onSectionClose: handleSectionClose,
    onRequestSectionCancel: requestSectionCancel,
    onRegisterIndividualItem: registerIndividualItemEditing,
    onUnregisterIndividualItem: unregisterIndividualItemEditing,
    onRequestIndividualCancel: requestIndividualItemCancel,
  } = editing;

  const { onUnsavedChanges } = changes;

  // Provide defaults to prevent undefined errors
  const safeSections = sections.items || [];
  const safeEditingIndividualItem = editingIndividualItem || null;

  const renderSection = (section: CVSection) => {
    if (!section.visible) {
      return null;
    }

    const isEditing = editingSection === section.type;

    // Check if another individual item is being edited in a DIFFERENT section
    const isAnotherItemBeingEdited =
      safeEditingIndividualItem !== null &&
      safeEditingIndividualItem.sectionId !== section.type;

    // Get drafts that should appear before this section
    const draftsBefore = getDraftsBeforeSection(section.type);

    // Get drafts that should appear after this section
    const draftsAfter = getDraftsAfterSection(section.type);

    // Create title save callback for this section
    const handleTitleSave = async (newTitle: string) => {
      await updateSectionTitle(section.id, newTitle);
    };

    const renderSectionContent = () => {
      switch (section.type) {
        case "personal_info":
          return (
            <SectionFactory
              sectionType="personal_info"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.personal_info}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, personal_info: data as PersonalInfo })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, personal_info: data as PersonalInfo },
                  message || "Personal information saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("personal_info")}
              onClose={() => requestSectionCancel()}
              onUnsavedChanges={onUnsavedChanges}
            />
          );
        case "professional_summary":
          return (
            <SectionFactory
              sectionType="professional_summary"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.professional_summary}
              onUpdate={(data: unknown) =>
                onUpdateCV({
                  ...cvData,
                  professional_summary: data as ProfessionalSummary,
                })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  {
                    ...cvData,
                    professional_summary: data as ProfessionalSummary,
                  },
                  message || "Professional summary saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("professional_summary")}
              onClose={() => requestSectionCancel()}
              onUnsavedChanges={onUnsavedChanges}
              cvId={cvId}
            />
          );
        case "why_good_fit":
          return (
            <SectionFactory
              sectionType="why_good_fit"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.why_good_fit}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, why_good_fit: data as WhyGoodFit })
              }
              onSave={async (data: unknown, message?: string) => {
                const whyGoodFitData = data as WhyGoodFit | null;
                const updatedCvData = {
                  ...cvData,
                  why_good_fit: whyGoodFitData,
                };

                // If the section is being deleted (set to null), also remove it from section config
                if (whyGoodFitData === null) {
                  const updatedSections = sections.items.filter(
                    (s) => s.id !== "why_good_fit",
                  );
                  updatedCvData.section_config = {
                    sections: updatedSections,
                  };
                }

                await onSave(
                  updatedCvData as any,
                  message || "Why I'm a Good Fit section saved",
                );
              }}
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("why_good_fit")}
              onClose={() => requestSectionCancel()}
              onUnsavedChanges={onUnsavedChanges}
            />
          );
        case "work_experience":
          return (
            <SectionFactory
              sectionType="work_experience"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.work_experience}
              onUpdate={(data: unknown) =>
                onUpdateCV({
                  ...cvData,
                  work_experience: data as WorkExperience[],
                })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, work_experience: data as WorkExperience[] },
                  message || "Work experience saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("work_experience")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        case "education":
          return (
            <SectionFactory
              sectionType="education"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.education}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, education: data as Education[] })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, education: data as Education[] },
                  message || "Education saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("education")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        case "skills":
          return (
            <SectionFactory
              sectionType="skills"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.skills}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, skills: data as Skills })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, skills: data as Skills },
                  message || "Skills saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("skills")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              cvId={cvId}
            />
          );
        case "certifications":
          return (
            <SectionFactory
              sectionType="certifications"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.certifications || []}
              onUpdate={(data: unknown) =>
                onUpdateCV({
                  ...cvData,
                  certifications: data as Certification[],
                })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, certifications: data as Certification[] },
                  message || "Certifications saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("certifications")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        case "projects":
          return (
            <SectionFactory
              sectionType="projects"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.projects || []}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, projects: data as Project[] })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, projects: data as Project[] },
                  message || "Projects saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("projects")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        case "awards":
          return (
            <SectionFactory
              sectionType="awards"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.awards || []}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, awards: data as Award[] })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, awards: data as Award[] },
                  message || "Awards saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("awards")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        case "publications":
          return (
            <SectionFactory
              sectionType="publications"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.publications || []}
              onUpdate={(data: unknown) =>
                onUpdateCV({ ...cvData, publications: data as Publication[] })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  { ...cvData, publications: data as Publication[] },
                  message || "Publications saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("publications")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        case "volunteer_experience":
          return (
            <SectionFactory
              sectionType="volunteer_experience"
              sectionTitle={section.title}
              onSectionTitleSave={handleTitleSave}
              data={cvData?.volunteer_experience || []}
              onUpdate={(data: unknown) =>
                onUpdateCV({
                  ...cvData,
                  volunteer_experience: data as VolunteerExperience[],
                })
              }
              onSave={(data: unknown, message?: string) =>
                onSave(
                  {
                    ...cvData,
                    volunteer_experience: data as VolunteerExperience[],
                  },
                  message || "Volunteer experience saved",
                )
              }
              isEditing={isEditing}
              onEdit={() => handleSectionEdit("volunteer_experience")}
              onClose={() => handleSectionClose()}
              onUnsavedChanges={onUnsavedChanges}
              registerIndividualItemEditing={
                registerIndividualItemEditing as any
              }
              unregisterIndividualItemEditing={
                unregisterIndividualItemEditing as any
              }
              requestIndividualItemCancel={requestIndividualItemCancel}
              isAnotherItemBeingEdited={isAnotherItemBeingEdited}
            />
          );
        default:
          return null;
      }
    };

    return (
      <Box>
        {/* Render drafts before this section */}
        {draftsBefore.map((draft) => (
          <InlineDraftSection
            key={`draft-before-${draft.id}`}
            cvId={cvId || ""}
            draft={draft}
            onApproved={() => handleDraftApproved(draft.id)}
            onRejected={() => handleDraftRejected(draft.id)}
          />
        ))}

        {/* Render the section content */}
        {renderSectionContent()}

        {/* Render drafts after this section */}
        {draftsAfter.map((draft) => (
          <InlineDraftSection
            key={`draft-after-${draft.id}`}
            cvId={cvId || ""}
            draft={draft}
            onApproved={() => handleDraftApproved(draft.id)}
            onRejected={() => handleDraftRejected(draft.id)}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ flex: 1, overflow: "auto", bgcolor: "#f5f5f5", p: 2 }}>
      <Paper
        id="cv-print-page"
        sx={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          bgcolor: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          p: 4,
          position: "relative",
        }}
      >
        {safeSections
          .sort((a, b) => a.order - b.order)
          .filter((section) => section.visible)
          .map((section) => (
            <Box key={section.id} sx={{ mb: 3 }}>
              {renderSection(section)}
            </Box>
          ))}
      </Paper>
    </Box>
  );
};

export default CVContentArea;
