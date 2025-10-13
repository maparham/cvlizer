import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { CVEditorProvider } from '../contexts/CVEditorContext'
import { DEFAULT_CV_DATA } from '../stores/cvStore'

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
})

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

// Custom render function that includes all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()

  return (
    <BrowserRouter>
      <ThemeProvider theme={testTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CVEditorProvider
              cvData={DEFAULT_CV_DATA}
              onUpdateCV={jest.fn()}
              onSave={jest.fn()}
            >
              {children}
            </CVEditorProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Mock utilities
export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  return localStorageMock
}

export const mockSessionStorage = () => {
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  }

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  })

  return sessionStorageMock
}

export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
  })
}

export const mockFile = (name: string, type: string, content: string = 'test content') => {
  return new File([content], name, { type })
}

export const mockFileList = (files: File[]) => {
  const fileList = {
    item: (index: number) => files[index] || null,
    ...files,
    length: files.length,
  }

  return fileList as FileList
}

// Common test setup
export const setupTest = () => {
  // Clear all mocks
  jest.clearAllMocks()

  // Reset localStorage and sessionStorage
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }

  // Reset fetch
  if (global.fetch) {
    global.fetch = jest.fn()
  }
}

// Common test cleanup
export const cleanupTest = () => {
  // Clear all mocks
  jest.clearAllMocks()

  // Reset DOM
  document.body.innerHTML = ''

  // Reset localStorage and sessionStorage
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }
}

// Wait for async operations
export const waitFor = (callback: () => void, options?: { timeout?: number }) => {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeout || 1000
    const startTime = Date.now()

    const check = () => {
      try {
        callback()
        resolve(undefined)
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error)
        } else {
          setTimeout(check, 10)
        }
      }
    }

    check()
  })
}

// Mock window.matchMedia
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock ResizeObserver
export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

// Mock FileReader
export const mockFileReader = () => {
  const FileReaderMock = jest.fn().mockImplementation(() => ({
    readAsText: jest.fn(),
    readAsDataURL: jest.fn(),
    readAsArrayBuffer: jest.fn(),
    result: null,
    error: null,
    readyState: 0,
    onload: null,
    onerror: null,
    onabort: null,
    onloadend: null,
    onloadstart: null,
    onprogress: null,
    abort: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))

  // Add static properties
  Object.assign(FileReaderMock, {
    EMPTY: 0,
    LOADING: 1,
    DONE: 2
  })

  global.FileReader = FileReaderMock as any
}

// Mock URL.createObjectURL and URL.revokeObjectURL
export const mockURL = () => {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: jest.fn(() => 'blob:mock-url')
  })

  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: jest.fn()
  })
}

// Setup all mocks
export const setupCommonMocks = () => {
  mockMatchMedia()
  mockResizeObserver()
  mockIntersectionObserver()
  mockFileReader()
  mockURL()
  mockLocalStorage()
  mockSessionStorage()
}

// Cleanup all mocks
export const cleanupMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}
