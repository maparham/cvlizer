import { Page } from '@playwright/test';

/**
 * Authentication helper functions for E2E tests
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Default test user credentials
 */
export const DEFAULT_TEST_USER: LoginCredentials = {
  email: 'mahmoud.shahrud@gmail.com',
  password: 'pNm6h@n@q@fnHFM'
};

/**
 * Performs user login with the provided credentials
 * @param page - Playwright page object
 * @param credentials - User credentials (defaults to DEFAULT_TEST_USER)
 */
export async function loginUser(
  page: Page, 
  credentials: LoginCredentials = DEFAULT_TEST_USER
): Promise<void> {
  // Navigate to login if not already there
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Fill in credentials
  await page.getByLabel('Email Address *').fill(credentials.email);
  await page.getByLabel('Email Address *').press('Tab');
  await page.getByLabel('Password *').fill(credentials.password);
  
  // Submit form
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Wait for successful login (you might want to wait for a specific element that indicates successful login)
  // For example: await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
}

/**
 * Checks if user is already logged in
 * @param page - Playwright page object
 * @returns Promise<boolean> - true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for elements that only appear when logged in
    // This would need to be adapted based on your actual UI
    const editButton = await page.getByRole('button', { name: 'Edit' }).isVisible();
    return editButton;
  } catch {
    return false;
  }
}

/**
 * Ensures user is logged in, performs login if needed
 * @param page - Playwright page object
 * @param credentials - User credentials (defaults to DEFAULT_TEST_USER)
 */
export async function ensureLoggedIn(
  page: Page,
  credentials: LoginCredentials = DEFAULT_TEST_USER
): Promise<void> {
  const alreadyLoggedIn = await isLoggedIn(page);
  
  if (!alreadyLoggedIn) {
    await loginUser(page, credentials);
  }
}
