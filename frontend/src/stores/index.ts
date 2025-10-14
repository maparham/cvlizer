// Export all stores
export { useAuthStore } from "./authStore";
export { useCVStore, cleanupCVStore } from "./cvStore";
export { useUIStore, useNotifications } from "./uiStore";

// Import the stores for internal use
import { useAuthStore } from "./authStore";
import { useCVStore, cleanupCVStore } from "./cvStore";
import { useUIStore } from "./uiStore";

// Re-export types for convenience
// Note: AuthState is not exported from authStore, so we'll remove this

// Store initialization and cleanup utilities
export const initializeStores = async () => {
  // Initialize auth state by verifying token
  const authStore = useAuthStore.getState();
  if (localStorage.getItem("access_token")) {
    await authStore.verifyToken();
  }
};

export const cleanupStores = () => {
  // Cleanup any intervals or subscriptions
  cleanupCVStore();

  // Clear any sensitive data if needed
  const uiStore = useUIStore.getState();
  uiStore.clearNotifications();
  uiStore.closeAllDialogs();
};

// Utility function to reset all stores (useful for logout)
export const resetAllStores = () => {
  useAuthStore.getState().logout();
  useCVStore.setState({
    cvs: [],
    currentCV: null,
    loading: false,
    uploading: false,
    error: null,
    hasUnparsedCVs: false,
  });
  useUIStore.getState().clearNotifications();
  useUIStore.getState().closeAllDialogs();
};
