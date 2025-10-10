/**
 * Shared constants for E2E tests
 * 
 * These constants ensure consistency across all E2E tests and make it easy
 * to adjust timeouts and other values globally.
 */

/**
 * Standard timeout for element visibility, navigation, and other operations.
 * Set to 5000ms (5 seconds) to account for database operations, API calls,
 * and URL navigation after CV creation. Local development can still be fast
 * but needs realistic timeouts for backend operations.
 */
export const TEST_TIMEOUT = 5000;

/**
 * Timeout for external services like Clerk authentication.
 * External services can be slower and are outside our control.
 */
export const EXTERNAL_SERVICE_TIMEOUT = 10000;

/**
 * Timeout for dashboard to refresh after navigation from editor.
 * The dashboard needs time to fetch and render updated CV list.
 */
export const DASHBOARD_REFRESH_TIMEOUT = 2000;

/**
 * Short timeout for form validation to complete.
 * Used after filling form fields to wait for validation logic to run.
 */
export const VALIDATION_WAIT = 300;

/**
 * Timeout for closing menus/dialogs with Escape key
 */
export const MENU_CLOSE_WAIT = 200;

/**
 * Test user credentials (used in global setup for authentication)
 */
export const TEST_USER = {
  email: 'mahmoud.shahrud@gmail.com',
  password: 'pNm6h@n@q@fnHFM'
} as const;

