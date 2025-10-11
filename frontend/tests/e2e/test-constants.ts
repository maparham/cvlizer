/**
 * Shared constants for E2E tests
 * 
 * These constants ensure consistency across all E2E tests and make it easy
 * to adjust timeouts and other values globally.
 */

/**
 * Standard timeout for element visibility, navigation, and other operations.
 * Reduced to 3000ms (3 seconds) for faster test execution while still
 * accounting for database operations, API calls, and URL navigation.
 * Local development is fast enough to support this reduced timeout.
 */
export const TEST_TIMEOUT = 3000;

/**
 * Timeout for external services like Clerk authentication.
 * Reduced to 7000ms as authentication is generally fast in test environment.
 */
export const EXTERNAL_SERVICE_TIMEOUT = 7000;

/**
 * Timeout for dashboard to refresh after navigation from editor.
 * Reduced to 1000ms as the dashboard refresh is a fast operation.
 */
export const DASHBOARD_REFRESH_TIMEOUT = 1000;

/**
 * Short timeout for form validation to complete.
 * Reduced to 100ms as validation is synchronous and immediate.
 */
export const VALIDATION_WAIT = 100;

/**
 * Timeout for closing menus/dialogs with Escape key
 */
export const MENU_CLOSE_WAIT = 200;

/**
 * Test user credentials (used in global setup for authentication)
 * Multiple users to support parallel test execution with separate data
 */
export const TEST_USERS = [
  {
    email: 'mahmoud.shahrood+testuser1@gmail.com',
    password: 'pNm6h@n@q@fnHFM'
  },
  {
    email: 'mahmoud.shahrood+testuser2@gmail.com',
    password: 'pNm6h@n@q@fnHFM'
  }
] as const;

// Backward compatibility - default to first user
export const TEST_USER = TEST_USERS[0];

