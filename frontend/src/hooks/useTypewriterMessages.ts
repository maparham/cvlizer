/**
 * Typewriter Messages Hook
 *
 * Returns rotating messages with a typewriter animation effect.
 * Cycles through messages: typewrites each character-by-character, pauses when
 * complete, then advances to the next message.
 *
 * Used for Step 1 and Step 2 loading states in CVQualityPanel.
 */

import { useState, useEffect, useRef } from 'react';

const DEFAULT_TYPEWRITER_SPEED_MS = 33;
const DEFAULT_PAUSE_AFTER_COMPLETE_MS = 1000;

export interface UseTypewriterMessagesOptions {
  /** Delay between revealing each character (ms) */
  typewriterSpeedMs?: number;
  /** Pause duration after message is fully shown before switching (ms) */
  pauseAfterCompleteMs?: number;
  /** When false, hook resets and does not run intervals */
  isActive?: boolean;
}

/**
 * Returns text with typewriter animation cycling through the given messages.
 */
export function useTypewriterMessages(
  messages: string[],
  options: UseTypewriterMessagesOptions = {}
): string {
  const {
    typewriterSpeedMs = DEFAULT_TYPEWRITER_SPEED_MS,
    pauseAfterCompleteMs = DEFAULT_PAUSE_AFTER_COMPLETE_MS,
    isActive = true,
  } = options;

  const [messageIndex, setMessageIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMessage = messages[messageIndex % messages.length] ?? '';
  const isComplete = visibleLength >= currentMessage.length;

  useEffect(() => {
    if (!isActive || messages.length === 0) {
      setMessageIndex(0);
      setVisibleLength(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (isComplete) {
      // Clear any interval from the typewriter loop (defensive: cleanup runs on re-run, but
      // explicit clear avoids races if effect enters pause before interval callback clears itself)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Pause, then advance to next message
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setVisibleLength(0);
      }, pauseAfterCompleteMs);
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }

    // Typewriter: add one character at a time
    intervalRef.current = setInterval(() => {
      setVisibleLength((prev) => {
        const next = prev + 1;
        if (next >= currentMessage.length && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return next;
      });
    }, typewriterSpeedMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // messageIndex intentionally omitted: it's updated inside this effect via setMessageIndex.
    // Including it would cause re-run on each advance, breaking the typewriter animation flow.
    // The effect re-runs via isComplete/currentMessage.length changes when needed.
  }, [
    isActive,
    isComplete,
    currentMessage.length,
    messages.length,
    typewriterSpeedMs,
    pauseAfterCompleteMs,
  ]);

  if (!isActive || messages.length === 0) {
    return messages[0] ?? '';
  }

  return currentMessage.slice(0, visibleLength);
}
