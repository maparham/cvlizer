/**
 * Editable Collection Submodules
 *
 * Exports all components, hooks, utilities, and types for managing editable collections
 * where each item can be independently edited, reordered, and managed.
 */

// Types
export type {
  SortOption,
  IndividualItemSectionProps,
  ItemControlsProps,
  SortMenuProps,
  ReorderControlsProps,
  EditFormProps,
} from "./types";

// Utilities
export {
  getSectionId,
  getSingularTitle,
  parseDate,
  validateItem,
  sortItemsByDate,
  hasUnsavedChanges,
  reorderItems,
  moveItemUp,
  moveItemDown,
} from "./utils";

// Hooks
export {
  useItemEditing,
  useSorting,
  useItemsData,
  useReordering,
} from "./hooks";

// Components
export { default as SortMenu } from "./SortMenu";
export { default as ReorderControls } from "./ReorderControls";
export { default as EditForm } from "./EditForm";
export { default as ItemControls } from "./ItemControls";
