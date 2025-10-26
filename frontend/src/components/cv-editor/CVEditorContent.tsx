/**
 * CV Editor Content Component
 *
 * Inner wrapper component with access to CVEditorContext.
 * Contains CVEditorHeader and PDFCVEditor.
 * Handles export logic with error notifications.
 */
import React from "react";
import { PDFCVEditor } from "../cv";
import { useCVNotifications } from "../../packages/notifications";
import { cvApi } from "../../services/api";
import { CVEditorContentProps } from "./types";
import { CVEditorHeader } from "./CVEditorHeader";

export const CVEditorContent: React.FC<CVEditorContentProps> = ({
  cvId,
  activeCV,
  onLogout,
  onMenuOpen,
  onMenuClose,
  anchorEl,
  onTitleSave,
  onDelete,
  isAdmin,
  isNewCV,
}) => {
  const { showError } = useCVNotifications(cvId);

  const handleExport = async () => {
    try {
      if (!cvId || cvId === "new") {
        showError(
          "Export Unavailable",
          "Please save your CV before exporting."
        );
        return;
      }
      await cvApi.exportCVAsPDF(cvId);
    } catch (e) {
      showError("Export Failed", "Could not open PDF export in a new tab.");
    }
  };

  return (
    <>
      <CVEditorHeader
        onLogout={onLogout}
        onMenuOpen={onMenuOpen}
        onMenuClose={onMenuClose}
        anchorEl={anchorEl}
        onExport={handleExport}
        onDelete={onDelete}
        isAdmin={isAdmin}
        isNewCV={isNewCV}
      />
      <PDFCVEditor
        title={activeCV?.original_filename || "Untitled CV"}
        onTitleSave={onTitleSave}
        cvId={cvId !== "new" ? cvId : undefined}
      />
    </>
  );
};
