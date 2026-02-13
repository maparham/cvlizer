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
    field_path: 'work_experience',
    quality_score: 45,
    original: 'Poor quality description',
    suggested: 'Improved quality description',
    reasoning: 'Lacks specific achievements and metrics',
    html_diff: '- Poor quality description\n+ Improved quality description'
  };

  const mockHighQualityWork: QualityItem = {
    item_type: 'high_score',
    item_id: 'work-2',
    field_path: 'work_experience',
    quality_score: 85
  };

  const mockLowQualityEducation: LowQualityItem = {
    item_type: 'low_score',
    item_id: 'edu-1',
    field_path: 'education',
    quality_score: 50,
    original: 'Basic education description',
    suggested: 'Enhanced education description',
    reasoning: 'Could include more details about projects',
    html_diff: '- Basic education description\n+ Enhanced education description'
  };

  const mockWritingCorrectionWork1: WritingCorrection = {
    item_id: 'work-1',
    field_path: 'work_experience',
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
    field_path: 'work_experience',
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
    field_path: 'education',
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

  // Single issues-based mock (V2-only); hook derives all maps from issues.
  const mockQualityAnalysis: CVQualityAnalysisData = {
    overall_quality_score: 65,
    issues: [
      {
        item_type: 'work_experience',
        item_id: 'work-1',
        field_path: 'work_experience',
        issue_severity: 'major',
        issue_category: 'insufficient_content',
        quality_score: 45,
        reasoning: mockLowQualityWork.reasoning,
        html_diff: mockLowQualityWork.html_diff,
        coaching: {
          coaching_questions: mockCoachingWork.coaching_questions,
          direct_prompts: mockCoachingWork.direct_prompts
        },
        original: mockLowQualityWork.original,
        suggested: mockLowQualityWork.suggested
      },
      {
        item_type: 'work_experience',
        item_id: 'work-1',
        field_path: 'work_experience',
        issue_severity: 'minor',
        issue_category: 'unprofessional_tone',
        quality_score: 80,
        reasoning: 'Use formal job title',
        html_diff: '- Developer\n+ Software Engineer',
        coaching: null,
        original: 'Developer',
        suggested: 'Software Engineer'
      },
      {
        item_type: 'education',
        item_id: 'edu-1',
        field_path: 'education',
        issue_severity: 'critical',
        issue_category: 'missing_impact',
        quality_score: 49,
        reasoning: mockLowQualityEducation.reasoning,
        html_diff: mockLowQualityEducation.html_diff,
        coaching: {
          coaching_questions: mockCoachingEducation.coaching_questions,
          direct_prompts: mockCoachingEducation.direct_prompts ?? []
        },
        original: mockLowQualityEducation.original,
        suggested: mockLowQualityEducation.suggested
      },
      // Issue with no html_diff and no coaching -> goes to qualitySuggestionsByItemId only
      {
        item_type: 'work_experience',
        item_id: 'work-1',
        field_path: 'work_experience[0].description',
        issue_severity: 'major',
        issue_category: 'lacks_specificity',
        quality_score: 40,
        reasoning: 'Needs more concrete examples',
        html_diff: null,
        coaching: null,
        original: 'Built features',
        suggested: 'Delivered 3 features that improved conversion by 10%'
      },
      {
        item_type: 'education',
        item_id: 'edu-1',
        field_path: 'education[0].description',
        issue_severity: 'minor',
        issue_category: 'too_brief',
        quality_score: 42,
        reasoning: 'Could add more detail',
        html_diff: null,
        coaching: null,
        original: 'Studied CS',
        suggested: 'Focused on algorithms and distributed systems'
      }
    ],
    professional_summary: undefined,
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
    it('should map only low_score items for work experience (no html_diff, no coaching)', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.size).toBe(1);
      const entry = result.current.qualitySuggestionsByItemId.get('work-1');
      expect(entry).toMatchObject({
        item_type: 'low_score',
        item_id: 'work-1',
        quality_score: 40,
        reasoning: 'Needs more concrete examples',
      });
    });

    it('should not include high_score items in quality suggestions map', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.get('work-2')).toBeUndefined();
    });

    it('should map low_score items for education section (no html_diff, no coaching)', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.size).toBe(1);
      const edu1Quality = result.current.qualitySuggestionsByItemId.get('edu-1');
      expect(edu1Quality).toMatchObject({
        item_type: 'low_score',
        item_id: 'edu-1',
        quality_score: 42,
        reasoning: 'Could add more detail',
      });
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
        issues: mockQualityAnalysis.issues.filter(
          (i) =>
            i.field_path !== 'work_experience' &&
            !i.field_path?.startsWith('work_experience.') &&
            !i.field_path?.startsWith('work_experience[')
        )
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
      expect(result.current.coachingByItemId.get('work-1')).toMatchObject({
        item_id: 'work-1',
        field_path: 'work_experience',
        issue_category: mockCoachingWork.issue_category,
        coaching_questions: mockCoachingWork.coaching_questions,
        direct_prompts: mockCoachingWork.direct_prompts,
        reasoning: mockLowQualityWork.reasoning,
      });
    });

    it('should map coaching items for education section', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      expect(result.current.coachingByItemId.size).toBe(1);
      expect(result.current.coachingByItemId.get('edu-1')).toMatchObject({
        item_id: 'edu-1',
        field_path: 'education',
        issue_category: mockCoachingEducation.issue_category,
        coaching_questions: mockCoachingEducation.coaching_questions,
        direct_prompts: mockCoachingEducation.direct_prompts ?? [],
        reasoning: mockLowQualityEducation.reasoning,
      });
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
        issues: mockQualityAnalysis.issues.filter((i) => !i.coaching)
      };

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', qualityAnalysisNoCoaching)
      );

      expect(result.current.coachingByItemId.size).toBe(0);
    });

    it('should include reasoning on coaching items when issue has reasoning', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      const coaching = result.current.coachingByItemId.get('work-1');
      expect(coaching?.reasoning).toBe(mockLowQualityWork.reasoning);
    });

    it('when issue has no html_diff but has coaching, appears only in coachingByItemId with reasoning not in qualitySuggestionsByItemId', () => {
      const analysisCoachingOnly: CVQualityAnalysisData = {
        ...mockQualityAnalysis,
        issues: [
          {
            item_type: 'work_experience',
            item_id: 'work-99',
            field_path: 'work_experience[0].description',
            issue_severity: 'major',
            issue_category: 'lacks_specificity',
            quality_score: 42,
            reasoning: 'Contains broad claims without examples; impact is hard to judge',
            html_diff: null,
            coaching: {
              coaching_questions: [{ question: 'What 1–2 MVPs did you build?' }],
              direct_prompts: ['Replace one bullet with a concrete MVP bullet.'],
            },
            original: '',
            suggested: '',
          },
        ],
      };

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', analysisCoachingOnly)
      );

      expect(result.current.qualitySuggestionsByItemId.has('work-99')).toBe(false);
      const coaching = result.current.coachingByItemId.get('work-99');
      expect(coaching).toBeDefined();
      expect(coaching!.reasoning).toBe('Contains broad claims without examples; impact is hard to judge');
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
      // Hook builds corrections from issues with field_name 'description'
      expect(work1Corrections!.every((c) => c.item_id === 'work-1' && c.field_path === 'work_experience')).toBe(true);
      expect(work1Corrections!.every((c) => c.field_corrections?.some((f) => f.field_name === 'description'))).toBe(true);
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
      expect(eduCorrections![0].item_id).toBe('edu-1');
      expect(eduCorrections![0].field_path).toBe('education');
      expect(eduCorrections![0].field_corrections?.[0]?.field_name).toBe('description');
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
        issues: mockQualityAnalysis.issues.filter((i) => !i.html_diff)
      };

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', qualityAnalysisNoCorrections)
      );

      expect(result.current.writingCorrectionsByItemId.size).toBe(0);
    });
  });

  describe('Issues-based quality analysis (cv_review_v2)', () => {
    it('should derive writingCorrectionsByItemId from issues with html_diff', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      const corrections = result.current.writingCorrectionsByItemId.get('work-1');
      expect(corrections).toBeDefined();
      expect(corrections!.length).toBe(2);
      expect(corrections![0].item_id).toBe('work-1');
      expect(corrections![0].field_path).toBe('work_experience');
      expect(corrections![0].field_corrections?.[0]?.field_name).toBe('description');
    });

    it('should derive coachingByItemId from issues with coaching', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      const coaching = result.current.coachingByItemId.get('work-1');
      expect(coaching).toBeDefined();
      expect(coaching!.coaching_questions.length).toBeGreaterThanOrEqual(1);
      expect(coaching!.coaching_questions[0].question).toBeDefined();
    });

    it('should derive qualitySuggestionsByItemId from issues for work_experience (no html_diff, no coaching)', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'work_experience', mockQualityAnalysis)
      );

      const low = result.current.qualitySuggestionsByItemId.get('work-1');
      expect(low).toBeDefined();
      expect(low!.item_type).toBe('low_score');
      expect(low!.quality_score).toBe(40);
      expect(low!.original).toBeDefined();
      expect(low!.suggested).toBeDefined();
    });

    it('should derive quality and coaching for education from issues', () => {
      (aiSuggestionsStore.useValidatedSuggestions as jest.Mock).mockReturnValue(mockAllSuggestions);

      const { result } = renderHook(() =>
        useSectionSuggestions(cvId, 'education', mockQualityAnalysis)
      );

      expect(result.current.qualitySuggestionsByItemId.get('edu-1')).toBeDefined();
      expect(result.current.coachingByItemId.get('edu-1')).toBeDefined();
      expect(result.current.writingCorrectionsByItemId.get('edu-1')).toBeDefined();
      expect(result.current.writingCorrectionsByItemId.get('edu-1')).toHaveLength(1);
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
        issues: mockQualityAnalysis.issues.filter((i) => !i.html_diff)
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
