/**
 * Clerk Authentication Type Definitions
 *
 * This module provides TypeScript interfaces for the Clerk authentication service
 * accessed via the global window object. These types ensure type safety when
 * working with Clerk's client-side SDK.
 *
 * Usage:
 * - Use ClerkWindow to type-check window.Clerk access
 * - Import these types in services that interact with Clerk
 */

/**
 * Clerk session interface with token management
 */
export interface ClerkSession {
  /**
   * Retrieve the current authentication token
   * @returns Promise that resolves to the token string or null if not authenticated
   */
  getToken(): Promise<string | null>;

  /**
   * Session ID
   */
  id: string;

  /**
   * User ID associated with the session
   */
  userId: string;

  /**
   * Session status
   */
  status: 'active' | 'expired' | 'abandoned' | 'removed';
}

/**
 * Clerk instance interface with authentication methods
 */
export interface ClerkInstance {
  /**
   * Current active session, null if not authenticated
   */
  session: ClerkSession | null;

  /**
   * Redirect user to Clerk sign-in page
   * @param options - Optional redirect options
   */
  redirectToSignIn(options?: {
    redirectUrl?: string;
    afterSignInUrl?: string;
  }): Promise<void>;

  /**
   * Redirect user to Clerk sign-up page
   * @param options - Optional redirect options
   */
  redirectToSignUp(options?: {
    redirectUrl?: string;
    afterSignUpUrl?: string;
  }): Promise<void>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Check if Clerk is loaded and ready
   */
  loaded: boolean;

  /**
   * Current user ID, null if not authenticated
   */
  user: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

/**
 * Extended Window interface with Clerk instance
 */
export interface ClerkWindow extends Window {
  /**
   * Clerk authentication instance
   * May be undefined if Clerk SDK hasn't loaded yet
   */
  Clerk?: ClerkInstance;
}

/**
 * Type guard to check if Clerk is available on window
 */
export function isClerkAvailable(win: Window): win is ClerkWindow {
  return 'Clerk' in win && win.Clerk !== undefined;
}

/**
 * Type guard to check if Clerk session is active
 */
export function hasActiveSession(clerk: ClerkInstance): boolean {
  return clerk.session !== null && clerk.session.status === 'active';
}
