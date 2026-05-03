/**
 * Shared dismissal lifecycle helpers for suggestion-like store state.
 *
 * These utilities provide a consistent optimistic flow:
 * 1) compute next local state
 * 2) apply it immediately for responsive UI
 * 3) persist (or delete) in backend
 * 4) rollback local state if backend sync fails
 */

export interface DismissWithRollbackConfig<TState> {
  currentState: TState | null | undefined;
  updateFn: (state: TState) => TState;
  setStateFn: (state: TState) => void;
  checkEmptyFn: (state: TState) => boolean;
  deleteFn: () => Promise<void>;
  persistFn?: (state: TState) => Promise<void>;
  onError?: (error: unknown) => void;
  rethrowOnError?: boolean;
}

/**
 * Execute optimistic dismissal lifecycle with rollback semantics.
 */
export async function dismissWithRollback<TState>(
  config: DismissWithRollbackConfig<TState>,
): Promise<void> {
  const {
    currentState,
    updateFn,
    setStateFn,
    checkEmptyFn,
    deleteFn,
    persistFn,
    onError,
    rethrowOnError = false,
  } = config;

  if (!currentState) {
    return;
  }

  const previousState = currentState;
  const updatedState = updateFn(currentState);

  // Optimistic state update for immediate UI response.
  setStateFn(updatedState);

  try {
    if (checkEmptyFn(updatedState)) {
      await deleteFn();
      return;
    }

    if (persistFn) {
      await persistFn(updatedState);
    }
  } catch (error) {
    setStateFn(previousState);
    if (onError) {
      onError(error);
    }
    if (rethrowOnError) {
      throw error;
    }
  }
}
