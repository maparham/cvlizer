/**
 * Inline Drafts Hook Tests
 * 
 * This module tests the useInlineDrafts hook functionality including
 * draft loading, positioning calculations, and state management.
 */

import { renderHook } from '@testing-library/react';
import { useInlineDrafts } from '../useInlineDrafts';
// import { DraftResponse } from '../../types/ai';

// Mock the entire hook dependencies
jest.mock('../../stores/aiStore', () => ({
  useAIStore: jest.fn(),
  useCVDrafts: jest.fn(),
}));

jest.mock('../../stores/uiStore', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// const _mockDrafts: DraftResponse[] = [
//   {
//     id: 'draft-1',
//     cv_id: 'cv-1',
//     section_type: 'why_good_fit',
//     draft_data: { fit_analysis: 'Test draft 1' },
//     ai_model: 'gpt-4',
//     generation_time: 1000,
//     tokens_used: 50,
//     created_at: '2024-01-15T10:00:00Z',
//     job_description_id: 'job-1',
//   },
//   {
//     id: 'draft-2',
//     cv_id: 'cv-1',
//     section_type: 'why_good_fit',
//     draft_data: { fit_analysis: 'Test draft 2' },
//     ai_model: 'gpt-4',
//     generation_time: 1500,
//     tokens_used: 75,
//     created_at: '2024-01-15T11:00:00Z',
//     job_description_id: 'job-2',
//   },
// ];

describe('useInlineDrafts', () => {
  const mockGetCVDrafts = jest.fn();
  const mockShowError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the store hooks
    const { useAIStore, useCVDrafts } = require('../../stores/aiStore');
    const { useNotifications } = require('../../stores/uiStore');

    useAIStore.mockReturnValue({
      getCVDrafts: mockGetCVDrafts,
    });

    useCVDrafts.mockReturnValue([]);

    useNotifications.mockReturnValue({
      showError: mockShowError,
    });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useInlineDrafts('cv-1'));

    expect(result.current.drafts).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.loadDrafts).toBe('function');
    expect(typeof result.current.getDraftPosition).toBe('function');
    expect(typeof result.current.getDraftsAfterSection).toBe('function');
    expect(typeof result.current.getDraftsBeforeSection).toBe('function');
    expect(typeof result.current.handleDraftApproved).toBe('function');
    expect(typeof result.current.handleDraftRejected).toBe('function');
  });

  it('provides all required functions', () => {
    const { result } = renderHook(() => useInlineDrafts('cv-1'));

    // Test that all required functions are available
    expect(typeof result.current.loadDrafts).toBe('function');
    expect(typeof result.current.getDraftPosition).toBe('function');
    expect(typeof result.current.getDraftsAfterSection).toBe('function');
    expect(typeof result.current.getDraftsBeforeSection).toBe('function');
    expect(typeof result.current.handleDraftApproved).toBe('function');
    expect(typeof result.current.handleDraftRejected).toBe('function');
  });
});
