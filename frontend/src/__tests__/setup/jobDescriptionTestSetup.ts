/**
 * Job Description Test Setup
 * 
 * Common test utilities and mocks for job description testing
 */

import { JobDescription } from '../../types/ai';

// Mock job description data
export const mockJobDescription1: JobDescription = {
  id: 'jd-1',
  cv_id: 'cv-1',
  content: 'First job description content',
  title: 'Software Engineer',
  company: 'Company A',
  location: 'San Francisco, CA',
  source_url: 'https://example.com/job1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockJobDescription2: JobDescription = {
  id: 'jd-2',
  cv_id: 'cv-1',
  content: 'Second job description content',
  title: 'Product Manager',
  company: 'Company B',
  location: 'New York, NY',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

export const mockJobDescription3: JobDescription = {
  id: 'jd-3',
  cv_id: 'cv-1',
  content: 'Third job description content',
  title: 'Designer',
  company: 'Company C',
  location: 'Seattle, WA',
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
};

// Mock store state
export const createMockStoreState = (overrides = {}) => ({
  hideJobDescriptionFromSidebar: jest.fn(),
  setActiveJobDescription: jest.fn(),
  createJobDescription: jest.fn(),
  createJobFitDraft: jest.fn(),
  loadJobDescriptions: jest.fn(),
  deleteJobDescription: jest.fn(),
  showJobDescriptionInSidebar: jest.fn(),
  jobDescriptions: [],
  activeJobDescriptionId: undefined,
  hiddenJobDescriptionIds: [],
  ...overrides,
});

// Mock notifications
export const createMockNotifications = (overrides = {}) => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  ...overrides,
});

// Mock localStorage
export const createMockLocalStorage = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
});

// Test utilities
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const createMockAIStore = (state = {}) => {
  const mockStore = {
    ...createMockStoreState(),
    ...state,
  };
  
  return {
    getState: () => mockStore,
    setState: (newState: any) => Object.assign(mockStore, newState),
    subscribe: jest.fn(),
    destroy: jest.fn(),
  };
};
