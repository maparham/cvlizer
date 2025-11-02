/**
 * Validated Field Components Module
 *
 * This module provides a comprehensive set of validation-aware components and
 * utilities for CV sections. It eliminates code duplication and improves performance
 * by centralizing validation logic and moving hooks out of display components.
 *
 * Module overview:
 * - ValidatedFormField: Validation-aware wrapper for form text inputs
 * - ValidatedDateField: Validation-aware wrapper for date inputs
 * - ValidatedDisplay: Pure display component for showing validation errors (no hooks)
 * - useItemValidation: Hook for batch validation queries (optimizes hook calls)
 *
 * Key benefits:
 * - Eliminates ~90% of validation code duplication across CV sections
 * - Single source of truth for validation integration patterns
 * - Performance: validation hooks removed from display components
 * - Consistent UX: identical validation display behavior across all sections
 * - Easier maintenance: validation changes made in one place
 *
 * Architecture pattern:
 * - Form components: Use ValidatedFormField/ValidatedDateField (hooks internal)
 * - Display components: Use ValidatedDisplay with validation from useItemValidation
 * - Wrapper pattern: Display wrappers use useItemValidation, pass props to pure components
 *
 * Usage pattern for CV sections:
 * ```tsx
 * // Form component (uses validated components directly):
 * const AwardForm = ({ award, index, updateAward, onSave }) => (
 *   <ValidatedFormField
 *     section="awards"
 *     field="name"
 *     index={index}
 *     config={{ name: 'name', label: 'Award Name', required: true }}
 *     value={award.name}
 *     onChange={(value) => updateAward('name', value)}
 *     onSave={onSave}
 *   />
 * );
 *
 * // Display wrapper (uses hook, passes to pure component):
 * const renderAwardDisplay = (award, index) => {
 *   const Wrapper = ({ award, index }) => {
 *     const validation = useItemValidation('awards', index, ['name', 'issuer', 'date']);
 *     return <AwardDisplay award={award} validation={validation} />;
 *   };
 *   return <Wrapper award={award} index={index} />;
 * };
 *
 * // Pure display component (no hooks):
 * const AwardDisplay = ({ award, validation }) => (
 *   <ValidatedDisplay validation={validation.name}>
 *     {award.name}
 *   </ValidatedDisplay>
 * );
 * ```
 *
 * Migration notes:
 * - Replaces manual useFieldValidation hook patterns in forms
 * - Replaces ValidatedFieldDisplay component (removed from formUtils)
 * - All 6 CV sections (Awards, Certifications, Education, Projects, Volunteer, Work Experience) refactored
 *
 * @module validatedFields
 */
export { ValidatedFormField } from './ValidatedFormField';
export type { ValidatedFormFieldProps } from './ValidatedFormField';
export { ValidatedDateField } from './ValidatedDateField';
export type { ValidatedDateFieldProps } from './ValidatedDateField';
export { ValidatedDisplay } from './ValidatedDisplay';
export type { ValidatedDisplayProps } from './ValidatedDisplay';
export { useItemValidation } from './useItemValidation';
export type { ItemValidationState } from './useItemValidation';
