/**
 * ValidatedFormField Component
 *
 * This module provides a validation-aware wrapper around FormField that automatically
 * integrates with the CV editor's validation system. It eliminates code duplication
 * by handling validation hook integration internally.
 *
 * Key responsibilities:
 * - Wraps FormField component with automatic validation state management
 * - Integrates with useFieldValidation hook internally
 * - Automatically passes error and helperText props to FormField
 * - Eliminates need for manual validation hook wiring in form components
 *
 * Usage context:
 * - Used in CV section form components (AwardsForm, EducationForm, etc.)
 * - Replaces manual FormField + useFieldValidation patterns
 * - Provides consistent validation behavior across all CV sections
 *
 * Usage example:
 * ```tsx
 * <ValidatedFormField
 *   section="awards"
 *   field="name"
 *   index={0}
 *   config={{ name: 'name', label: 'Award Name', required: true }}
 *   value={award.name}
 *   onChange={(value) => updateAward('name', value)}
 *   onSave={onSave}
 * />
 * ```
 *
 * Performance considerations:
 * - Validation hook is called internally, so this component should only be used in form contexts
 * - For display components, use ValidatedDisplay instead (no hooks)
 *
 * @module ValidatedFormField
 */
import React from 'react';
import { Box } from '@mui/material';
import { FormField, FormFieldConfig } from '../formUtils';
import { useFieldValidation } from '../../../../hooks/useFieldValidation';
import { FieldCorrection } from '../../../../types/ai';
import { InlineFieldCorrection } from '../../../cv/ai/InlineFieldCorrection';

export interface ValidatedFormFieldProps {
  section: string;
  field: string;
  index: number;
  config: FormFieldConfig;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  sx?: any;
  // Writing correction props
  fieldCorrection?: FieldCorrection | null;
  correctionImportance?: 'highly_recommended' | 'standard';
  correctionReasoning?: string;
  onApplyCorrection?: (correction: FieldCorrection) => void;
  onDismissCorrection?: () => void;
}

export const ValidatedFormField: React.FC<ValidatedFormFieldProps> = ({
  section,
  field,
  index,
  config,
  value,
  onChange,
  onSave,
  sx,
  fieldCorrection,
  correctionImportance,
  correctionReasoning,
  onApplyCorrection,
  onDismissCorrection,
}) => {
  const validation = useFieldValidation(section, index, field);

  return (
    <Box>
      <FormField
        config={config}
        value={value}
        onChange={onChange}
        onSave={onSave}
        sx={sx}
        error={validation.hasError}
        helperText={validation.errorMessage}
      />
      {fieldCorrection && correctionImportance && (
        <InlineFieldCorrection
          fieldCorrection={fieldCorrection}
          importance={correctionImportance}
          reasoning={correctionReasoning}
          onApply={() => onApplyCorrection?.(fieldCorrection)}
          onDismiss={onDismissCorrection || (() => {})}
        />
      )}
    </Box>
  );
};
