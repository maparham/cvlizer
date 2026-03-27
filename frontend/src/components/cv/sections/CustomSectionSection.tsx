/**
 * Renders a single custom section (user-defined or AI-extracted).
 * Supports editable title and markdown content, with writing corrections integration.
 */

import React from "react";
import Box from "@mui/material/Box";
import MarkdownRenderer from "../../common/MarkdownRenderer";
import { SectionProps } from "../../../types";
import SimpleFormSection from "../core/SimpleFormSection";
import { FormField } from "../core/formUtils";
import type { CustomSection } from "../../../types/cv";
import { useSingleSectionWritingCorrections } from "./hooks/useSingleSectionWritingCorrections";
import { DescriptionCorrectionBlock } from "../ai/DescriptionCorrectionBlock";
import { useOverwriteConfirm, OVERWRITE_MSG } from "../../../contexts/OverwriteConfirmContext";
import { useEditedSinceAIStore } from "../../../stores/editedSinceAIStore";
import { createTrackedFieldUpdater } from "./hooks/createTrackedFieldUpdater";
import { buildCustomSectionSuggestionId } from "../../../utils/qualitySuggestionIds";

interface CustomSectionSectionProps extends SectionProps<CustomSection> {
  cvId?: string;
  sectionId: string;
}

const CustomSectionSection: React.FC<CustomSectionSectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title = "Section",
  onTitleSave,
  sectionId,
  cvId,
  onHide,
  onDelete,
  isCustomSection = true,
  readOnly,
}) => {
  const safeData = data ?? { id: sectionId, title: "", content: "" };
  const { confirm: overwriteConfirm } = useOverwriteConfirm();
  const { isEdited, clearEdited } = useEditedSinceAIStore();

  const {
    descriptionCorrection,
    handleApplyFieldCorrection,
    handleDismissWritingCorrection,
    createWritingCorrectionHandler,
    onRetry,
    onBack,
    canGoBack,
    onForward,
    canGoForward,
    isRetrying,
    draftIndex,
    draftTotal,
  } = useSingleSectionWritingCorrections({
    cvId,
    sectionKeys: [`custom_sections[${sectionId}].content`, sectionId],
    expectedItemType: "custom",
    getValueFromCV: (c) =>
      (c.parsed_data?.custom_sections as CustomSection[] | undefined)?.find(
        (s) => s.id === sectionId
      )?.content ?? "",
    formFieldName: "content",
  });

  /**
   * Wrapper that checks for edited state and prompts user before applying correction.
   * Clears edited state after successful application.
   */
  const withOverwriteConfirm = React.useCallback(
    async <T extends unknown[]>(applyFn: (...args: T) => Promise<void>, ...args: T): Promise<void> => {
      if (cvId && isEdited(cvId, sectionId)) {
        const ok = await overwriteConfirm(OVERWRITE_MSG);
        if (!ok) return;
      }
      await applyFn(...args);
      if (cvId) clearEdited(cvId, sectionId);
    },
    [cvId, sectionId, isEdited, overwriteConfirm, clearEdited]
  );

  const renderForm = (
    editData: CustomSection,
    updateData: (field: string, value: string) => void
  ) => {
    const wrappedUpdateData = createTrackedFieldUpdater(cvId, sectionId, updateData, ["content"]);
    const handleApplyWritingCorrectionInEdit = createWritingCorrectionHandler(
      "edit",
      editData as unknown as Record<string, unknown>,
      (field, value) => updateData(field, value as string),
      onSave ? async (d) => onSave(d as unknown as CustomSection) : undefined
    );

    return (
      <Box>
        <FormField
          config={{
            name: "content",
            label: editData?.title || title,
            placeholder: "Section content... (Markdown supported)",
            required: false,
            multiline: true,
            rows: 4,
            useMarkdownEditor: true,
          }}
          value={typeof editData === "string" ? editData : (editData?.content ?? "")}
          onChange={(value) => wrappedUpdateData("content", value)}
          error={false}
          helperText="Markdown formatting is supported"
          htmlDiffCorrection={descriptionCorrection}
          onApplyCorrection={(correction) =>
            withOverwriteConfirm(
              // First param is unused by handler (marked with _ prefix), pass undefined
              async () => await handleApplyWritingCorrectionInEdit(undefined as any, correction)
            )
          }
          onDismissCorrection={() =>
            descriptionCorrection && handleDismissWritingCorrection(descriptionCorrection.correction)
          }
        />
      </Box>
    );
  };

  const renderDisplay = (displayData: CustomSection) => (
    <Box>
      <Box
        sx={{
          lineHeight: 1.6,
          "& h1, & h2, & h3, & h4, & h5, & h6": {
            marginTop: 1,
            marginBottom: 0.5,
            fontWeight: 600,
          },
          "& p": { marginBottom: 1 },
          "& ul, & ol": { marginBottom: 1, paddingLeft: 2 },
          "& li": { marginBottom: 0.25 },
        }}
      >
        <MarkdownRenderer
          content={(typeof displayData === "string" ? displayData : displayData?.content) || ""}
          variant="body1"
        />
      </Box>
      <DescriptionCorrectionBlock
        descriptionCorrection={descriptionCorrection}
        handleApplyFieldCorrection={(fieldCorrection, parentCorrection) =>
          withOverwriteConfirm(handleApplyFieldCorrection, fieldCorrection, parentCorrection)
        }
        handleDismissWritingCorrection={handleDismissWritingCorrection}
        fieldName="content"
        onRetry={onRetry}
        onBack={onBack}
        canGoBack={canGoBack}
        onForward={onForward}
        canGoForward={canGoForward}
        draftIndex={draftIndex}
        draftTotal={draftTotal}
        isRetrying={isRetrying}
        suggestionCardId={buildCustomSectionSuggestionId(sectionId)}
      />
    </Box>
  );

  return (
    <SimpleFormSection
      data={safeData}
      onUpdate={(d: unknown) => onUpdate(d as CustomSection)}
      onSave={async (d: unknown, msg?: string) => onSave(d as CustomSection, msg)}
      isEditing={isEditing}
      onEdit={onEdit}
      onClose={onClose}
      onUnsavedChanges={onUnsavedChanges}
      title={title}
      onTitleSave={onTitleSave}
      sectionId={sectionId}
      requiredFields={[]}
      renderForm={renderForm}
      renderDisplay={renderDisplay}
      autoSaveMessage="Section saved"
      onHide={onHide}
      onDelete={onDelete}
      isCustomSection={isCustomSection}
      readOnly={readOnly}
    />
  );
};

export default React.memo(CustomSectionSection);
