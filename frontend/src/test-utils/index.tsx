import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'

// Create a theme for testing
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
})

// Custom render function that includes all providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  is_active: true,
  email_verified: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockCV = (overrides = {}) => ({
  id: 'cv-123',
  user_id: '123',
  original_filename: 'test-cv.pdf',
  file_size: 1024,
  file_type: 'application/pdf',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  is_parsed: true,
  parsed_data: createMockCVData(),
  ...overrides
})

export const createMockCVData = (overrides = {}) => ({
  personal_info: {
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    location: 'New York, NY',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    website_url: 'https://johndoe.com'
  },
  professional_summary: {
    content: 'Experienced software developer with 5 years of experience.',
    keywords: ['JavaScript', 'React', 'Node.js']
  },
  work_experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Developer',
      location: 'New York, NY',
      start_date: '2020-01',
      end_date: '2023-01',
      current: false,
      description: 'Developed web applications using React and Node.js.',
      achievements: ['Increased performance by 30%'],
      technologies: ['React', 'Node.js', 'TypeScript']
    }
  ],
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      start_date: '2016-09',
      end_date: '2020-05',
      current: false,
      gpa: '3.8',
      honors: ['Magna Cum Laude']
    }
  ],
  skills: {
    technical: ['JavaScript', 'React', 'Node.js'],
    soft: ['Leadership', 'Communication'],
    languages: [
      { language: 'English', proficiency: 'Native' as const },
      { language: 'Spanish', proficiency: 'Intermediate' as const }
    ]
  },
  certifications: [],
  projects: [],
  awards: [],
  publications: [],
  volunteer_experience: [],
  ...overrides
})

export const createMockSection = (overrides = {}) => ({
  id: 'personal_info',
  type: 'personal_info' as const,
  title: 'Personal Information',
  visible: true,
  order: 0,
  ...overrides
})

// Mock API responses
export const mockApiResponse = <T,>(data: T) => ({
  data,
  success: true,
  message: 'Success'
})

// Test helpers
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0))

// Mock functions
export const mockFn = jest.fn()

// Setup function to run before each test
export const setupTest = () => {
  // Reset all mocks
  jest.clearAllMocks()

  // Reset localStorage
  localStorage.clear()

  // Reset any global state if needed
}
