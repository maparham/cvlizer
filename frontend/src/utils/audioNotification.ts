/**
 * Audio Notification Utility
 *
 * Provides a simple audio notification function that plays a browser default
 * notification sound when AI responses are received.
 *
 * Features:
 * - Uses Web Audio API to generate a simple beep tone
 * - Falls back to HTML5 Audio if Web Audio API is unavailable
 * - Non-blocking implementation - failures won't affect the app
 * - Respects browser autoplay policies
 * - Shows browser tab title notification when page is hidden
 *
 * Usage:
 * - Call playAudioNotification() when AI responses are received
 * - Function is safe to call multiple times
 * - Errors are silently caught and won't interrupt the application
 */

import { setTitleNotification, isPageHidden } from "./titleNotification";

// Keep a single audio context instance to avoid suspension issues
let audioContextInstance: AudioContext | null = null;

/**
 * Gets or creates an audio context, resuming it if suspended
 */
async function getAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    if (!audioContextInstance) {
      audioContextInstance = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    // Resume context if suspended (browser autoplay policy)
    if (audioContextInstance.state === "suspended") {
      try {
        await audioContextInstance.resume();
        console.log("Audio context resumed successfully");
      } catch (err) {
        console.warn("Audio context resume failed:", err);
        return null;
      }
    }

    return audioContextInstance;
  } catch (error) {
    console.warn("Failed to create audio context:", error);
    return null;
  }
}

/**
 * Plays a single beep sound at the specified time
 */
function playSingleBeep(audioContext: AudioContext, startTime: number): void {
  // Create a simple beep tone (800Hz for 200ms)
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800; // 800Hz tone
  oscillator.type = "sine";

  // Set volume envelope (fade in/out for smoother sound)
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.2);
}

/**
 * Plays a simple beep notification sound 3 times with short delays
 * Falls back to HTML5 Audio if Web Audio API is unavailable
 */
export async function playAudioNotification(): Promise<void> {
  try {
    // Try Web Audio API first (works across browsers)
    const audioContext = await getAudioContext();
    if (audioContext && audioContext.state === "running") {
      const beepDuration = 0.2; // 200ms per beep
      const delayBetweenBeeps = 0.15; // 150ms delay between beeps
      const startTime = audioContext.currentTime;

      // Schedule all 3 beeps at once using the audio context timeline
      for (let i = 0; i < 3; i++) {
        const beepStartTime = startTime + i * (beepDuration + delayBetweenBeeps);
        playSingleBeep(audioContext, beepStartTime);
      }

      // Log for debugging
      console.log("Audio notification: Playing 3 beeps via Web Audio API", {
        state: audioContext.state,
        currentTime: audioContext.currentTime,
      });

      // Show title notification if page is hidden
      if (isPageHidden()) {
        setTitleNotification("AI response ready");
      }

      return;
    } else if (audioContext) {
      console.warn("Audio notification: Context not running, state:", audioContext.state);
    }

    // Fallback: Try HTML5 Audio with data URI (simple beep)
    if (typeof window !== "undefined" && window.Audio) {
      // Create a simple beep using a short audio data URI
      // This is a minimal WAV file (800Hz sine wave, 200ms)
      const audioData =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77+efTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBlou+/nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBAC";

      // Play 3 beeps with delays
      const playBeep = (index: number) => {
        return new Promise<void>((resolve) => {
          const audio = new Audio(audioData);
          audio.volume = 0.3;
          audio.onended = () => {
            resolve();
          };
          audio.play().catch((err) => {
            console.warn(`Audio notification: HTML5 Audio beep ${index + 1} failed:`, err);
            resolve(); // Continue even if one beep fails
          });
        });
      };

      console.log("Audio notification: Attempting HTML5 Audio fallback (3 beeps)");

      // Play 3 beeps sequentially with 150ms delay
      for (let i = 0; i < 3; i++) {
        await playBeep(i);
        if (i < 2) {
          // Wait 150ms before next beep (except after the last one)
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      // Show title notification if page is hidden
      if (isPageHidden()) {
        setTitleNotification("AI response ready");
      }
      return;
    }

    console.warn("Audio notification: No audio API available");
  } catch (error) {
    console.error("Audio notification: Error playing sound:", error);
  }
}

/**
 * Unlocks audio by resuming the audio context on first user interaction
 * Call this once when the app loads to prepare audio for later use
 */
export function unlockAudio(): void {
  if (typeof window === "undefined") {
    return;
  }

  const unlock = async () => {
    const context = await getAudioContext();
    if (context && context.state === "suspended") {
      try {
        await context.resume();
        console.log("Audio unlocked on user interaction");
      } catch (err) {
        console.warn("Failed to unlock audio:", err);
      }
    }
  };

  // Try to unlock on any user interaction
  const events = ["click", "touchstart", "keydown"];
  const handlers: (() => void)[] = [];

  events.forEach((event) => {
    const handler = () => {
      unlock();
      // Remove all handlers after first interaction
      handlers.forEach((h) => {
        document.removeEventListener(event, h);
      });
    };
    handlers.push(handler);
    document.addEventListener(event, handler, { once: true });
  });
}
