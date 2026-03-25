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
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { CVSection } from "../../../types";
import {
  PersonalInfo,
  CustomSection,
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
import { useAISuggestionsStore } from "../../../stores/aiSuggestionsStore";
import InlineDraftSection from "../ai/InlineDraftSection";
import { AISummarySuggestionCard } from "../ai/AISummarySuggestionCard";
import { ValidationErrorBanner } from "../ValidationErrorBanner";
import EditingIndicator from "./EditingIndicator";

/**
 * Custom section used for AI summary. Rule is defined in backend
 * _get_summary_custom_section (ai_suggestions_service.py); frontend mirrors it:
 * type professional_summary → title "professional summary" (case-insensitive) → first.
 */
function getSummaryCustomSection(cvData: { custom_sections?: CustomSection[] } | null): CustomSection | undefined {
  const list = cvData?.custom_sections ?? [];
  const byType = list.find((s) => s?.type === "professional_summary");
  if (byType) return byType;
  const byTitle = list.find((s) => (s?.title ?? "").trim().toLowerCase() === "professional summary");
  return byTitle ?? list[0];
}

interface CVContentAreaProps {
  cvId?: string;
}

const CVContentArea: React.FC<CVContentAreaProps> = ({ cvId }) => {
  // Get data from context instead of props
  const {
    cvData,
    onUpdateCV,
    onSave,
    validationErrors,
    toggleSectionVisibility,
    deleteSectionPermanently,
  } = useCVEditor();
  const { sections } = useCVEditorControls();
  const { editing, changes } = useCVEditorState();
  const { allSuggestions, dismissSummarySuggestion } = useAISuggestionsStore();

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

    const isEditing =
      section.type === "custom"
        ? editingSection === section.id
        : editingSection === section.type;

    // Section key: for custom sections use section.id (unique per section);
    // for predefined sections section.id equals section.type.
    const sectionKey = section.type === "custom" ? section.id : section.type;

    // Check if another individual item is being edited in a DIFFERENT section
    const isAnotherItemBeingEdited =
      safeEditingIndividualItem !== null &&
      safeEditingIndividualItem.sectionId !== sectionKey;

    // Get drafts that should appear before/after this section
    const draftsBefore = getDraftsBeforeSection(sectionKey);
    const draftsAfter = getDraftsAfterSection(sectionKey);

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
              sectionId={section.id}
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
              cvId={cvId}
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={section.type === "custom"}
            />
          );
        case "custom": {
          const customSectionData = cvData?.custom_sections?.find(
            (s) => s.id === section.id,
          );
          const summarySection = getSummaryCustomSection(cvData);
          const isSummarySection = summarySection?.id === section.id;
          const summarySuggestion = isSummarySection
            ? allSuggestions?.professional_summary
            : null;
          const hasSummarySuggestion =
            summarySuggestion?.suggested_text?.trim().length > 0;
          const saveCustomSection = async (nextContent: string, message?: string) => {
            const next = (cvData?.custom_sections ?? []).map((s) =>
              s.id === section.id ? { ...s, content: nextContent } : s,
            );
            await onSave(
              { ...cvData, custom_sections: next },
              message || "Section saved",
            );
          };
          return (
            <Box data-section={isSummarySection ? "professional_summary" : section.id}>
              {hasSummarySuggestion && (
                <Box sx={{ mb: 2 }}>
                  <AISummarySuggestionCard
                    suggestion={summarySuggestion}
                    onApply={async (suggestedText) => {
                      await saveCustomSection(
                        suggestedText,
                        "Summary suggestion applied",
                      );
                      await dismissSummarySuggestion();
                    }}
                    onDismiss={dismissSummarySuggestion}
                  />
                </Box>
              )}
              <SectionFactory
                sectionType="custom"
                sectionId={section.id}
                sectionTitle={section.title}
                onSectionTitleSave={handleTitleSave}
                data={customSectionData}
                onUpdate={(data: unknown) => {
                  const next = (cvData?.custom_sections ?? []).map((s) =>
                    s.id === section.id ? { ...s, ...(data as CustomSection) } : s,
                  );
                  onUpdateCV({ ...cvData, custom_sections: next });
                }}
                onSave={async (data: unknown, message?: string) => {
                  const next = (cvData?.custom_sections ?? []).map((s) =>
                    s.id === section.id ? { ...s, ...(data as CustomSection) } : s,
                  );
                  await onSave(
                    { ...cvData, custom_sections: next },
                    message || "Section saved",
                  );
                }}
                isEditing={isEditing}
                onEdit={() => handleSectionEdit(section.id)}
                onClose={() => requestSectionCancel()}
                onUnsavedChanges={onUnsavedChanges}
                cvId={cvId}
                onHide={() => toggleSectionVisibility(section.id)}
                onDelete={() => deleteSectionPermanently(section.id)}
                isCustomSection={true}
              />
            </Box>
          );
        }
        case "work_experience":
          return (
            <SectionFactory
              sectionType="work_experience"
              sectionId={section.id}
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
              cvId={cvId}
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "education":
          return (
            <SectionFactory
              sectionType="education"
              sectionId={section.id}
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
              cvId={cvId}
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "skills":
          return (
            <SectionFactory
              sectionType="skills"
              sectionId={section.id}
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
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "certifications":
          return (
            <SectionFactory
              sectionType="certifications"
              sectionId={section.id}
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
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "projects":
          return (
            <SectionFactory
              sectionType="projects"
              sectionId={section.id}
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
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "awards":
          return (
            <SectionFactory
              sectionType="awards"
              sectionId={section.id}
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
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "publications":
          return (
            <SectionFactory
              sectionType="publications"
              sectionId={section.id}
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
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
            />
          );
        case "volunteer_experience":
          return (
            <SectionFactory
              sectionType="volunteer_experience"
              sectionId={section.id}
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
              onHide={() => toggleSectionVisibility(section.id)}
              onDelete={() => deleteSectionPermanently(section.id)}
              isCustomSection={false}
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

  // Find the section title for the currently editing section
  const getEditingSectionTitle = (): string | null => {
    const sectionKey = editingSection || editingIndividualItem?.sectionId;
    if (!sectionKey) return null;

    const section = safeSections.find(
      (s) => s.type === sectionKey || s.id === sectionKey,
    );
    return section?.title || null;
  };

  return (
    <Box
      data-scrollable-container
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        bgcolor: "#f5f5f5",
        p: { xs: 1, md: 2 },
      }}
    >
      {/* Editing Indicator */}
      <EditingIndicator
        editingSection={editingSection}
        editingIndividualItem={safeEditingIndividualItem}
        sectionTitle={getEditingSectionTitle()}
      />

      {/* Validation Error Banner */}
      {validationErrors.length > 0 && (
        <Box
          sx={{
            maxWidth: { xs: "100%", md: "210mm" },
            margin: "0 auto",
            mb: 2,
          }}
        >
          <ValidationErrorBanner validationErrors={validationErrors} />
        </Box>
      )}

      <Paper
        id="cv-print-page"
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
