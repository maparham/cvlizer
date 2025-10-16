/**
 * Jest setup file for frontend tests
 * This file is run before each test file
 */

import React from "react";
import "@testing-library/jest-dom";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock FileReader
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
}));

// Add static properties
Object.assign(FileReaderMock, {
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
});

global.FileReader = FileReaderMock as any;

// Mock URL.createObjectURL
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: jest.fn(() => "blob:mock-url"),
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: jest.fn(),
});

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock import.meta for Vite - must be done before any imports
// @ts-ignore - import.meta is not available in Jest
(global as any).import = {
  meta: {
    env: {
      VITE_API_BASE_URL: "http://localhost:8000",
      VITE_ADMIN_EMAIL: "admin@example.com",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_test_mock",
      VITE_SHOW_HISTORY_PANEL: "false",
      MODE: "test",
      DEV: false,
    },
  },
};

// Mock react-markdown
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return React.createElement(
      "div",
      { "data-testid": "react-markdown" },
      children,
    );
  };
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
