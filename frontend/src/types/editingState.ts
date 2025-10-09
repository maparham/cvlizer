/**
 * Editing State Machine Types
 * 
 * This module defines a type-safe state machine for managing CV editing state
 * using discriminated union patterns.
 * 
 * Why a State Machine?
 * -------------------
 * Previous implementation used multiple useState calls, leading to:
 * - **Stale closure bugs**: Callbacks captured old state values
 * - **Invalid states**: Could accidentally edit section + item simultaneously
 * - **Hard to debug**: State scattered across multiple variables
 * - **AI coding issues**: Easy for AI to make mistakes with multiple related state variables
 * 
 * State Machine Solution:
 * ----------------------
 * - **Single State**: All editing state in one discriminated union
 * - **Type Safety**: TypeScript prevents invalid combinations
 * - **Explicit Transitions**: All changes via reducer actions
 * - **No Stale Closures**: Reducer always has current state
 * 
 * Type Safety Example:
 * -------------------
 * ```ts
 * const state: EditingState = { mode: 'editing_section', section: 'personal_info', hasChanges: false }
 * 
 * if (isEditingItem(state)) {
 *   // TypeScript knows: state has { section, itemIndex, itemId, hasChanges, onCancel }
 *   console.log(state.itemIndex)  // ✅ Valid
 * }
 * 
 * if (isEditingSection(state)) {
 *   // TypeScript knows: state has { section, hasChanges } but NOT { itemIndex }
 *   console.log(state.itemIndex)  // ❌ Compile error!
 * }
 * ```
 * 
 * Usage:
 * -----
 * ```ts
 * import { EditingState, EditingAction, isEditingItem } from '../types/editingState'
 * 
 * // In reducer
 * function reducer(state: EditingState, action: EditingAction): EditingState { ... }
 * 
 * // Type guards for safe property access
 * if (isEditingItem(state)) {
 *   state.onCancel()  // TypeScript knows this exists
 * }
 * ```
 */

/**
 * Editing State Machine
 * 
 * A discriminated union that represents all possible editing states.
 * TypeScript ensures only valid state combinations can exist.
 */
export type EditingState = 
  | { 
      mode: 'idle' 
    }
  | { 
      mode: 'editing_section'
      section: string
      hasChanges: boolean
    }
  | { 
      mode: 'editing_item'
      section: string
      itemIndex: number
      itemId: string
      hasChanges: boolean
      onCancel: () => void
    }
  | {
      mode: 'discarding'
      pendingChanges: string[]
      targetState: EditingState
    }

/**
 * State Machine Actions
 * 
 * All possible actions that can transition the state machine.
 * Each action is a discriminated union member.
 */
export type EditingAction =
  | { type: 'START_SECTION_EDIT', section: string }
  | { type: 'START_ITEM_EDIT', section: string, itemIndex: number, itemId: string, onCancel: () => void }
  | { type: 'UPDATE_CHANGES', hasChanges: boolean }
  | { type: 'REQUEST_DISCARD', pendingChanges: string[], targetState: EditingState }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CANCEL_DISCARD' }
  | { type: 'CLOSE' }
  | { type: 'RESET' }

/**
 * Type guards for state discrimination
 */
export const isIdle = (state: EditingState): state is Extract<EditingState, { mode: 'idle' }> =>
  state.mode === 'idle'

export const isEditingSection = (state: EditingState): state is Extract<EditingState, { mode: 'editing_section' }> =>
  state.mode === 'editing_section'

export const isEditingItem = (state: EditingState): state is Extract<EditingState, { mode: 'editing_item' }> =>
  state.mode === 'editing_item'

export const isDiscarding = (state: EditingState): state is Extract<EditingState, { mode: 'discarding' }> =>
  state.mode === 'discarding'

