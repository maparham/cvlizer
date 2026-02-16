/**
 * Draft History Navigation Hook
 *
 * Shared logic for deciding when to show version history navigation icons
 * (< 1/2 >) on suggestion cards. Used by useSingleSectionWritingCorrections
 * and useItemDescriptionDraftHistory.
 */

export interface UseDraftHistoryNavigationParams {
  generationsListLength: number;
  currentIndex: number;
  isCoaching: boolean;
  onBack: () => void;
  onForward: () => void;
}

export interface UseDraftHistoryNavigationResult {
  onBack: (() => void) | undefined;
  onForward: (() => void) | undefined;
  canGoBack: boolean;
  canGoForward: boolean;
  draftIndex: number;
  draftTotal: number;
}

/**
 * Returns navigation props for CompactSuggestionCard when multiple draft
 * generations exist. Hides onBack/onForward when coaching mode is off or
 * there is only one generation.
 */
export function useDraftHistoryNavigation({
  generationsListLength,
  currentIndex,
  isCoaching,
  onBack,
  onForward,
}: UseDraftHistoryNavigationParams): UseDraftHistoryNavigationResult {
  const showNav = isCoaching && generationsListLength > 1;
  const canGoBack =
    isCoaching &&
    generationsListLength > 1 &&
    currentIndex < generationsListLength - 1;
  const canGoForward =
    isCoaching && generationsListLength > 1 && currentIndex > 0;

  return {
    onBack: showNav ? onBack : undefined,
    onForward: showNav ? onForward : undefined,
    canGoBack,
    canGoForward,
    draftIndex: generationsListLength > 0 ? currentIndex + 1 : 1,
    draftTotal: generationsListLength || 1,
  };
}
