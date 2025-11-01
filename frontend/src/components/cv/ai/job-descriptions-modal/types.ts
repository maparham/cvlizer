/**
 * TypeScript interfaces for JobDescriptionsModal sub-components
 */

import { JobDescription } from "../../../../types/ai";
import { FieldValidationResult } from "../../../../utils/validation";

/**
 * Main modal external props interface
 */
export interface JobDescriptionsModalProps {
  open: boolean;
  onClose: () => void;
  cvId: string;
  onJobDescriptionSelect?: (jobDescription: JobDescription | null) => void;
  onJobDescriptionCreated?: () => void;
  editingJobDescription?: JobDescription | null;
}

/**
 * URL Tab component props
 */
export interface URLTabProps {
  urlInput: string;
  setUrlInput: (value: string) => void;
  urlValidation: FieldValidationResult;
  urlTouched: boolean;
  isLoading: boolean;
  error: string | null;
  onUrlChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlBlur: () => void;
  onSubmit: () => void;
}

/**
 * Manual Tab component props
 */
export interface ManualTabProps {
  title: string;
  setTitle: (value: string) => void;
  company: string;
  setCompany: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  textInput: string;
  setTextInput: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: () => void;
}

/**
 * Archive Tab component props
 */
export interface ArchiveTabProps {
  jobDescriptions: JobDescription[];
  activeJobDescription: JobDescription | null;
  parsingJobDescriptions: Set<string>;
  onEdit: (jobDescription: JobDescription) => void;
  onDelete: (jobDescription: JobDescription) => void;
  onSelect: (jobDescription: JobDescription) => void;
}

/**
 * Edit Dialog component props
 */
export interface EditDialogProps {
  open: boolean;
  jobDescription: JobDescription | null;
  isLoading: boolean;
  onClose: () => void;
  onSave: (updates: {
    title: string;
    company: string;
    location: string;
    content: string;
  }) => void;
}

/**
 * Delete Dialog component props
 */
export interface DeleteDialogProps {
  open: boolean;
  jobDescription: JobDescription | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Tab panel props for internal modal tabs
 */
export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
