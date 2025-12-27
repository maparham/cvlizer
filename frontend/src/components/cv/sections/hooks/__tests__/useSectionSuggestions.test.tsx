import { renderHook } from '@testing-library/react';
import { useSectionSuggestions } from '../useSectionSuggestions';
import { CVQualityAnalysisData, LowQualityItem, WritingCorrection, ContentCoachingItem, QualityItem } from '../../../../../types/ai';
import * as aiSuggestionsStore from '../../../../../stores/aiSuggestionsStore';

// Mock the AI suggestions store
jest.mock('../../../../../stores/aiSuggestionsStore');

describe('useSectionSuggestions', () => {
  const cvId = 'cv-123';

  // Mock data fixtures
  const mockWorkSuggestion1 = {
    id: 'work-1',
    suggested: 'Enhanced description for work experience 1',
    original: 'Original work description'
  };

  const mockWorkSuggestion2 = {
    id: 'work-2',
    suggested: 'Enhanced description for work experience 2',
    original: 'Original work description 2'
  };

  const mockWorkSuggestionNoText = {
    id: 'work-3',
    suggested: '', // No suggested text - should be filtered out
    original: 'Original work description 3'
  };

  const mockEducationSuggestion = {
    id: 'edu-1',
    suggested: 'Enhanced education description',
    original: 'Original education description'
  };

  const mockLowQualityWork: LowQualityItem = {
    item_type: 'low_score',
    item_id: 'work-1',
    section: 'work_experience',
    quality_score: 45,
    original: 'Poor quality description',
    suggested: 'Improved quality description',
    reasoning: 'Lacks specific achievements and metrics',
    html_diff: '- Poor quality description\n+ Improved quality description'
  };

  const mockHighQualityWork: QualityItem = {
    item_type: 'high_score',
    item_id: 'work-2',
    section: 'work_experience',
    quality_score: 85
  };

  const mockLowQualityEducation: LowQualityItem = {
    item_type: 'low_score',
    item_id: 'edu-1',
    section: 'education',
    quality_score: 50,
    original: 'Basic education description',
    suggested: 'Enhanced education description',
    reasoning: 'Could include more details about projects',
    html_diff: '- Basic education description\n+ Enhanced education description'
  };

  const mockWritingCorrectionWork1: WritingCorrection = {
    item_id: 'work-1',
    section: 'work_experience',
    field_corrections: [
      {
        field_name: 'company',
        original_value: 'Google Inc',
        corrected_value: 'Google',
        html_diff: '- Google Inc\n+ Google',
        reasoning: 'Use official company name'
      }
    ],
    reasoning: 'Improve consistency',
    importance: 'highly_recommended'
  };

  const mockWritingCorrectionWork2: WritingCorrection = {
    item_id: 'work-1',
    section: 'work_experience',
    field_corrections: [
      {
        field_name: 'position',
        original_value: 'Developer',
        corrected_value: 'Software Engineer',
        html_diff: '- Developer\n+ Software Engineer'
      }
    ],
    reasoning: 'Use formal job title',
    importance: 'standard'
  };

  const mockWritingCorrectionEducation: WritingCorrection = {
    item_id: 'edu-1',
    section: 'education',
    field_corrections: [
      {
        field_name: 'institution',
        original_value: 'MIT',
        corrected_value: 'Massachusetts Institute of Technology',
        html_diff: '- MIT\n+ Massachusetts Institute of Technology'
      }
    ],
    reasoning: 'Use full institution name',
    importance: 'standard'
  };

  const mockCoachingWork: ContentCoachingItem = {
    item_id: 'work-1',
    section: 'work_experience',
    issue_category: 'insufficient_content',
    coaching_questions: [
      { question: 'What were your main achievements?' },
      { question: 'What metrics can you add?' }
    ],
    direct_prompts: ['Add specific metrics and results']
  };

  const mockCoachingEducation: ContentCoachingItem = {
    item_id: 'edu-1',
    section: 'education',
    issue_category: 'missing_impact',
    coaching_questions: [
      { question: 'What projects did you work on?' }
    ],
    direct_prompts: ['Describe significant projects or research']
  };

  const mockQualityAnalysis: CVQualityAnalysisData = {
    overall_quality_score: 65,
    work_experience: [mockLowQualityWork, mockHighQualityWork],
    education: [mockLowQualityEducation],
    writing_corrections: [
      mockWritingCorrectionWork1,
      mockWritingCorrectionWork2,
      mockWritingCorrectionEducation
    ],
    content_coaching: [mockCoachingWork, mockCoachingEducation],
    skills: { technical: [], soft: [] },
    timeline_gaps: []
  };

  const mockAllSuggestions = {
    work_experience: [mockWorkSuggestion1, mockWorkSuggestion2, mockWorkSuggestionNoText],
    education: [mockEducationSuggestion]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job-based suggestions mapping (suggestionsByItemId)', () => {
    it('should map all work experience suggestions by item ID', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.suggestionsByItemId.size).toBe(3);
      expect(result.current.suggestionsByItemId.get('work-1')).toEqual(mockWorkSuggestion1);
      expect(result.current.suggestionsByItemId.get('work-2')).toEqual(mockWorkSuggestion2);
      expect(result.current.suggestionsByItemId.get('work-3')).toEqual(mockWorkSuggestionNoText);
    });

    it('should map education suggestions by item ID', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      expect(result.current.suggestionsByItemId.size).toBe(1);
      expect(result.current.suggestionsByItemId.get('edu-1')).toEqual(mockEducationSuggestion);
    });

    it('should return empty map when no suggestions exist', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.suggestionsByItemId.size).toBe(0);
    });

    it('should return empty map when section has no suggestions', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue({
        work_experience: [],
        education: []
      });

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.suggestionsByItemId.size).toBe(0);
    });
  });

  describe('Visible suggestions filtering', () => {
    it('should filter to only suggestions with suggested text', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.visibleSuggestions).toHaveLength(2);
      expect(result.current.visibleSuggestions).toContainEqual(mockWorkSuggestion1);
      expect(result.current.visibleSuggestions).toContainEqual(mockWorkSuggestion2);
      expect(result.current.visibleSuggestions).not.toContainEqual(mockWorkSuggestionNoText);
    });

    it('should set hasSuggestions to true when visible suggestions exist', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.hasSuggestions).toBe(true);
    });

    it('should set hasSuggestions to false when no visible suggestions', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue({
        work_experience: [mockWorkSuggestionNoText], // Only suggestion with no text
        education: []
      });

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.hasSuggestions).toBe(false);
      expect(result.current.visibleSuggestions).toHaveLength(0);
    });
  });

  describe('Quality suggestions mapping (qualitySuggestionsByItemId)', () => {
    it('should map only low_score items for work experience', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.size).toBe(1);
      expect(result.current.qualitySuggestionsByItemId.get('work-1')).toEqual(mockLowQualityWork);
    });

    it('should not include high_score items in quality suggestions map', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.get('work-2')).toBeUndefined();
    });

    it('should map low_score items for education section', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.size).toBe(1);
      expect(result.current.qualitySuggestionsByItemId.get('edu-1')).toEqual(mockLowQualityEducation);
    });

    it('should return empty map when no quality analysis exists', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', null)
      );

      expect(result.current.qualitySuggestionsByItemId.size).toBe(0);
    });

    it('should return empty map when section has no quality items', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const qualityAnalysisNoWork: CVQualityAnalysisData = {
        ...mockQualityAnalysis,
        work_experience: []
      };

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', qualityAnalysisNoWork)
      );

      expect(result.current.qualitySuggestionsByItemId.size).toBe(0);
    });
  });

  describe('Coaching mapping (coachingByItemId)', () => {
    it('should map coaching items for work experience section', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.coachingByItemId.size).toBe(1);
      expect(result.current.coachingByItemId.get('work-1')).toEqual(mockCoachingWork);
    });

    it('should map coaching items for education section', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      expect(result.current.coachingByItemId.size).toBe(1);
      expect(result.current.coachingByItemId.get('edu-1')).toEqual(mockCoachingEducation);
    });

    it('should filter by section name correctly', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      // Should not include education coaching
      expect(result.current.coachingByItemId.get('edu-1')).toBeUndefined();
    });

    it('should return empty map when no quality analysis exists', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', null)
      );

      expect(result.current.coachingByItemId.size).toBe(0);
    });

    it('should return empty map when no coaching items exist', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const qualityAnalysisNoCoaching: CVQualityAnalysisData = {
        ...mockQualityAnalysis,
        content_coaching: []
      };

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', qualityAnalysisNoCoaching)
      );

      expect(result.current.coachingByItemId.size).toBe(0);
    });
  });

  describe('Writing corrections mapping (writingCorrectionsByItemId)', () => {
    it('should map writing corrections by item ID for work experience', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      const work1Corrections = result.current.writingCorrectionsByItemId.get('work-1');
      expect(work1Corrections).toHaveLength(2);
      expect(work1Corrections).toContainEqual(mockWritingCorrectionWork1);
      expect(work1Corrections).toContainEqual(mockWritingCorrectionWork2);
    });

    it('should handle multiple corrections for single item', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      const corrections = result.current.writingCorrectionsByItemId.get('work-1');
      expect(corrections).toHaveLength(2);
    });

    it('should filter by section name correctly', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      // Should not include education corrections
      expect(result.current.writingCorrectionsByItemId.get('edu-1')).toBeUndefined();
    });

    it('should map writing corrections for education section', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      const eduCorrections = result.current.writingCorrectionsByItemId.get('edu-1');
      expect(eduCorrections).toHaveLength(1);
      expect(eduCorrections).toContainEqual(mockWritingCorrectionEducation);
    });

    it('should return empty map when no quality analysis exists', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', null)
      );

      expect(result.current.writingCorrectionsByItemId.size).toBe(0);
    });

    it('should return empty map when no writing corrections exist', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const qualityAnalysisNoCorrections: CVQualityAnalysisData = {
        ...mockQualityAnalysis,
        writing_corrections: []
      };

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', qualityAnalysisNoCorrections)
      );

      expect(result.current.writingCorrectionsByItemId.size).toBe(0);
    });
  });

  describe('Memoization and updates', () => {
    it('should not recreate maps when dependencies do not change', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result, rerender } = renderHook(
        ({ cvId, section, quality }) => useSectionSuggestions(cvId, section, quality),
        {
          initialProps: {
            cvId,
            section: 'work_experience' as const,
            quality: mockQualityAnalysis
          }
        }
      );

      const firstMaps = {
        suggestions: result.current.suggestionsByItemId,
        quality: result.current.qualitySuggestionsByItemId,
        coaching: result.current.coachingByItemId,
        corrections: result.current.writingCorrectionsByItemId
      };

      // Rerender with same props
      rerender({
        cvId,
        section: 'work_experience' as const,
        quality: mockQualityAnalysis
      });

      // Maps should be the same reference (memoized)
      expect(result.current.suggestionsByItemId).toBe(firstMaps.suggestions);
      expect(result.current.qualitySuggestionsByItemId).toBe(firstMaps.quality);
      expect(result.current.coachingByItemId).toBe(firstMaps.coaching);
      expect(result.current.writingCorrectionsByItemId).toBe(firstMaps.corrections);
    });

    it('should update maps when quality analysis changes', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result, rerender } = renderHook(
        ({ cvId, section, quality }) => useSectionSuggestions(cvId, section, quality),
        {
          initialProps: {
            cvId,
            section: 'work_experience' as const,
            quality: mockQualityAnalysis
          }
        }
      );

      const firstCorrections = result.current.writingCorrectionsByItemId;

      // New quality analysis without corrections
      const newQualityAnalysis: CVQualityAnalysisData = {
        ...mockQualityAnalysis,
        writing_corrections: []
      };

      rerender({
        cvId,
        section: 'work_experience' as const,
        quality: newQualityAnalysis
      });

      // Map should be different and empty
      expect(result.current.writingCorrectionsByItemId).not.toBe(firstCorrections);
      expect(result.current.writingCorrectionsByItemId.size).toBe(0);
    });

    it('should update when switching sections', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result, rerender } = renderHook(
        ({ cvId, section, quality }) => useSectionSuggestions(cvId, section, quality),
        {
          initialProps: {
            cvId,
            section: 'work_experience' as const,
            quality: mockQualityAnalysis
          }
        }
      );

      expect(result.current.suggestionsByItemId.size).toBe(3); // Work experience has 3

      rerender({
        cvId,
        section: 'education' as const,
        quality: mockQualityAnalysis
      });

      expect(result.current.suggestionsByItemId.size).toBe(1); // Education has 1
    });
  });

  describe('Integration scenarios', () => {
    it('should handle item with all types of suggestions and corrections', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      // work-1 has job suggestion, quality suggestion, writing corrections, and coaching
      expect(result.current.suggestionsByItemId.get('work-1')).toBeDefined();
      expect(result.current.qualitySuggestionsByItemId.get('work-1')).toBeDefined();
      expect(result.current.writingCorrectionsByItemId.get('work-1')).toBeDefined();
      expect(result.current.coachingByItemId.get('work-1')).toBeDefined();
    });

    it('should handle item with no suggestions or corrections', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      // work-2 only has high_score (no low quality, no corrections, no coaching)
      expect(result.current.suggestionsByItemId.get('work-2')).toBeDefined();
      expect(result.current.qualitySuggestionsByItemId.get('work-2')).toBeUndefined();
      expect(result.current.writingCorrectionsByItemId.get('work-2')).toBeUndefined();
      expect(result.current.coachingByItemId.get('work-2')).toBeUndefined();
    });
  });
});
