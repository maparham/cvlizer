/**
 * ValidatedDateField Component
 *
 * This module provides a validation-aware wrapper around DateFieldComponent that
 * automatically integrates with the CV editor's validation system. It eliminates
 * code duplication by handling validation hook integration internally.
 *
 * Key responsibilities:
 * - Wraps DateFieldComponent with automatic validation state management
 * - Integrates with useFieldValidation hook internally
 * - Automatically passes error and helperText props to DateFieldComponent
 * - Eliminates need for manual validation hook wiring in form components
 * - Supports date-specific validation (minDate, maxDate from config)
 *
 * Usage context:
 * - Used in CV section form components for date fields (start_date, end_date, etc.)
 * - Replaces manual DateFieldComponent + useFieldValidation patterns
 * - Provides consistent validation behavior across all CV sections
 *
 * Usage example:
 * ```tsx
 * <ValidatedDateField
 *   section="awards"
 *   field="date"
 *   index={0}
 *   config={{
 *     name: 'date',
 *     label: 'Date Received',
 *     required: true,
 *     minDate: '2020-01-01'
 *   }}
 *   value={award.date}
 *   onChange={(value) => updateAward('date', value)}
 *   onSave={onSave}
 * />
 * ```
 *
 * Performance considerations:
 * - Validation hook is called internally, so this component should only be used in form contexts
 * - For display components, use ValidatedDisplay instead (no hooks)
 *
 * @module ValidatedDateField
 */
import React from 'react';
import { Box } from '@mui/material';
import { DateFieldComponent, DateFieldConfig } from '../formUtils';
import { useFieldValidation } from '../../../../hooks/useFieldValidation';
import { FieldCorrection } from '../../../../types/ai';
import { InlineFieldCorrection } from '../../../cv/ai/InlineFieldCorrection';

export interface ValidatedDateFieldProps {
  section: string;
  field: string;
  index: number;
  config: DateFieldConfig;
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

export const ValidatedDateField: React.FC<ValidatedDateFieldProps> = ({
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
      <DateFieldComponent
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
