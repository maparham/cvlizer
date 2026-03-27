/**
 * useDebouncedCallback
 *
 * Reusable debounce hook that returns a stable callback. The callback is
 * invoked only after the specified delay has passed since the last call.
 * Useful for validation, search, or any expensive operation triggered by
 * rapid user input.
 */

import { useCallback, useEffect, useRef } from "react";

export interface UseDebouncedCallbackOptions {
  /** Delay in milliseconds before invoking the callback */
  delayMs: number;
  /** When true, the callback will not be invoked */
  disabled?: boolean;
}

/**
 * Returns a debounced version of the given callback. The callback is invoked
 * only after `delayMs` of inactivity. If the component unmounts or the callback
 * changes before the delay, the pending invocation is cancelled.
 *
 * @param callback - The function to debounce (receives latest args)
 * @param options - { delayMs, disabled? }
 * @returns Debounced callback with same signature as the original
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebouncedCallbackOptions,
): T {
  const { delayMs, disabled = false } = options;
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const argsRef = useRef<Parameters<T> | null>(null);

  callbackRef.current = callback;

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (argsRef.current !== null) {
      const args = argsRef.current;
      argsRef.current = null;
      callbackRef.current(...args);
    }
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;
      if (disabled) return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delayMs);
    },
    [delayMs, disabled, flush],
  ) as T;

  // Cancel pending timeouts when disabled becomes true
  useEffect(() => {
    if (disabled && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      argsRef.current = null;
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return debounced;
}
