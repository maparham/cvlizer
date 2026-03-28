/**
 * Reload dashboard-scoped data after the effective user identity changes
 * (e.g. admin impersonation start/end). Uses AI and CV APIs directly so
 * failures reject the promise; Zustand actions loadJobDescriptions / fetchCVs
 * swallow errors internally and must not be relied on for correctness here.
 */

import type { CV } from "../types";
import { aiService } from "../services/ai";
import { cvApi } from "../services/api";
import { useAIStore } from "../stores/ai";
import { useCVStore } from "../stores/cv";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;

/**
 * Clears AI client caches, fetches job descriptions and CVs for the current
 * effective user (including impersonation cookie), updates stores, and
 * rethrows on API failure.
 */
export async function reloadScopedDashboardDataAfterIdentityChange(): Promise<void> {
  aiService.clearAllCache();

  const [jobDescriptions, response] = await Promise.all([
    aiService.getJobDescriptions(),
    cvApi.getCVs(DEFAULT_PAGE, DEFAULT_LIMIT),
  ]);

  const cvs = response.cvs || [];
  const hasUnparsedCVs = cvs.some(
    (cv: CV) => !cv.is_parsed && !cv.parse_error,
  );

  useAIStore.setState({
    jobDescriptions,
    isJobDescriptionsLoading: false,
    hasLoadedJobDescriptions: true,
  });

  useCVStore.setState({
    cvs,
    loading: false,
    isCVsLoading: false,
    hasLoadedCVs: true,
    hasUnparsedCVs,
    error: null,
    currentPage: response.page || DEFAULT_PAGE,
    totalPages: response.pages || 1,
    totalCVs: response.total || 0,
    cvsPerPage: response.limit || DEFAULT_LIMIT,
  });

  const pollingManager = useCVStore.getState().pollingManager;
  if (hasUnparsedCVs && !pollingManager?.isActive()) {
    useCVStore.getState().startPolling();
  } else if (!hasUnparsedCVs && pollingManager?.isActive()) {
    useCVStore.getState().stopPolling();
  }
}
