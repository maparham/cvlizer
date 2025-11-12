/**
 * IndividualItemSection Component
 *
 * A comprehensive, reusable section component for managing collections of items where each item
 * can be independently edited, reordered, and managed. This component is designed for CV sections
 * like Work Experience, Education, Projects, etc.
 *
 * Key Features:
 * - Individual item editing: Each item has its own edit/save/cancel controls
 * - Drag & drop reordering: Items can be reordered via drag handles or arrow buttons
 * - Sorting capabilities: Items can be sorted by date fields (newest/oldest first)
 * - Auto-save functionality: Changes are automatically saved with customizable messages
 * - Validation: Required field validation before saving
 * - Global editing state management: Prevents multiple items from being edited simultaneously
 * - Unsaved changes tracking: Warns users about unsaved changes when navigating away
 * - Responsive UI: Hover effects, tooltips, and smooth transitions
 *
 * The component uses a generic type T to work with any data structure, making it highly reusable
 * across different types of CV sections. It integrates with the global CV editing state to provide
 * a consistent user experience across the entire application.
 *
 * @template T - The type of items this section manages
 */
import { useCallback, useMemo, useState } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Add as AddIcon, Cancel as CancelIcon } from "@mui/icons-material";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import BaseSection from "./BaseSection";
import {
  ErrorBoundary,
  CompactErrorFallback,
  ConfirmDialog,
} from "../../common";
import {
  type IndividualItemSectionProps,
  getSectionId,
  getSingularTitle,
  validateItem,
  sortItemsByDate,
  reorderItems,
  moveItemUp,
  moveItemDown,
  useItemEditing,
  useSorting,
  useItemsData,
  useReordering,
  SortMenu,
  ReorderControls,
  EditForm,
  ItemControls,
} from "./editable-collection";

/**
 * Section component where each item can be edited independently
 * Each item has its own edit button and form state
 */
function IndividualItemSection<T>({
  sectionType,
  data,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onClose,
  onUnsavedChanges,
  title,
  emptyMessage,
  createNewItem,
  requiredFields,
  fieldConstraints,
  renderItemForm,
  renderItemDisplay,
  autoSaveMessage,
  registerIndividualItemEditing,
  unregisterIndividualItemEditing,
  requestIndividualItemCancel,
  isAnotherItemBeingEdited = false,
  sortOptions = [],
  onTitleSave,
  cvId: _cvId,
  additionalHeaderActions,
}: IndividualItemSectionProps<T>) {
  // Custom hooks for state management
  const {
    editingItemIndex,
    setEditingItemIndex,
    editData,
    setEditData,
    editingItemIndexRef,
    handleCancelEdit,
    handleUpdateItem,
  } = useItemEditing<T>(
    title,
    onUnsavedChanges,
    unregisterIndividualItemEditing,
    onClose,
  );

  const { isReordering, handleDragStart, handleDragEnd, handleManualReorder } =
    useReordering();

  const { sortField, sortDirection, handleSort, clearSort } = useSorting<T>(
    title,
    data,
    isReordering,
  );

  const { itemsData, setItemsData } = useItemsData<T>(
    data,
    sortField,
    sortDirection,
    isReordering,
  );

  // State for delete confirmation dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });

  // Use sectionType prop directly instead of calculating from title
  // This ensures data-section attribute matches validation errors even when title is customized
  const sectionId = sectionType || useMemo(() => getSectionId(title), [title]);

  // Event handlers
  const handleEditItem = useCallback(
    (index: number) => {
      // Register with global editing state for escape key handling first
      if (registerIndividualItemEditing) {
        // Create a callback to start editing this specific item
        // This is called when user clicks "Discard Changes" in the dialog
        const onStartEdit = () => {
          setEditingItemIndex(index);
          editingItemIndexRef.current = index;
          setEditData(data[index]);
          // NOTE: Don't call onEdit() here because registerIndividualItemEditing
          // already dispatches START_ITEM_EDIT. Calling onEdit() would dispatch
          // START_SECTION_EDIT and overwrite the editing_item state
        };

        // Try to register - this might show a dialog if there are unsaved changes
        const registrationResult = registerIndividualItemEditing(
          sectionId,
          index,
          handleCancelEdit,
          onStartEdit,
        );

        // Only set local state if registration was successful (no dialog shown)
        // If a dialog is shown, onStartEdit will be called when user clicks "Discard Changes"
        if (registrationResult !== "dialog_shown") {
          const itemToEdit = { ...itemsData[index] };

          setEditingItemIndex(index);
          editingItemIndexRef.current = index;
          setEditData(itemToEdit);
          // NOTE: Don't call onEdit() here because registerIndividualItemEditing
          // already dispatches START_ITEM_EDIT. Calling onEdit() would dispatch
          // START_SECTION_EDIT and overwrite the editing_item state
        }
      } else {
        // Fallback if registerIndividualItemEditing is not available
        setEditingItemIndex(index);
        editingItemIndexRef.current = index;
        setEditData({ ...itemsData[index] });
        onEdit();
      }
    },
    [
      registerIndividualItemEditing,
      handleCancelEdit,
      setEditingItemIndex,
      editingItemIndexRef,
      setEditData,
      itemsData,
      onEdit,
      data,
      sectionId,
    ],
  );

  const handleSaveItem = useCallback(() => {
    if (editingItemIndex !== null && editData) {
      let newData = [...itemsData];

      // Check if we're adding a new item (editingItemIndex >= current array length)
      if (editingItemIndex >= itemsData.length) {
        // Adding a new item
        newData.push(editData); // Add to end first

        // If there's an active sort, re-sort the data to place the new item correctly
        if (sortField) {
          newData = sortItemsByDate(newData, sortField, sortDirection);
        }
      } else {
        // Editing an existing item - update at the index

        newData[editingItemIndex] = editData;

        // If there's an active sort, re-sort the data in case the edited field affects sort order
        if (sortField) {
          newData = sortItemsByDate(newData, sortField, sortDirection);
        }
      }

      setItemsData(newData);
      onUpdate(newData);
      onSave(
        newData,
        editingItemIndex >= itemsData.length
          ? `${autoSaveMessage} added`
          : `${autoSaveMessage} updated`,
      );
    }
    handleCancelEdit(true); // Pass true to indicate this is a save operation
  }, [
    editingItemIndex,
    editData,
    itemsData,
    sortField,
    sortDirection,
    setItemsData,
    onUpdate,
    onSave,
    autoSaveMessage,
    handleCancelEdit,
  ]);

  const handleDeleteItemClick = useCallback((index: number) => {
    setDeleteConfirmation({ open: true, index });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmation.index !== null) {
      const newData = itemsData.filter(
        (_, i) => i !== deleteConfirmation.index,
      );
      setItemsData(newData);
      onUpdate(newData);
      onSave(newData, `${autoSaveMessage} deleted`);
    }
    setDeleteConfirmation({ open: false, index: null });
  }, [
    deleteConfirmation.index,
    itemsData,
    setItemsData,
    onUpdate,
    onSave,
    autoSaveMessage,
  ]);

  const handleAddItem = useCallback(() => {
    const newItem = createNewItem();
    const newIndex = itemsData.length; // This will be >= itemsData.length, indicating a new item
    // Don't add to itemsData yet - only add when saved
    setEditingItemIndex(newIndex);
    setEditData(newItem);
    // NOTE: Don't call onEdit() here because registerIndividualItemEditing
    // dispatches START_ITEM_EDIT. Calling onEdit() would dispatch START_SECTION_EDIT
    // and overwrite the editing_item state

    // Register with global editing state for escape key handling
    if (registerIndividualItemEditing) {
      // Create a callback to start editing this specific item
      const onStartEdit = () => {
        setEditingItemIndex(newIndex);
        editingItemIndexRef.current = newIndex;
        setEditData(newItem);
        // NOTE: Don't call onEdit() here for the same reason as above
      };

      registerIndividualItemEditing(
        sectionId,
        newIndex,
        handleCancelEdit,
        onStartEdit,
      );
    }
  }, [
    createNewItem,
    itemsData.length,
    setEditingItemIndex,
    setEditData,
    registerIndividualItemEditing,
    sectionId,
    handleCancelEdit,
    editingItemIndexRef,
  ]);

  // Drag and drop handlers
  const handleDragEndComplete = useCallback(
    (result: DropResult) => {
      if (!result.destination) {
        handleDragEnd();
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        handleDragEnd();
        return;
      }

      // Clear any active sorting to switch to manual mode
      if (sortField) {
        clearSort();
      }

      // Immediately update the data without transitions
      const newData = reorderItems(itemsData, sourceIndex, destinationIndex);

      setItemsData(newData);
      onUpdate(newData);
      onSave(newData, `${autoSaveMessage} reordered`);

      handleDragEnd();
    },
    [
      sortField,
      clearSort,
      itemsData,
      setItemsData,
      onUpdate,
      onSave,
      autoSaveMessage,
      handleDragEnd,
    ],
  );

  // Manual reordering handlers
  const handleMoveUpItem = useCallback(
    (index: number) => {
      if (index === 0) return; // Already at top

      // Clear any active sorting to switch to manual mode
      if (sortField) {
        clearSort();
      }

      handleManualReorder();

      const newData = moveItemUp(itemsData, index);
      setItemsData(newData);
      onUpdate(newData);
      onSave(newData, `${autoSaveMessage} moved up`);
    },
    [
      sortField,
      clearSort,
      handleManualReorder,
      itemsData,
      setItemsData,
      onUpdate,
      onSave,
      autoSaveMessage,
    ],
  );

  const handleMoveDownItem = useCallback(
    (index: number) => {
      if (index === itemsData.length - 1) return; // Already at bottom

      // Clear any active sorting to switch to manual mode
      if (sortField) {
        clearSort();
      }

      handleManualReorder();

      const newData = moveItemDown(itemsData, index);
      setItemsData(newData);
      onUpdate(newData);
      onSave(newData, `${autoSaveMessage} moved down`);
    },
    [
      sortField,
      clearSort,
      handleManualReorder,
      itemsData,
      setItemsData,
      onUpdate,
      onSave,
      autoSaveMessage,
    ],
  );

  // Sort handlers
  const handleSortItems = useCallback(
    (field: keyof T, direction: "asc" | "desc") => {
      const sortedData = sortItemsByDate(itemsData, field, direction);
      setItemsData(sortedData);
      onUpdate(sortedData);
      onSave(sortedData, `${autoSaveMessage} sorted by ${String(field)}`);
      handleSort(field, direction);
    },
    [itemsData, setItemsData, onUpdate, onSave, autoSaveMessage, handleSort],
  );

  const handleClearSort = useCallback(() => {
    clearSort();
    setItemsData([...(data as T[])]);
    onUpdate(data as T[]);
  }, [clearSort, setItemsData, data, onUpdate]);

  // Form validation - memoized to avoid unnecessary re-computations
  const isEditFormValid = useMemo((): boolean => {
    return validateItem(editData, requiredFields, title, fieldConstraints);
  }, [editData, requiredFields, title, fieldConstraints]);

  // Cancel handler with dialog support
  const handleCancelWithDialog = useCallback(() => {
    if (typeof requestIndividualItemCancel === "function") {
      requestIndividualItemCancel(sectionId, handleCancelEdit);
    } else {
      handleCancelEdit();
    }
  }, [sectionId, requestIndividualItemCancel, handleCancelEdit]);

  return (
    <ErrorBoundary fallback={CompactErrorFallback}>
      <BaseSection
        title={title}
        isEditing={isEditing}
        onEdit={onEdit}
        onClose={onClose}
        onSave={undefined}
        onCancel={undefined}
        isValid={true}
        onTitleSave={onTitleSave}
        sectionId={sectionId}
        headerActionsLeft={additionalHeaderActions}
        headerActions={
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            {/* Right-side actions: Sort and Add */}
            {/* Sort controls */}
            <SortMenu
              sortOptions={sortOptions}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSortItems}
              onClearSort={handleClearSort}
              itemsCount={itemsData.length}
              editingItemIndex={editingItemIndex}
            />

            {/* Add button - always show when not editing an item */}
            {editingItemIndex === null && (
              <Tooltip
                title={
                  isAnotherItemBeingEdited
                    ? "Finish editing the current item first"
                    : `Add new ${getSingularTitle(title).toLowerCase()}`
                }
              >
                <span>
                  <IconButton
                    onClick={handleAddItem}
                    disabled={isAnotherItemBeingEdited}
                    data-testid={`add-new-${title.toLowerCase().replace(/ /g, "-")}-button`}
                    sx={{
                      opacity: isAnotherItemBeingEdited ? 0.5 : 1,
                      transition: "opacity 0.2s",
                      bgcolor: "white",
                      boxShadow: 1,
                    }}
                    size="small"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        }
        editButton={
          editingItemIndex !== null ? (
            <Tooltip title="Cancel editing">
              <span style={{ position: "absolute", top: 0, right: 0 }}>
                <IconButton
                  onClick={handleCancelWithDialog}
                  sx={{
                    opacity: 1,
                    transition: "opacity 0.2s",
                    bgcolor: "white",
                    boxShadow: 1,
                  }}
                  size="small"
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            // Return empty span to prevent BaseSection from showing default edit button
            <span style={{ display: "none" }} />
          )
        }
      >
        {itemsData.length === 0 && editingItemIndex === null ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography
              variant="body2"
              sx={{ color: "#999", fontStyle: "italic" }}
            >
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Handle new item form - when editingItemIndex >= itemsData.length - Show at TOP */}
            {editingItemIndex !== null &&
              editingItemIndex >= itemsData.length &&
              editData && (
                <EditForm
                  editData={editData}
                  editingItemIndex={editingItemIndex}
                  title={title}
                  isFormValid={isEditFormValid}
                  onSave={handleSaveItem}
                  onCancel={handleCancelWithDialog}
                  renderItemForm={renderItemForm}
                  updateItem={(field, value) =>
                    handleUpdateItem(field as keyof T, value, itemsData)
                  }
                />
              )}

            {/* Drag and Drop Context for reordering existing items */}
            <DragDropContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEndComplete}
            >
              <Droppable droppableId="items">
                {(provided) => (
                  <Box {...provided.droppableProps} ref={provided.innerRef}>
                    {itemsData.map((item, index) => (
                      <Draggable
                        key={`item-${index}`}
                        draggableId={`item-${index}`}
                        index={index}
                        isDragDisabled={editingItemIndex !== null}
                      >
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="individual-item-container"
                            sx={{
                              position: "relative",
                              mb: 0.25,
                              p: 1,
                              border: "1px solid",
                              borderColor: snapshot.isDragging
                                ? "#1976d2"
                                : "transparent",
                              borderRadius: 1,
                              boxSizing: "border-box",
                              // Force GPU acceleration to prevent sub-pixel rendering issues
                              backfaceVisibility: "hidden",
                              WebkitBackfaceVisibility: "hidden",
                              WebkitFontSmoothing: "subpixel-antialiased",
                              transition: isReordering
                                ? "none"
                                : "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
                              transform: snapshot.isDragging
                                ? "scale(1.02) rotate(1deg) translateZ(0)"
                                : "translateZ(0)",
                              backgroundColor: snapshot.isDragging
                                ? "#f5f5f5"
                                : "transparent",
                              boxShadow: snapshot.isDragging
                                ? "0 8px 16px rgba(0,0,0,0.15)"
                                : "0 1px 3px rgba(0,0,0,0.05)",
                              zIndex: snapshot.isDragging ? 1000 : "auto",
                              "&:hover": {
                                willChange: "transform, border-color, box-shadow",
                                borderColor:
                                  editingItemIndex === null
                                    ? "#e0e0e0"
                                    : "transparent",
                                transform:
                                  editingItemIndex === null &&
                                  !snapshot.isDragging
                                    ? "translateY(-1px) translateZ(0)"
                                    : "translateZ(0)",
                                boxShadow:
                                  editingItemIndex === null &&
                                  !snapshot.isDragging
                                    ? "0 4px 8px rgba(0,0,0,0.1)"
                                    : undefined,
                                "& .reorder-control": {
                                  opacity: 1,
                                  visibility: "visible",
                                },
                                "& .item-action-button": { opacity: 1 },
                              },
                              "& .reorder-control": {
                                opacity: 0,
                                visibility: "hidden",
                                transition:
                                  "opacity 0.2s ease, visibility 0.2s ease",
                              },
                            }}
                          >
                            {editingItemIndex === index && editData ? (
                              // Show edit form for this item
                              <Box>
                                <EditForm
                                  editData={editData}
                                  editingItemIndex={index}
                                  title={title}
                                  isFormValid={isEditFormValid}
                                  onSave={handleSaveItem}
                                  onCancel={handleCancelWithDialog}
                                  renderItemForm={renderItemForm}
                                  updateItem={(field, value) =>
                                    handleUpdateItem(
                                      field as keyof T,
                                      value,
                                      itemsData,
                                    )
                                  }
                                />
                              </Box>
                            ) : (
                              // Show display view for this item
                              <Box>
                                {/* Reordering controls - vertically aligned on left edge */}
                                <ReorderControls
                                  index={index}
                                  itemsLength={itemsData.length}
                                  onMoveUp={handleMoveUpItem}
                                  onMoveDown={handleMoveDownItem}
                                  dragHandleProps={provided.dragHandleProps}
                                />

                                <ItemControls
                                  item={item}
                                  index={index}
                                  title={title}
                                  editingItemIndex={editingItemIndex}
                                  isAnotherItemBeingEdited={
                                    isAnotherItemBeingEdited
                                  }
                                  onEdit={handleEditItem}
                                  onDelete={handleDeleteItemClick}
                                  renderItemDisplay={renderItemDisplay}
                                />
                              </Box>
                            )}
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
        )}
      </BaseSection>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, index: null })}
        onConfirm={handleConfirmDelete}
        title={`Delete ${getSingularTitle(title)}?`}
        message={`Are you sure you want to delete this ${getSingularTitle(title).toLowerCase()}?`}
        confirmButtonText="Delete"
        confirmButtonColor="error"
        severity="error"
      />
    </ErrorBoundary>
  );
}

export default IndividualItemSection;
