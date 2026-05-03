/**
 * Creates an updater that marks a field as edited (for overwrite confirmation) when
 * specific fields change, then delegates to the real update function.
 * Used by section components to avoid duplicating setEdited + updateFn logic.
 */

import { useEditedSinceAIStore } from "../../../../stores/editedSinceAIStore";

/**
 * @param cvId - Current CV id (undefined when not applicable)
 * @param fieldKey - Key used in editedSinceAI store (e.g. "professional_summary", "skills", "work_experience:itemId")
 * @param updateFn - The real update callback from the section
 * @param triggerFields - If provided, only call setEdited when the updated field is in this list (e.g. ["description"], ["content"], ["technical"])
 * @returns Wrapped updater that calls setEdited then updateFn (same signature as updateFn)
 */
export function createTrackedFieldUpdater<F extends string>(
  cvId: string | undefined,
  fieldKey: string,
  updateFn: (field: F, value: any) => void,
  triggerFields?: readonly string[]
): (field: F, value: any) => void {
  return (field: F, value: any) => {
    if (cvId) {
      if (!triggerFields || triggerFields.includes(field)) {
        useEditedSinceAIStore.getState().setEdited(cvId, fieldKey);
      }
    }
    updateFn(field, value);
  };
}
