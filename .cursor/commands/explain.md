### Debugging Command Guidance

STRICT MODE: This command is read-only. Do not change code, configuration, data, or runtime state. Do not propose or include code in the output.

- **Goal**: Understand the problem, investigate root cause, and present a concise, confirmable diagnosis.
- **Output format (MANDATORY)**: Short, skimmable bullets using the structure below. No code blocks, no stack traces, no raw diffs. Summaries only.
- **Scope limits (MANDATORY)**:
  - Do not make any changes (no edits, no data mutations, no restarts)
  - Do not write or propose code (no code blocks, no code references)
  - Do not run long-lived commands; use only quick, non-invasive checks

### How to proceed
- **Understand the problem**
  - Identify the feature or flow affected.
  - Note the expected behavior vs. the actual behavior.
  - Capture when it occurs (steps to reproduce, frequency, environment).

- **Collect minimal evidence**
  - Reproduce locally if possible; record precise steps.
  - Gather relevant logs, error messages, and screenshots (if applicable).
  - Note recent changes or deployments that might correlate.
  - Summarize findings — do not paste raw logs or code.

- **Investigate the root cause**
  - Trace the flow end-to-end to locate where behavior diverges.
  - Isolate the failing component (UI, API, service, data, config).
  - Validate assumptions with quick, non-invasive checks (no code changes).
  - If referencing code is necessary, describe locations in words (e.g., "the summary section component doesn’t receive cvId") — do not include code snippets or file dumps.

- **Report succinct findings (bullets)**
  - Problem: one line describing the issue.
  - Impact: who/what is affected.
  - Repro: numbered steps (short) and environment.
  - Evidence: key logs/errors with brief context (summarized, no raw dumps).
  - Root cause: concise statement of the underlying issue.
  - Next steps: brief recommendations without code.

- **Explicitly avoid**
  - Making any code or configuration changes.
  - Writing or proposing code in the output.
  - Broad refactors or speculative fixes.

### Output formatting rules (MANDATORY)
- Keep it to concise bullet points with short phrases or one-liners.
- No code blocks, no inline code, no stack traces, no file dumps.
- Refer to files/components by name only (e.g., "Professional Summary section"), not by code excerpts.
- If a link or ID is necessary, keep it minimal and contextual.

### Handoff to implementation
- After delivering the debug report, STOP. Await explicit user approval before making any edits or posting code.
- Only upon approval, switch to implementation mode in a separate message.


