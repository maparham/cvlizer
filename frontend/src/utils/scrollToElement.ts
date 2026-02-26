/**
 * Scroll a target element into view inside a scroll container and apply a temporary highlight.
 * Used by SuggestionsSidebar for job-fit and quality nav click-to-scroll.
 */

const DEFAULT_SCROLL_CONTAINER_SELECTOR = "[data-scrollable-container]";

export interface ScrollToElementOptions {
  /** When true, use a softer highlight (e.g. when scrolling to section/item fallback instead of exact card). */
  isFallback?: boolean;
  /** DOM selector for the scrollable container. Defaults to data-scrollable-container. */
  scrollContainerSelector?: string;
}

/** Ref-like object to hold timeout IDs so the caller can clear them on unmount or before next scroll. */
export interface TimeoutIdsRef {
  current: ReturnType<typeof setTimeout>[];
}

/**
 * Scrolls the scroll container so targetElement is centered, then applies a temporary
 * background highlight that fades after 1s. Mutates timeoutIdsRef.current to track
 * timeouts for cleanup.
 *
 * @param targetElement - Element to scroll into view and highlight
 * @param options - isFallback (softer highlight) and optional scrollContainerSelector
 * @param timeoutIdsRef - Ref to array of timeout IDs; cleared at start, new IDs pushed for cleanup
 * @returns false if scroll container not found, true otherwise
 */
export function scrollToAndHighlight(
  targetElement: HTMLElement,
  options: ScrollToElementOptions | undefined,
  timeoutIdsRef: TimeoutIdsRef
): boolean {
  const selector =
    options?.scrollContainerSelector ?? DEFAULT_SCROLL_CONTAINER_SELECTOR;
  const scrollContainer = document.querySelector(selector) as HTMLElement;
  if (!scrollContainer) {
    return false;
  }

  timeoutIdsRef.current.forEach((id) => clearTimeout(id));
  timeoutIdsRef.current = [];

  const containerRect = scrollContainer.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const relativeTop = targetRect.top - containerRect.top;
  const currentScrollTop = scrollContainer.scrollTop;
  const containerHeight = scrollContainer.clientHeight;
  const targetHeight = targetElement.clientHeight;
  const targetScrollTop =
    currentScrollTop + relativeTop - containerHeight / 2 + targetHeight / 2;

  scrollContainer.scrollTo({ top: targetScrollTop, behavior: "smooth" });

  const originalTransition = targetElement.style.transition;
  const originalBackground = targetElement.style.backgroundColor;
  targetElement.style.transition = "background-color 1s ease-in-out";
  targetElement.style.backgroundColor =
    options?.isFallback === true
      ? "rgba(158, 158, 158, 0.25)"
      : "rgba(25, 118, 210, 0.2)";

  const timeoutId1 = setTimeout(() => {
    if (targetElement && document.contains(targetElement)) {
      targetElement.style.backgroundColor = "transparent";
      const timeoutId2 = setTimeout(() => {
        if (targetElement && document.contains(targetElement)) {
          targetElement.style.transition = originalTransition;
          targetElement.style.backgroundColor = originalBackground;
        }
        timeoutIdsRef.current = timeoutIdsRef.current.filter(
          (id) => id !== timeoutId2
        );
      }, 1000);
      timeoutIdsRef.current.push(timeoutId2);
    }
    timeoutIdsRef.current = timeoutIdsRef.current.filter(
      (id) => id !== timeoutId1
    );
  }, 1000);
  timeoutIdsRef.current.push(timeoutId1);

  return true;
}
