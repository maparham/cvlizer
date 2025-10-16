/**
 * Mock for import.meta.env in Jest tests
 * This file provides test values for Vite's import.meta.env
 */

export const importMetaEnv = {
  VITE_API_BASE_URL: "http://localhost:8000",
  VITE_ADMIN_EMAIL: "admin@example.com",
  VITE_CLERK_PUBLISHABLE_KEY: "pk_test_mock",
  VITE_SHOW_HISTORY_PANEL: "false",
  MODE: "test",
  DEV: false,
  PROD: false,
  SSR: false,
};

// Mock import.meta for tests
if (typeof import !== 'undefined') {
  // @ts-ignore
  import.meta = {
    env: importMetaEnv,
  };
}
