/**
 * Field Corrections Hook
 *
 * Consolidates the repetitive pattern of extracting field corrections, metadata,
 * and wiring up handlers across WorkExperience and Education sections.
 *
 * Eliminates ~100 lines of duplicated code by providing a single interface for:
 * - Extracting field-specific corrections
 * - Getting correction metadata (importance, reasoning)
 * - Wiring up apply/dismiss handlers
 * - Handling description corrections
 */

import { useMemo } from 'react';
import { WritingCorrection, FieldCorrection } from '../../../../types/ai';
import { getFieldCorrection } from '../../../../utils/writingCorrections';
import { useWritingCorrectionHelpers, WritingCorrectionHelpers } from './useWritingCorrectionHelpers';

export interface FieldConfig {
  fieldName: string;
}

export interface FieldCorrectionProps {
  fieldCorrection: FieldCorrection | null;
  correctionImportance?: 'highly_recommended' | 'standard';
  correctionReasoning?: string;
  onApplyCorrection: (correction: FieldCorrection) => void;
  onDismissCorrection: () => void;
}

export interface UseFieldCorrectionsResult {
  fieldCorrectionProps: Record<string, FieldCorrectionProps>;
  descriptionCorrection: { markdown_diff: string; correction: WritingCorrection } | null;
  helpers: WritingCorrectionHelpers;
}

/**
 * Hook for managing field corrections across multiple fields.
 *
 * @example
 * const { fieldCorrectionProps, descriptionCorrection } = useFieldCorrections(
 *   item.id,
 *   writingCorrections,
 *   [{ fieldName: 'company' }, { fieldName: 'position' }],
 *   handleApplyFieldCorrection,
 *   handleDismissCorrection
 * );
 *
 * <ValidatedFormField {...fieldCorrectionProps.company} />
 */
export function useFieldCorrections(
  itemId: string,
  writingCorrections: WritingCorrection[],
  fieldConfigs: FieldConfig[],
  onApplyFieldCorrection: (fieldCorrection: FieldCorrection, parentCorrection: WritingCorrection) => void,
  onDismissWritingCorrection: (correction: WritingCorrection) => void
): UseFieldCorrectionsResult {
  const helpers = useWritingCorrectionHelpers(
    writingCorrections,
    onDismissWritingCorrection
  );

  const fieldCorrectionProps = useMemo(() => {
    const props: Record<string, FieldCorrectionProps> = {};

    for (const config of fieldConfigs) {
      const fieldCorrection = getFieldCorrection(writingCorrections, itemId, config.fieldName);
      const metadata = helpers.getCorrectionMetadata(fieldCorrection);

      props[config.fieldName] = {
        fieldCorrection: fieldCorrection ?? null,
        correctionImportance: metadata.importance,
        correctionReasoning: metadata.reasoning,
        onApplyCorrection: (fc: FieldCorrection) => {
          // Find parent WritingCorrection and pass both to handler
          const parent = helpers.findWritingCorrectionForField(fc.field_name, fc.original_value);
          if (parent) {
            onApplyFieldCorrection(fc, parent);
          }
        },
        onDismissCorrection: () => {
          if (fieldCorrection) {
            // Find parent WritingCorrection for dismissal
            const parent = helpers.findWritingCorrectionForField(
              fieldCorrection.field_name,
              fieldCorrection.original_value
            );
            if (parent) {
              onDismissWritingCorrection(parent);
            }
          }
        },
      };
    }

    return props;
  }, [writingCorrections, itemId, fieldConfigs, onApplyFieldCorrection, onDismissWritingCorrection, helpers]);

  const descriptionCorrection = useMemo(() => {
    return helpers.getDescriptionCorrection(itemId);
  }, [helpers, itemId]);

  return {
    fieldCorrectionProps,
    descriptionCorrection,
    helpers,
  };
}
