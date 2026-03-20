/**
 * JobLibrary Dialogs Component
 *
 * Wraps both the JobDescriptionsModal and JobDescriptionStatusDialog.
 *
 * Key responsibilities:
 * - Display job description modal for creating/editing
 * - Display status dialog for updating status
 *
 * Usage:
 * - Used to manage all dialog states in JobLibrary page
 * - Requires dialog state and handlers from parent
 */

import React from "react";
import { JobDescription, JobDescriptionStatusUpdate } from "../../types/ai";
import JobDescriptionsModal from "../cv/ai/job-descriptions-modal/index";
import JobDescriptionStatusDialog from "../cv/ai/JobDescriptionStatusDialog";

interface JobLibraryDialogsProps {
  isModalOpen: boolean;
  editingJobDescription: JobDescription | null;
  statusDialogOpen: boolean;
  statusEditingJobDescription: JobDescription | null;
  onModalClose: () => void;
  onStatusDialogClose: () => void;
  onStatusSave: (updates: JobDescriptionStatusUpdate) => Promise<void>;
}

export const JobLibraryDialogs: React.FC<JobLibraryDialogsProps> = ({
  isModalOpen,
  editingJobDescription,
  statusDialogOpen,
  statusEditingJobDescription,
  onModalClose,
  onStatusDialogClose,
  onStatusSave,
}) => {
  return (
    <>
      {/* Job Description Modal */}
      <JobDescriptionsModal
        open={isModalOpen}
        onClose={onModalClose}
        cvId="" // No CV context in job library
        editingJobDescription={editingJobDescription}
      />

      {/* Status Update Dialog */}
      <JobDescriptionStatusDialog
        open={statusDialogOpen}
        onClose={onStatusDialogClose}
        jobDescription={statusEditingJobDescription}
        onSave={onStatusSave}
      />
    </>
  );
};
