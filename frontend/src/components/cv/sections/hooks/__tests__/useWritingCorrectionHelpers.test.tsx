import { renderHook, act } from '@testing-library/react';
import { useWritingCorrectionHelpers } from '../useWritingCorrectionHelpers';
import { WritingCorrection, FieldCorrection } from '../../../../../types/ai';

describe('useWritingCorrectionHelpers', () => {
  // Mock data fixtures
  const mockFieldCorrection1: FieldCorrection = {
    field_name: 'company',
    original_value: 'Google Inc',
    corrected_value: 'Google',
    markdown_diff: '- Google Inc\n+ Google',
    reasoning: 'Use official company name'
  };

  const mockFieldCorrection2: FieldCorrection = {
    field_name: 'position',
    original_value: 'Developer',
    corrected_value: 'Software Engineer',
    markdown_diff: '- Developer\n+ Software Engineer'
    // No field-specific reasoning
  };

  const mockFieldCorrection3: FieldCorrection = {
    field_name: 'description',
    original_value: 'Built web apps',
    corrected_value: 'Developed scalable web applications using React and Node.js',
    markdown_diff: '- Built web apps\n+ Developed scalable web applications using React and Node.js',
    reasoning: 'Be more specific and use stronger verbs'
  };

  const mockWritingCorrections: WritingCorrection[] = [
    {
      item_id: 'work-1',
      section: 'work_experience',
      field_corrections: [mockFieldCorrection1, mockFieldCorrection2, mockFieldCorrection3],
      reasoning: 'Parent reasoning for all corrections',
      importance: 'highly_recommended'
    }
  ];

  const mockWritingCorrectionsLegacy: WritingCorrection[] = [
    {
      item_id: 'work-2',
      section: 'work_experience',
      markdown_diff: '- Old description\n+ New improved description',
      reasoning: 'Legacy correction format',
      importance: 'standard'
    }
  ];

  const mockWritingCorrectionsStandard: WritingCorrection[] = [
    {
      item_id: 'edu-1',
      section: 'education',
      field_corrections: [
        {
          field_name: 'institution',
          original_value: 'MIT',
          corrected_value: 'Massachusetts Institute of Technology',
          markdown_diff: '- MIT\n+ Massachusetts Institute of Technology',
          reasoning: 'Use full institution name'
        }
      ],
      reasoning: 'Educational consistency',
      importance: 'standard'
    }
  ];

  const mockOnApply = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findWritingCorrectionForField', () => {
    it('should find correction when field and value match', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const found = result.current.findWritingCorrectionForField('company', 'Google Inc');

      expect(found).toBeDefined();
      expect(found?.item_id).toBe('work-1');
      expect(found?.importance).toBe('highly_recommended');
    });

    it('should return undefined when field name does not match', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const found = result.current.findWritingCorrectionForField('nonexistent', 'Google Inc');

      expect(found).toBeUndefined();
    });

    it('should return undefined when original value does not match', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const found = result.current.findWritingCorrectionForField('company', 'Microsoft');

      expect(found).toBeUndefined();
    });

    it('should handle empty corrections array', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers([], mockOnApply, mockOnDismiss)
      );

      const found = result.current.findWritingCorrectionForField('company', 'Google Inc');

      expect(found).toBeUndefined();
    });

    it('should handle WritingCorrection without field_corrections', () => {
      const correctionsWithoutFields: WritingCorrection[] = [
        {
          item_id: 'work-3',
          section: 'work_experience',
          reasoning: 'No field corrections',
          importance: 'standard'
        }
      ];

      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(correctionsWithoutFields, mockOnApply, mockOnDismiss)
      );

      const found = result.current.findWritingCorrectionForField('company', 'Google');

      expect(found).toBeUndefined();
    });
  });

  describe('handleApplyFieldCorrection', () => {
    it('should call onApplyWritingCorrection with parent WritingCorrection when field exists', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      act(() => {
        result.current.handleApplyFieldCorrection(mockFieldCorrection1);
      });

      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnApply).toHaveBeenCalledWith(mockWritingCorrections[0]);
    });

    it('should not call onApplyWritingCorrection when field does not exist', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const nonExistentField: FieldCorrection = {
        field_name: 'nonexistent',
        original_value: 'test',
        corrected_value: 'test',
        markdown_diff: '- test\n+ test'
      };

      act(() => {
        result.current.handleApplyFieldCorrection(nonExistentField);
      });

      expect(mockOnApply).not.toHaveBeenCalled();
    });

    it('should handle missing callback gracefully', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, undefined, mockOnDismiss)
      );

      expect(() => {
        act(() => {
          result.current.handleApplyFieldCorrection(mockFieldCorrection1);
        });
      }).not.toThrow();

      expect(mockOnApply).not.toHaveBeenCalled();
    });

    it('should work with multiple field corrections in same WritingCorrection', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      // Apply first field correction
      act(() => {
        result.current.handleApplyFieldCorrection(mockFieldCorrection1);
      });

      expect(mockOnApply).toHaveBeenCalledWith(mockWritingCorrections[0]);

      mockOnApply.mockClear();

      // Apply second field correction from same WritingCorrection
      act(() => {
        result.current.handleApplyFieldCorrection(mockFieldCorrection2);
      });

      expect(mockOnApply).toHaveBeenCalledWith(mockWritingCorrections[0]);
    });
  });

  describe('handleDismissFieldCorrection', () => {
    it('should call onDismissWritingCorrection with parent WritingCorrection when field exists', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      act(() => {
        result.current.handleDismissFieldCorrection(mockFieldCorrection1);
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledWith(mockWritingCorrections[0]);
    });

    it('should not call onDismissWritingCorrection when field does not exist', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const nonExistentField: FieldCorrection = {
        field_name: 'nonexistent',
        original_value: 'test',
        corrected_value: 'test',
        markdown_diff: '- test\n+ test'
      };

      act(() => {
        result.current.handleDismissFieldCorrection(nonExistentField);
      });

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should handle missing callback gracefully', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, undefined)
      );

      expect(() => {
        act(() => {
          result.current.handleDismissFieldCorrection(mockFieldCorrection1);
        });
      }).not.toThrow();

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('getCorrectionMetadata', () => {
    it('should return importance and field-specific reasoning when correction exists', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const metadata = result.current.getCorrectionMetadata(mockFieldCorrection1);

      expect(metadata.importance).toBe('highly_recommended');
      expect(metadata.reasoning).toBe('Use official company name'); // Field-specific reasoning
    });

    it('should prioritize field-specific reasoning over parent reasoning', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const metadata = result.current.getCorrectionMetadata(mockFieldCorrection3);

      expect(metadata.reasoning).toBe('Be more specific and use stronger verbs'); // Field-specific, not parent
    });

    it('should fall back to parent reasoning when field reasoning is missing', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const metadata = result.current.getCorrectionMetadata(mockFieldCorrection2);

      expect(metadata.reasoning).toBe('Parent reasoning for all corrections'); // Fallback to parent
    });

    it('should return standard importance correctly', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrectionsStandard, mockOnApply, mockOnDismiss)
      );

      const fieldCorrection = mockWritingCorrectionsStandard[0].field_corrections![0];
      const metadata = result.current.getCorrectionMetadata(fieldCorrection);

      expect(metadata.importance).toBe('standard');
    });

    it('should return undefined importance and reasoning when correction is null', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const metadata = result.current.getCorrectionMetadata(null);

      expect(metadata.importance).toBeUndefined();
      expect(metadata.reasoning).toBeUndefined();
    });

    it('should return undefined importance and reasoning when field correction cannot be found', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const orphanedField: FieldCorrection = {
        field_name: 'orphaned',
        original_value: 'value',
        corrected_value: 'newvalue',
        markdown_diff: '- value\n+ newvalue'
      };

      const metadata = result.current.getCorrectionMetadata(orphanedField);

      expect(metadata.importance).toBeUndefined();
      expect(metadata.reasoning).toBeUndefined();
    });
  });

  describe('getDescriptionCorrection', () => {
    it('should return markdown_diff format for description field when found', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const descriptionCorrection = result.current.getDescriptionCorrection('work-1');

      expect(descriptionCorrection).toBeDefined();
      expect(descriptionCorrection?.markdown_diff).toBe('- Built web apps\n+ Developed scalable web applications using React and Node.js');
      expect(descriptionCorrection?.correction).toEqual(mockWritingCorrections[0]);
    });

    it('should fall back to legacy markdown_diff format when no field correction exists', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrectionsLegacy, mockOnApply, mockOnDismiss)
      );

      const descriptionCorrection = result.current.getDescriptionCorrection('work-2');

      expect(descriptionCorrection).toBeDefined();
      expect(descriptionCorrection?.markdown_diff).toBe('- Old description\n+ New improved description');
      expect(descriptionCorrection?.correction).toEqual(mockWritingCorrectionsLegacy[0]);
    });

    it('should return null when no description correction exists', () => {
      const correctionsWithoutDescription: WritingCorrection[] = [
        {
          item_id: 'work-3',
          section: 'work_experience',
          field_corrections: [mockFieldCorrection1], // Only company correction, no description
          reasoning: 'No description correction',
          importance: 'standard'
        }
      ];

      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(correctionsWithoutDescription, mockOnApply, mockOnDismiss)
      );

      const descriptionCorrection = result.current.getDescriptionCorrection('work-3');

      expect(descriptionCorrection).toBeNull();
    });

    it('should return null when item ID does not match', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const descriptionCorrection = result.current.getDescriptionCorrection('nonexistent-id');

      expect(descriptionCorrection).toBeNull();
    });

    it('should return null for empty corrections array', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers([], mockOnApply, mockOnDismiss)
      );

      const descriptionCorrection = result.current.getDescriptionCorrection('work-1');

      expect(descriptionCorrection).toBeNull();
    });

    it('should include full WritingCorrection object in result', () => {
      const { result } = renderHook(() =>
        useWritingCorrectionHelpers(mockWritingCorrections, mockOnApply, mockOnDismiss)
      );

      const descriptionCorrection = result.current.getDescriptionCorrection('work-1');

      expect(descriptionCorrection?.correction).toHaveProperty('item_id', 'work-1');
      expect(descriptionCorrection?.correction).toHaveProperty('section', 'work_experience');
      expect(descriptionCorrection?.correction).toHaveProperty('importance', 'highly_recommended');
      expect(descriptionCorrection?.correction).toHaveProperty('reasoning');
    });
  });

  describe('Callback memoization', () => {
    it('should memoize callbacks when dependencies do not change', () => {
      const { result, rerender } = renderHook(
        ({ corrections, onApply, onDismiss }) =>
          useWritingCorrectionHelpers(corrections, onApply, onDismiss),
        {
          initialProps: {
            corrections: mockWritingCorrections,
            onApply: mockOnApply,
            onDismiss: mockOnDismiss
          }
        }
      );

      const firstCallbacks = result.current;

      // Rerender with same props
      rerender({
        corrections: mockWritingCorrections,
        onApply: mockOnApply,
        onDismiss: mockOnDismiss
      });

      const secondCallbacks = result.current;

      // Callbacks should be the same reference
      expect(firstCallbacks.handleApplyFieldCorrection).toBe(secondCallbacks.handleApplyFieldCorrection);
      expect(firstCallbacks.handleDismissFieldCorrection).toBe(secondCallbacks.handleDismissFieldCorrection);
      expect(firstCallbacks.getCorrectionMetadata).toBe(secondCallbacks.getCorrectionMetadata);
      expect(firstCallbacks.getDescriptionCorrection).toBe(secondCallbacks.getDescriptionCorrection);
    });

    it('should update callbacks when corrections change', () => {
      const { result, rerender } = renderHook(
        ({ corrections, onApply, onDismiss }) =>
          useWritingCorrectionHelpers(corrections, onApply, onDismiss),
        {
          initialProps: {
            corrections: mockWritingCorrections,
            onApply: mockOnApply,
            onDismiss: mockOnDismiss
          }
        }
      );

      const firstCallbacks = result.current;

      // Rerender with different corrections
      rerender({
        corrections: mockWritingCorrectionsStandard,
        onApply: mockOnApply,
        onDismiss: mockOnDismiss
      });

      const secondCallbacks = result.current;

      // Callbacks should be different references
      expect(firstCallbacks.getDescriptionCorrection).not.toBe(secondCallbacks.getDescriptionCorrection);
    });
  });
});
