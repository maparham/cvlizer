import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import { SectionProps } from "../../../types";
import { useSectionAutoSave } from "./hooks";
import BaseSection from "./BaseSection";
import { createFormValidator } from "./formUtils";

interface SimpleFormSectionProps extends SectionProps {
  title: string;
  sectionId: string;
  requiredFields: string[];
  renderForm: (
    _data: any,
    _updateData: (_field: string, _value: any) => void,
    _onSave: () => void,
    _onCancel: () => void,
  ) => React.ReactNode;
  renderDisplay: (_data: any) => React.ReactNode;
  autoSaveMessage: string;
  autoSaveMode?: boolean; // If true, don't show Save/Cancel buttons
  onTitleSave?: (newTitle: string) => Promise<void>;
  onHide?: () => void;
  onDelete?: () => void;
  isCustomSection?: boolean;
}

/**
 * Generic simple form section component for non-array sections
 */
const SimpleFormSection: React.FC<SimpleFormSectionProps> = ({
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title,
  sectionId,
  requiredFields,
  renderForm,
  renderDisplay,
  autoSaveMessage,
  autoSaveMode = false,
  onTitleSave,
  onHide,
  onDelete,
  isCustomSection,
}) => {
  // Memoize default data to prevent unnecessary re-renders
  const defaultData = useMemo(() => {
    if (sectionId === "personal_info") {
      return {
        full_name: "",
        email: "",
        phone: "",
        location: "",
        linkedin_url: "",
        website_url: "",
      };
    } else if (sectionId === "skills") {
      return { technical: [], soft: [], languages: [] };
    }
    // Custom sections (sectionId is the custom section uuid)
    if (sectionId && sectionId.length > 10) {
      return { id: sectionId, title: "", content: "" };
    }
    return {};
  }, [sectionId]);

  const actualData = data || defaultData;
  const [editData, setEditData] = useState(actualData);
  const [isSaving, setIsSaving] = useState(false);
  const skipAutoSaveRef = useRef(false);

  useEffect(() => {
    setEditData(data || defaultData);
  }, [data, defaultData]);

  // Reset local state when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setEditData(actualData);
    }
  }, [isEditing, actualData]);

  const validateForm = useCallback(
    (data: any): boolean => {
      // First check basic required fields
      const basicValidation = createFormValidator(requiredFields)(data);
      if (!basicValidation) return false;

      return true;
    },
    [requiredFields, sectionId],
  );

  // Use common auto-save hook with validation (skip for skills section as it handles its own saving)
  useSectionAutoSave(
    isEditing,
    editData,
    actualData,
    onUpdate,
    onSave,
    autoSaveMessage,
    sectionId,
    onUnsavedChanges,
    validateForm,
    autoSaveMode && sectionId !== "skills", // Disable immediate save for skills as it handles its own saving
    skipAutoSaveRef, // Skip "on close" auto-save when user clicked Save (avoids double notification)
  );

  const handleSave = async () => {
    if (!validateForm(editData)) {
      return;
    }

    // Signal to useSectionAutoSave to skip "on close" save (we handle save below; avoids double notification)
    skipAutoSaveRef.current = true;

    // Clear unsaved changes immediately
    if (onUnsavedChanges) {
      onUnsavedChanges(sectionId, false);
    }

    // Flash green immediately
    setIsSaving(true);

    // Close edit mode after brief delay to show green flash
    setTimeout(() => {
      if (sectionId !== "skills" || !autoSaveMode) {
        onClose();
      }
      setIsSaving(false);
    }, 100);

    // Delay state updates to allow background color transition to complete (1000ms)
    setTimeout(async () => {
      onUpdate(editData);
      try {
        await onSave(editData);
      } catch (error) {
        // Error handling - data already updated locally
        console.error('Save error:', error);
      }
    }, 1100);
  };

  const handleCancel = () => {
    if (autoSaveMode) {
      // For auto-save sections, just reset and close (no dialog needed)
      setEditData(actualData);
      if (onUnsavedChanges) {
        onUnsavedChanges(sectionId, false);
      }
      onClose();
    } else {
      // For non-auto-save sections, call onClose which will check for changes
      // and show dialog if needed. Data will be reset only if user confirms discard.
      onClose();
    }
  };

  const updateData = (field: string, value: any) => {
    setEditData({ ...editData, [field]: value });
  };

  // For personal_info section, control divider visibility based on show_horizontal_line
  // Default to false (line hidden) for personal_info, true for other sections
  const showDivider =
    sectionId === "personal_info"
      ? (actualData as { show_horizontal_line?: boolean })?.show_horizontal_line ?? false
      : true;

  return (
    <BaseSection
      title={title}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={onEdit}
      onClose={onClose}
      onSave={!autoSaveMode ? handleSave : undefined}
      onCancel={handleCancel}
      isValid={!autoSaveMode ? validateForm(editData) : true}
      editButton={null}
      onTitleSave={onTitleSave}
      sectionId={sectionId}
      showDivider={showDivider}
      onHide={onHide}
      onDelete={onDelete}
      isCustomSection={isCustomSection}
    >
      {isEditing ? (
        <Box>{renderForm(editData, updateData, handleSave, handleCancel)}</Box>
      ) : (
        renderDisplay(actualData)
      )}
    </BaseSection>
  );
};

export default SimpleFormSection;
