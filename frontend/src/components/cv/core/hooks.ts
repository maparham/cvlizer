import { useEffect, useRef, type MutableRefObject } from "react";

// Common Section Hook for Auto-save Logic
export const useSectionAutoSave = (
  isEditing: boolean,
  editData: any,
  originalData: any,
  onUpdate: (data: any) => void,
  onSave: (data: any, message?: string) => void,
  message: string,
  sectionId: string,
  onUnsavedChanges?: (sectionId: string, hasChanges: boolean) => void,
  validateData?: (data: any) => boolean,
  immediateSave?: boolean, // New parameter for immediate saving
  skipAutoSaveRef?: MutableRefObject<boolean>, // When true, skip "on close" auto-save (e.g. manual save in progress)
) => {
  const prevEditDataRef = useRef<any>();
  const prevIsEditingRef = useRef<boolean>();
  const prevOriginalDataRef = useRef<any>();
  const isDiscardingRef = useRef<boolean>(false);

  // Listen for the discarding changes flag to prevent auto-save during discard
  useEffect(() => {
    const handleDiscardingChanges = (event: CustomEvent) => {
      isDiscardingRef.current = event.detail?.isDiscarding ?? false;
    };

    window.addEventListener(
      "is-discarding-changes",
      handleDiscardingChanges as EventListener,
    );

    return () => {
      window.removeEventListener(
        "is-discarding-changes",
        handleDiscardingChanges as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    // Handle immediate save mode (for skills section)
    if (
      immediateSave &&
      isEditing &&
      editData &&
      Object.keys(editData).length > 0
    ) {
      // Skip auto-save if we're currently discarding changes
      if (isDiscardingRef.current) {
        return;
      }

      const hasChanges =
        JSON.stringify(editData) !== JSON.stringify(originalData);
      if (hasChanges) {
        // Validate data before auto-saving
        const isValid = validateData ? validateData(editData) : true;
        if (isValid) {
          onUpdate(editData);
          onSave(editData, message);
        }
      }
      return;
    }

    // Only auto-save when transitioning from editing to not editing
    // Don't auto-save when data changes due to CV switching
    // Don't auto-save when changes are being discarded
    // Don't auto-save when manual save is in progress (avoids double notification)
    if (
      !isEditing &&
      editData &&
      Object.keys(editData).length > 0 &&
      prevIsEditingRef.current === true
    ) {
      // Skip auto-save if we're currently discarding changes
      if (isDiscardingRef.current) {
        return;
      }
      if (skipAutoSaveRef?.current) {
        skipAutoSaveRef.current = false;
        return;
      }

      const hasChanges =
        JSON.stringify(editData) !== JSON.stringify(originalData);
      if (hasChanges) {
        // Validate data before auto-saving
        const isValid = validateData ? validateData(editData) : true;
        if (isValid) {
          onUpdate(editData);
          onSave(editData, message);
        }
      }
    }
  }, [
    isEditing,
    editData,
    originalData,
    onUpdate,
    onSave,
    message,
    validateData,
    immediateSave,
  ]);

  // Track unsaved changes - only call when values actually change
  useEffect(() => {
    // Only proceed if we have meaningful data and the callback exists
    if (!onUnsavedChanges) return;

    const editDataChanged =
      JSON.stringify(editData) !== JSON.stringify(prevEditDataRef.current);
    const isEditingChanged = isEditing !== prevIsEditingRef.current;
    const originalDataChanged =
      JSON.stringify(originalData) !==
      JSON.stringify(prevOriginalDataRef.current);

    // Only call onUnsavedChanges if something actually changed
    if (editDataChanged || isEditingChanged || originalDataChanged) {
      if (isEditing && editData && Object.keys(editData).length > 0) {
        const hasChanges =
          JSON.stringify(editData) !== JSON.stringify(originalData);
        onUnsavedChanges(sectionId, hasChanges);
      } else {
        onUnsavedChanges(sectionId, false);
      }
    }

    // Update refs
    prevEditDataRef.current = editData;
    prevIsEditingRef.current = isEditing;
    prevOriginalDataRef.current = originalData;
  }, [isEditing, editData, originalData, sectionId, onUnsavedChanges]);
};

// Common Section Hook for Array Items Auto-save Logic
export const useArraySectionAutoSave = (
  isEditing: boolean,
  editingIndex: number | null,
  editData: any,
  originalData: any[],
  onUpdate: (data: any[]) => void,
  onSave: (data: any[], message?: string) => void,
  message: string,
  onUnsavedChanges?: (hasChanges: boolean) => void,
) => {
  const prevEditDataRef = useRef<any>();
  const prevIsEditingRef = useRef<boolean>();
  const prevEditingIndexRef = useRef<number | null>();
  const prevOriginalDataRef = useRef<any[]>();

  useEffect(() => {
    // Only auto-save when transitioning from editing to not editing
    // Don't auto-save when data changes due to CV switching
    if (
      !isEditing &&
      editingIndex !== null &&
      editData &&
      Object.keys(editData).length > 0 &&
      prevIsEditingRef.current === true
    ) {
      // Check if we're editing an existing item (not adding a new one)
      if (editingIndex < (originalData || []).length) {
        const originalItem = originalData[editingIndex];
        const hasChanges =
          JSON.stringify(editData) !== JSON.stringify(originalItem);
        if (hasChanges) {
          const newData = [...(originalData || [])];
          newData[editingIndex] = editData;
          onUpdate(newData);
          onSave(newData, message);
        }
      }
      // If editingIndex >= originalData.length, we're adding a new item - don't auto-save
    }
  }, [
    isEditing,
    editingIndex,
    editData,
    originalData,
    onUpdate,
    onSave,
    message,
  ]);

  // Track unsaved changes - only call when values actually change
  useEffect(() => {
    // Only proceed if we have meaningful data and the callback exists
    if (!onUnsavedChanges) return;

    const editDataChanged =
      JSON.stringify(editData) !== JSON.stringify(prevEditDataRef.current);
    const isEditingChanged = isEditing !== prevIsEditingRef.current;
    const editingIndexChanged = editingIndex !== prevEditingIndexRef.current;
    const originalDataChanged =
      JSON.stringify(originalData) !==
      JSON.stringify(prevOriginalDataRef.current);

    // Only call onUnsavedChanges if something actually changed
    if (
      editDataChanged ||
      isEditingChanged ||
      editingIndexChanged ||
      originalDataChanged
    ) {
      if (
        isEditing &&
        editingIndex !== null &&
        editData &&
        Object.keys(editData).length > 0
      ) {
        // Check if we're editing an existing item (not adding a new one)
        if (editingIndex < (originalData || []).length) {
          const originalItem = originalData[editingIndex];
          const hasChanges =
            JSON.stringify(editData) !== JSON.stringify(originalItem);
          onUnsavedChanges(hasChanges);
        } else {
          // Adding a new item - always has changes
          onUnsavedChanges(true);
        }
      } else {
        onUnsavedChanges(false);
      }
    }

    // Update refs
    prevEditDataRef.current = editData;
    prevIsEditingRef.current = isEditing;
    prevEditingIndexRef.current = editingIndex;
    prevOriginalDataRef.current = originalData;
  }, [isEditing, editingIndex, editData, originalData, onUnsavedChanges]);
};
