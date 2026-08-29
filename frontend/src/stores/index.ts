// Export all stores
export { useCVStore, cleanupCVStore, DEFAULT_CV_DATA, isTempCVId } from "./cv";
export { useUIStore } from "./uiStore";

// Import the stores for internal use
import { useCVStore, cleanupCVStore } from "./cv";
import { useUIStore } from "./uiStore";

// Store cleanup utilities. Authentication is handled entirely by Clerk; the
// legacy JWT/localStorage auth store was removed as unreachable dead code.
export const cleanupStores = () => {
  // Cleanup any intervals or subscriptions
  cleanupCVStore();

  // Clear any sensitive data if needed
  const uiStore = useUIStore.getState();
  uiStore.closeAllDialogs();
};

// Utility function to reset all stores (useful for logout)
export const resetAllStores = () => {
  useCVStore.setState({
    cvs: [],
    currentCV: null,
    loading: false,
    uploading: false,
    error: null,
    hasUnparsedCVs: false,
  });
  useUIStore.getState().closeAllDialogs();
};
