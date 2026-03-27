/**
 * @fileoverview Component Type Definitions
 *
 * This module defines TypeScript interfaces and types for all CV editor components.
 * It provides type safety and clear contracts for component props, ensuring consistent
 * data flow and API design across the CV editing system.
 *
 * @module components
 * @author CV Lator Team
 * @version 1.0.0
 */

import React from "react";
import { CVData, CVSection } from "./cv";

/**
 * Base properties shared by all CV section components.
 * Provides common editing state management and UI controls.
 *
 * @interface BaseSectionProps
 * @property {React.ReactNode} [children] - Child components to render
 * @property {string} [title] - Section title displayed in the header
 * @property {boolean} [isEditing] - Whether the section is currently in edit mode
 * @property {() => void} [onEdit] - Callback to enter edit mode
 * @property {() => void} [onClose] - Callback to exit edit mode
 * @property {() => void} [onSave] - Callback to save changes
 * @property {() => void} [onCancel] - Callback to cancel changes
 * @property {React.ReactNode} [editButton] - Custom edit button component
 * @property {React.ReactNode} [headerActions] - Additional header action buttons
 * @property {boolean} [isValid] - Whether the current data is valid
 * @property {(newTitle: string) => Promise<void>} [onTitleSave] - Callback to save section title
 */
export interface BaseSectionProps {
  children?: React.ReactNode;
  title?: string;
  isEditing?: boolean;
  isSaving?: boolean;
  onEdit?: () => void;
  onClose?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  editButton?: React.ReactNode;
  headerActions?: React.ReactNode;
  headerActionsLeft?: React.ReactNode;
  isValid?: boolean;
  onTitleSave?: (newTitle: string) => Promise<void>;
  sectionId?: string;
  showDivider?: boolean;
  onHide?: () => void;
  onDelete?: () => void;
  /** If true, show delete icon (only custom sections can be deleted). */
  isCustomSection?: boolean;
  /** Read-only mode for public rendering; hides editing controls and actions. */
  readOnly?: boolean;
}

/**
 * Properties for simple form sections that edit single data objects.
 * Used by sections like PersonalInfo, ProfessionalSummary, and Skills.
 *
 * @interface SectionProps
 * @template T - The type of data being edited
 * @property {T} data - The current data object
 * @property {(data: T) => void} onUpdate - Callback to update the data
 * @property {(data: T, message?: string) => Promise<void>} onSave - Callback to save data with optional message
 * @property {boolean} isEditing - Whether the section is in edit mode
 * @property {() => void} onEdit - Callback to enter edit mode
 * @property {() => void} onClose - Callback to exit edit mode
 * @property {string} [cvId] - CV ID for AI features validation (prevents cross-CV contamination)
 * @property {(sectionId: string, hasChanges: boolean) => void} [onUnsavedChanges] - Track unsaved changes
 * @property {(sectionId: string, itemIndex: number, onCancel: () => void, onStartEdit?: () => void) => 'success' | 'dialog_shown'} [registerIndividualItemEditing] - Register individual item editing
 * @property {() => void} [unregisterIndividualItemEditing] - Unregister individual item editing
 * @property {(sectionId: string, onCancel: () => void) => void} [requestIndividualItemCancel] - Request cancel for individual item
 * @property {boolean} [isAnotherItemBeingEdited] - Whether another item is being edited
 * @property {string} [title] - Section title
 * @property {(newTitle: string) => Promise<void>} [onTitleSave] - Callback to save section title
 */
export interface SectionProps<T = unknown> {
  data: T;
  onUpdate: (data: T) => void;
  onSave: (data: T, message?: string) => Promise<void>;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  cvId?: string;
  onUnsavedChanges?: (sectionId: string, hasChanges: boolean) => void;
  registerIndividualItemEditing?: (
    sectionId: string,
    itemIndex: number,
    onCancel: () => void,
    onStartEdit?: () => void,
  ) => "success" | "dialog_shown";
  unregisterIndividualItemEditing?: () => void;
  requestIndividualItemCancel?: (
    sectionId: string,
    onCancel: () => void,
  ) => void;
  isAnotherItemBeingEdited?: boolean;
  title?: string;
  onTitleSave?: (newTitle: string) => Promise<void>;
  sectionId?: string;
  onHide?: () => void;
  onDelete?: () => void;
  isCustomSection?: boolean;
  readOnly?: boolean;
}

/**
 * Properties for array-based sections that manage collections of items.
 * Used by sections like WorkExperience, Education, Projects, etc.
 *
 * @interface ArraySectionProps
 * @template T - The type of items in the array
 * @property {T[]} data - Array of items to display and edit
 * @property {(data: T[]) => void} onUpdate - Callback to update the array
 * @property {(data: T[], message?: string) => Promise<void>} onSave - Callback to save array with optional message
 * @property {boolean} isEditing - Whether the section is in edit mode
 * @property {() => void} onEdit - Callback to enter edit mode
 * @property {() => void} onClose - Callback to exit edit mode
 * @property {(sectionId: string, hasChanges: boolean) => void} [onUnsavedChanges] - Track unsaved changes
 * @property {(sectionId: string, itemIndex: number, onCancel: () => void, onStartEdit?: () => void) => 'success' | 'dialog_shown'} [registerIndividualItemEditing] - Register individual item editing
 * @property {() => void} [unregisterIndividualItemEditing] - Unregister individual item editing
 * @property {(sectionId: string, onCancel: () => void) => void} [requestIndividualItemCancel] - Request cancel for individual item
 * @property {string} [title] - Section title
 * @property {string} [emptyMessage] - Message shown when array is empty
 * @property {(item: T, index: number, updateItem: (field: keyof T, value: any) => void) => React.ReactNode} [renderEditForm] - Function to render edit form for an item
 * @property {(item: T, index: number) => React.ReactNode} [renderItem] - Function to render display view of an item
 * @property {() => T} [createNewItem] - Function to create a new empty item
 * @property {string} [autoSaveMessage] - Message for auto-save operations
 */
export interface ArraySectionProps<T> {
  data: T[];
  onUpdate: (data: T[]) => void;
  onSave: (data: T[], message?: string) => Promise<void>;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUnsavedChanges?: (sectionId: string, hasChanges: boolean) => void;
  registerIndividualItemEditing?: (
    sectionId: string,
    itemIndex: number,
    onCancel: () => void,
    onStartEdit?: () => void,
  ) => "success" | "dialog_shown";
  unregisterIndividualItemEditing?: () => void;
  requestIndividualItemCancel?: (
    sectionId: string,
    onCancel: () => void,
  ) => void;
  title?: string;
  emptyMessage?: string;
  renderEditForm?: (
    item: T,
    index: number,
    updateItem: (field: keyof T, value: any) => void,
  ) => React.ReactNode;
  renderItem?: (item: T, index: number) => React.ReactNode;
  createNewItem?: () => T;
  autoSaveMessage?: string;
  sectionId?: string;
  onHide?: () => void;
  onDelete?: () => void;
  isCustomSection?: boolean;
  readOnly?: boolean;
}

/**
 * Properties for individual item editing within array sections.
 * Used when editing a single item from a collection (e.g., one work experience entry).
 *
 * @interface IndividualItemSectionProps
 * @template T - The type of the individual item being edited
 * @property {T} data - The current item data
 * @property {(data: T) => void} onUpdate - Callback to update the item
 * @property {(data: T, message?: string) => Promise<void>} onSave - Callback to save the item
 * @property {boolean} isEditing - Whether the item is in edit mode
 * @property {() => void} onEdit - Callback to enter edit mode
 * @property {() => void} onClose - Callback to exit edit mode
 * @property {(hasChanges: boolean) => void} [onUnsavedChanges] - Track unsaved changes for this item
 */
export interface IndividualItemSectionProps<T> {
  data: T;
  onUpdate: (data: T) => void;
  onSave: (data: T, message?: string) => Promise<void>;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * Properties for the main PDF CV Editor component.
 * Manages the overall CV data and provides save/update functionality.
 *
 * @interface PDFCVEditorProps
 * @property {CVData} cvData - The complete CV data object
 * @property {(data: CVData) => void} onUpdateCV - Callback to update the entire CV data
 * @property {(data: CVData, message?: string) => Promise<void>} onSave - Callback to save the CV with optional message
 */
export interface PDFCVEditorProps {
  cvData: CVData;
  cvId?: string;
  onUpdateCV: (data: CVData) => void;
  onSave: (data: CVData, message?: string) => Promise<void>;
}

/**
 * Hook interface for managing unsaved changes state.
 * Provides methods to track and manage unsaved changes across the application.
 *
 * @interface UnsavedChangesHook
 * @property {boolean} hasUnsavedChanges - Whether there are currently unsaved changes
 * @property {(hasChanges: boolean) => void} setUnsavedChanges - Set the unsaved changes state
 * @property {() => void} clearUnsavedChanges - Clear all unsaved changes
 */
export interface UnsavedChangesHook {
  hasUnsavedChanges: boolean;
  setUnsavedChanges: (hasChanges: boolean) => void;
  clearUnsavedChanges: () => void;
}

/**
 * Properties for sortable section items in the section manager sidebar.
 * Supports both individual properties and section object for flexibility.
 *
 * @interface SortableSectionItemProps
 * @property {string} [id] - Section ID (falls back to section.id)
 * @property {string} [type] - Section type (falls back to section.type)
 * @property {string} [title] - Section title (falls back to section.title)
 * @property {boolean} [visible] - Whether section is visible (falls back to section.visible)
 * @property {number} [order] - Section order (falls back to section.order)
 * @property {CVSection} [section] - Complete section object (alternative to individual props)
 * @property {(sectionId: string) => void} [onToggleVisibility] - Callback to toggle section visibility
 * @property {(sectionId: string) => void} [onNavigateToSection] - Callback when row is clicked to scroll CV editor to that section
 * @property {boolean} [isOverlay] - Whether this is a drag overlay item
 */
export interface SortableSectionItemProps {
  id?: string;
  type?: string;
  title?: string;
  visible?: boolean;
  order?: number;
  section?: CVSection;
  onToggleVisibility?: (sectionId: string) => void;
  onNavigateToSection?: (sectionId: string) => void;
  isOverlay?: boolean;
}

/**
 * Interface representing an individual item being edited.
 * Used to track which specific item is currently being edited within a section.
 *
 * @interface EditingIndividualItem
 * @property {string} id - Unique identifier for the item being edited
 * @property {string} section - The section type (e.g., 'work_experience')
 * @property {string} sectionId - The section ID for tracking
 * @property {any} data - The current data of the item being edited
 */
export interface EditingIndividualItem {
  id: string;
  section: string;
  sectionId: string;
  data: any;
}
