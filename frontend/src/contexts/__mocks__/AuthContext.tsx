/**
 * Mock AuthContext for Jest tests
 */

import React from "react";

export const useAuth = jest.fn(() => ({
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: "test-user-id",
    primaryEmailAddress: { emailAddress: "test@example.com" },
  },
  userId: "test-user-id",
}));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;
