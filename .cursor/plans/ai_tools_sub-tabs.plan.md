# AI Tools sub-tabs plan (updated)

## Overview

Add horizontal sub-tabs under the AI Tools tab so each of the three actions (Fix spelling and grammar, Improve writing style, Enhance CV for this Job) lives in its own sub-tab. **Each AI button can be triggered independently** (no dependency of Step 2 or 3 on Step 1’s score). **Remove all "Step i" wording** everywhere—use action-only labels. CV Quality Score only in the first sub-tab; shared content (JD, Clear all, suggestions, Discard-all) stays below the sub-tabs; default sub-tab is the first one.

**Do not write tests.** Do not leave legacy code behind: remove every prop, constant, and copy that becomes unused (e.g. `proofreadGateActive`, step-number prefixes, "Complete steps in order").

## Current structure

- [SectionManagerSidebar.tsx](frontend/src/components/cv/core/SectionManagerSidebar.tsx): Top-level tabs **Sections** (0) | **AI Tools** (1). When `activeTab === 1`, it renders `CVEditionSidebarContent`.
- [CVEditionSidebarContent.tsx](frontend/src/components/cv/core/CVEditionSidebarContent.tsx): Single column with `CVQualityPanel` (score + three buttons), then `JobDescriptionSummary`, "Clear all suggestions", `SuggestionsSidebar`, and Discard-all Alert.
- [CVQualityPanel.tsx](frontend/src/components/cv/ai/CVQualityPanel.tsx): Renders CV Quality Score, "Complete steps in order...", a `Stack` of three buttons (`StepButton` x2, `Step3Button` x1), and analysis error Alert. Currently Step 2 is disabled when `proofreadGateActive || overallScore === null`; Step 3 is disabled when `proofreadGateActive || overallScore === null` (and other conditions).
- [Step3Button.tsx](frontend/src/components/cv/ai/Step3Button.tsx): Uses `proofreadGateActive` and `overallScore === null` in tooltip and `isStep3Disabled`; label "Step 3: Enhance CV for this Job".
- [StepButton.tsx](frontend/src/components/cv/ai/StepButton.tsx): Used for first two actions; labels use "Step 1: ..." / "Step 2: ...", and loading prefix (e.g. STEP1_PREFIX).
- Tab index for the main sidebar is stored in [uiStore.ts](frontend/src/stores/uiStore.ts) as `cvEditorTabs: Record<string, number>` (keyed by `cvId`).

## Target structure

- **AI Tools** tab content becomes:
  1. **Horizontal sub-tabs** with action-only labels: **Fix spelling and grammar** | **Improve writing style** | **Enhance CV for this Job** (no "Step 1", "Step 2", "Step 3").
  2. **Sub-tab content**:
     - **First sub-tab (proofread)**: CV Quality Score + first action button only + analysis error Alert (when present). Score chip label when no score yet: e.g. "Run to get your score" (no "Step 1").
     - **Second sub-tab (coaching)**: Second action button only + analysis error Alert (when present).
     - **Third sub-tab (enhance for job)**: Third action button only (no score, no proofread/score gating).
  3. **Shared block below** (unchanged): JobDescriptionSummary, "Clear all suggestions", SuggestionsSidebar, Discard-all Alert.

**Independence of actions**: Step 2 and Step 3 are not disabled or gated on Step 1’s score or proofread gate. Remove `proofreadGateActive` and `overallScore === null` from disabling/tooltip logic for the second and third actions. Only keep:
- Disable when **any** of the three actions is loading (`anyStepLoading`) to avoid overlapping runs, if desired (or allow concurrent runs—clarify with product).
- Step 3 still disabled when no job selected, completeness missing, parsing, or countdown (no change to those).

Default sub-tab when opening AI Tools: first sub-tab (index 0). Sub-tab index stored per CV in UI store; initial/default is 0.

## Implementation steps

### 1. Sub-tab state in UI store

- **File**: [frontend/src/stores/uiStore.ts](frontend/src/stores/uiStore.ts)
- Add `cvEditorAIToolsSubTab: Record<string, number>` (per-cvId sub-tab index 0/1/2).
- Add `setCVEditorAIToolsSubTab: (cvId: string, subTabIndex: number) => void` and `getCVEditorAIToolsSubTab: (cvId: string) => number` (default `0` when key missing).
- Include `cvEditorAIToolsSubTab` in persist and in `reset`.

### 2. Sub-tabs and content in CVEditionSidebarContent

- **File**: [frontend/src/components/cv/core/CVEditionSidebarContent.tsx](frontend/src/components/cv/core/CVEditionSidebarContent.tsx)
- Read/write sub-tab from store: `getCVEditorAIToolsSubTab(cvId)`, `setCVEditorAIToolsSubTab(cvId, index)`.
- Add horizontal MUI `Tabs` with three `Tab` labels: **"Fix spelling and grammar"**, **"Improve writing style"**, **"Enhance CV for this Job"** (no "Step i").
- Render content by sub-tab index: `<CVQualityPanel ... subTabIndex={0|1|2} />` for the three panels; shared block below unchanged.

### 3. CVQualityPanel: sub-tab index and no "Step i" wording

- **File**: [frontend/src/components/cv/ai/CVQualityPanel.tsx](frontend/src/components/cv/ai/CVQualityPanel.tsx)
- Add prop `subTabIndex: 0 | 1 | 2` (default `0`).
- **Remove Step 2/3 dependency on score**: Do not pass `proofreadGateActive` or score-based disabling for the second and third actions. Second button disabled only by `anyStepLoading` (and its own loading state). Third button disabled only by Step3’s existing non-score conditions (no job, completeness, parsing, countdown, anyStepLoading).
- **Score + instructional text**: Only when `subTabIndex === 0`. Chip when no score: e.g. "Run to get your score" (remove "Run Step 1 to get your score"). Remove or reword "Complete steps in order for best results" so it doesn’t imply ordering (e.g. remove it or say "Use any tool below").
- **Labels**: First button label "Fix spelling and grammar" (no "Step 1: "). Second "Improve writing style" (no "Step 2: "). Use loading suffix only for the animated part (e.g. "Checking spelling", "Analyzing style") without a "Step i: " prefix in the UI.
- **StepButton** (used for first two): Accept a `label` and a loading display that does not include "Step i: " (e.g. `stepPrefix` can be empty or the first part of the action name for min-width only). Ensure `StepButton` docstring/usage no longer says "Step 1" / "Step 2".
- **Analysis error Alert**: Show when `subTabIndex === 0` or `subTabIndex === 1` (analysis applies to first two actions).

### 4. Step3Button: independence and wording

- **File**: [frontend/src/components/cv/ai/Step3Button.tsx](frontend/src/components/cv/ai/Step3Button.tsx)
- **Remove score/gate dependency**: Remove `proofreadGateActive` and `overallScore === null` from `isStep3Disabled` and from tooltip text (remove "Run Step 1 to activate this").
- **Label**: "Enhance CV for this Job" (remove "Step 3: ").
- **Props**: Drop `proofreadGateActive` and `overallScore` from `Step3ButtonProps` and from `getStep3TooltipTitle` / `isStep3Disabled`; keep `hasActiveJob`, `completeness`, `anyStepLoading`, `isParsing`, `countdownSeconds`.

### 5. StepButton: remove "Step i" from labels and loading

- **File**: [frontend/src/components/cv/ai/StepButton.tsx](frontend/src/components/cv/ai/StepButton.tsx)
- Support label without "Step i: " and loading text without that prefix (e.g. optional `stepPrefix` or pass full label and loading suffix only). Used by CVQualityPanel with labels "Fix spelling and grammar" and "Improve writing style"; loading can show e.g. "Checking spelling…" / "Analyzing style…" without "Step 1: " / "Step 2: ".

### 6. SuggestionsSidebar / callers of CVQualityPanel

- **File**: [frontend/src/components/cv/ai/SuggestionsSidebar.tsx](frontend/src/components/cv/ai/SuggestionsSidebar.tsx) (and any other callers): Remove `proofreadGateActive` prop and its pass-through to `CVQualityPanel`. Remove any "Step i" copy.

### 7. No legacy code: remove unused props and wiring

Remove the following so no legacy code remains:

- **SectionManagerSidebar**: Remove computation of `isProofreadGateActive` and the `proofreadGateActive={isProofreadGateActive}` prop passed to `CVEditionSidebarContent`.
- **CVEditionSidebarContent**: Remove `proofreadGateActive` from the props interface and from all usages (no longer pass to `CVQualityPanel` or `SuggestionsSidebar`).
- **CVQualityPanel**: Remove `proofreadGateActive` from props and from all logic (`showGateInfoIcon`, Step 2 disabled condition, Step3Button props). Remove constants `STEP1_PREFIX` / `STEP2_PREFIX` and any "Step i" prefix from loading display. Remove the "Complete steps in order for best results" line (or replace with non-ordering copy once; do not leave the old line).
- **Step3Button**: Remove `proofreadGateActive` and `overallScore` from props, `getStep3TooltipTitle`, and `isStep3Disabled`; remove tooltip branch that says "Run Step 1 to activate this."
- **SuggestionsSidebar**: Remove `proofreadGateActive` from props and from the `CVQualityPanel` call (and from internal state if it only existed for that).
- **StepButton**: Remove or repurpose `stepPrefix` so no "Step i: " appears; update docstring. Remove any step-number references from comments/labels.

Do not add or keep deprecated props "for backward compatibility." Delete unused code.

## Summary of dependency and wording changes

| Location | Change |
|----------|--------|
| CVQualityPanel | Step 2 not disabled by `proofreadGateActive` or `overallScore === null`; only `anyStepLoading` (and own loading). Remove "Step 1/2/3" from labels and chip; remove "Complete steps in order"; optional reword for score chip when null. |
| Step3Button | Remove `proofreadGateActive` and `overallScore` from props and from `isStep3Disabled` / tooltip; label "Enhance CV for this Job". |
| StepButton | Labels and loading text without "Step i: " prefix. |
| Sub-tab labels | "Fix spelling and grammar" \| "Improve writing style" \| "Enhance CV for this Job". |
| CVEditionSidebarContent | Sub-tabs with above labels; pass `subTabIndex`; no "Step i" in UI. |

## Files to touch

| File | Change |
|------|--------|
| [frontend/src/stores/uiStore.ts](frontend/src/stores/uiStore.ts) | Add `cvEditorAIToolsSubTab`, setter, getter; persist and reset |
| [frontend/src/components/cv/core/SectionManagerSidebar.tsx](frontend/src/components/cv/core/SectionManagerSidebar.tsx) | Remove `isProofreadGateActive` and `proofreadGateActive` prop to CVEditionSidebarContent |
| [frontend/src/components/cv/core/CVEditionSidebarContent.tsx](frontend/src/components/cv/core/CVEditionSidebarContent.tsx) | Horizontal sub-tabs with action-only labels; render `CVQualityPanel` with `subTabIndex`; remove `proofreadGateActive` from props and usages; keep shared block below |
| [frontend/src/components/cv/ai/CVQualityPanel.tsx](frontend/src/components/cv/ai/CVQualityPanel.tsx) | `subTabIndex` prop; conditional score/text/buttons/error; no score-gating for second button; remove all "Step i" labels and wording; remove `proofreadGateActive` and related logic/constants |
| [frontend/src/components/cv/ai/Step3Button.tsx](frontend/src/components/cv/ai/Step3Button.tsx) | Remove `proofreadGateActive` and `overallScore`; label "Enhance CV for this Job"; update tooltip/disable logic |
| [frontend/src/components/cv/ai/StepButton.tsx](frontend/src/components/cv/ai/StepButton.tsx) | Support labels and loading without "Step i: " prefix; remove step-number references |
| [frontend/src/components/cv/ai/SuggestionsSidebar.tsx](frontend/src/components/cv/ai/SuggestionsSidebar.tsx) | Remove `proofreadGateActive` from props and from CVQualityPanel call |
