/**
 * useItemValidation Hook
 *
 * This module provides a custom React hook that batches validation queries for
 * all fields of a CV section item. It reduces hook calls and improves performance
 * by querying validation state for multiple fields in a single operation.
 *
 * Key responsibilities:
 * - Batch validation queries for multiple fields of a CV section item
 * - Reduce hook call overhead from N calls to 1 call per item
 * - Memoize validation state to prevent unnecessary recalculations
 * - Return structured validation state object for easy prop passing
 *
 * Performance benefits:
 * - Reduces validation hook calls: from N fields × M items to M items
 * - Memoized results prevent recalculation when dependencies don't change
 * - Enables efficient prop passing to pure display components
 *
 * Usage context:
 * - Used in display component wrappers to get validation for all fields at once
 * - Validation state is then passed as props to pure display components
 * - Enables ValidatedDisplay components to remain hook-free (better performance)
 *
 * Usage example:
 * ```tsx
 * // In display wrapper component:
 * const AwardDisplayWrapper = ({ award, index }) => {
 *   // Get all validation states in one hook call
 *   const validation = useItemValidation('awards', index, ['name', 'issuer', 'date']);
 *
 *   // Pass to pure display component
 *   return (
 *     <AwardDisplay
 *       award={award}
 *       index={index}
 *       validation={validation}  // { name: {...}, issuer: {...}, date: {...} }
 *     />
 *   );
 * };
 *
 * // Pure display component (no hooks):
 * const AwardDisplay = ({ award, validation }) => (
 *   <>
 *     <ValidatedDisplay validation={validation.name}>
 *       {award.name}
 *     </ValidatedDisplay>
 *     <ValidatedDisplay validation={validation.issuer}>
 *       {award.issuer}
 *     </ValidatedDisplay>
 *   </>
 * );
 * ```
 *
 * Design rationale:
 * - Batching reduces hook overhead from O(fields) to O(1) per item
 * - Enables separation: hook usage in wrapper, pure components for display
 * - Memoization ensures validation state only recalculates when needed
 *
 * @module useItemValidation
 */
import { useMemo } from 'react';
import { useCVEditor } from '../../../../contexts/CVEditorContext';
import { hasFieldError, getFieldError } from '../../../../utils/validation/helpers';

export interface ItemValidationState {
  [fieldName: string]: {
    hasError: boolean;
    errorMessage?: string;
  };
}

export const useItemValidation = (
  section: string,
  itemIndex: number,
  fields: string[]
): ItemValidationState => {
  const { validationErrors } = useCVEditor();

  // Create stable string representation of fields array for dependency comparison
  // This prevents recalculation when callers pass new array literals with same values
  const fieldsKey = fields.join(',');

  return useMemo(() => {
    const validation: ItemValidationState = {};

    fields.forEach(field => {
      const hasError = hasFieldError(validationErrors, section, itemIndex, field);
      const errorMessage = getFieldError(validationErrors, section, itemIndex, field);

      validation[field] = {
        hasError,
        errorMessage,
      };
    });

    return validation;
  }, [validationErrors, section, itemIndex, fieldsKey]);
};
