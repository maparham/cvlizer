/**
 * Mock constants for Jest tests
 * This file mocks the actual constants.ts to avoid import.meta.env issues in Jest
 */

export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const POLLING_CONFIG = {
  INTERVAL: 2000,
  MAX_ATTEMPTS: 30,
  TIMEOUT: 60000,
};

export const CLERK_CONFIG = {
  PUBLISHABLE_KEY: 'pk_test_mock',
};

export const APP_CONFIG = {
  ADMIN_EMAIL: 'admin@example.com',
  SHOW_HISTORY_PANEL: false,
};
