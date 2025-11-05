/**
 * Custom Playwright Fixtures
 *
 * This module provides custom fixtures for E2E tests, including dynamic
 * authentication assignment based on worker index. This allows parallel
 * test execution with separate user accounts to prevent data conflicts.
 *
 * Each worker gets assigned a different user account based on project name.
 */
import { test as base } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
import { TEST_USERS } from "./test-constants";

// Custom fixture to provide current test user info based on project
type TestUserInfo = {
  email: string;
  password: string;
  displayName: string;
  userNumber: number;
};

export const test = base.extend<{ testUser: TestUserInfo }>({
  testUser: async (_, use, testInfo) => {
    // Determine user based on project name
    const projectName = testInfo.project.name;
    const isUser2 = projectName.includes("user2");
    const userNumber = isUser2 ? 2 : 1;
    const userIndex = userNumber - 1;

    const userInfo: TestUserInfo = {
      ...TEST_USERS[userIndex],
      displayName: `Test User${userNumber}`,
      userNumber,
    };

    await use(userInfo);
  },
});

// Re-export commonly used Playwright utilities and types
export { expect } from "@playwright/test";
export type { Page, Locator };

// Re-export test data
export * from "./fixtures/aiTestData";
