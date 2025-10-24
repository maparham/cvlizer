# Debug Command - Strict Root Cause Analysis

When you receive `/debug [issue description]`, you MUST enter **strict debugging mode** with the following mandatory steps.

## 🚨 CRITICAL: No Fixes Until Root Cause Found

**You are FORBIDDEN from proposing ANY fix until you complete ALL debugging steps below.**

## Mandatory Debugging Protocol

### Step 1: Read Actual Code (REQUIRED)
- ❌ FORBIDDEN: Assuming behavior based on file names, patterns, or conventions
- ✅ REQUIRED: Use Read tool to examine the actual implementation
- ✅ REQUIRED: Quote the relevant code sections in your response

**Response format:**
```
**Step 1: Code Examination**
- [x] Read actual code at: [file:line-range]
- [x] Current implementation:
      ```[language]
      [quoted code showing actual implementation]
      ```
- [x] What this code does: [explain behavior based on what you see]
```

### Step 2: Reproduce & Trace (REQUIRED)
- Understand the exact conditions that trigger the issue
- Trace the execution flow step-by-step
- Identify what state/data exists at each step

**Response format:**
```
**Step 2: Flow Analysis**
- [x] Trigger conditions: [what causes the issue]
- [x] Execution flow:
      1. [User action/input]
      2. [System response]
      3. [Where it fails]
- [x] State at failure: [what data/state exists when error occurs]
```

### Step 3: Identify Root Cause (REQUIRED)
- Pinpoint the SPECIFIC line(s) of code causing the issue
- Distinguish root cause from symptoms
- Explain WHY the code fails (not just WHAT fails)

**Response format:**
```
**Step 3: Root Cause Identification**
- [x] Root cause location: [file:line]
- [x] Problematic code:
      ```[language]
      [exact code that's broken]
      ```
- [x] Why it fails: [explanation of the underlying issue]
- [x] Symptoms vs cause: [what user sees vs what's actually broken]
```

### Step 4: Ask Clarifying Questions (IF NEEDED)
- If anything is unclear about the issue, ASK before proceeding
- If you need logs, screenshots, or reproduction steps, REQUEST them
- If multiple possible root causes exist, DISCUSS them with the user

**Response format:**
```
**Step 4: Clarification Needed**
I need the following information before proposing a fix:
1. [question 1]
2. [question 2]
3. [what would help narrow down the issue]
```

### Step 5: Propose Minimal Fix (ONLY AFTER STEPS 1-4)
- Now and ONLY now, propose the smallest possible fix
- Explain why this fix addresses the root cause
- List any potential side effects
- Provide specific verification steps

**Response format:**
```
**Step 5: Proposed Minimal Fix**
- [x] Change required: [describe exact change]
- [x] Why this fixes root cause: [explanation]
- [x] Potential side effects: [list any concerns or "none anticipated"]
- [x] Files to modify:
      - [file:line] - [what to change]
```

## Verification Requirements (NEVER SKIP)

After implementing the fix, you MUST:

1. **NEVER claim "fixed", "resolved", "done", or "should work now"**
2. **ALWAYS provide specific verification steps**
3. **WAIT for user confirmation**

**Required closing statement:**
```
**Verification Required**

Changes implemented based on root cause analysis. Please verify by:
1. [specific test step 1]
2. [specific test step 2]
3. [expected result]

Let me know if:
- The issue persists
- You see any new problems
- The behavior is different than expected

I'll be ready to iterate based on your feedback.
```

## Anti-Patterns Explicitly Forbidden

You MUST NOT:
- ❌ Skip reading the actual code
- ❌ Assume behavior based on naming or patterns
- ❌ Apply "common solutions" without understanding specifics
- ❌ Propose fixes before completing Steps 1-4
- ❌ Make blanket/global changes when the issue is localized
- ❌ Add "defensive" fixes without understanding the actual problem
- ❌ Claim the issue is fixed before user confirms

## Success Criteria

You've successfully completed `/debug` when:
- ✅ You've read and quoted the actual problematic code
- ✅ You've identified the specific root cause (not symptoms)
- ✅ You've proposed a minimal, targeted fix
- ✅ You've provided clear verification steps
- ✅ You're waiting for user confirmation (not claiming "fixed")

---

**Remember: This is STRICT debugging mode. Take your time. Be thorough. Don't rush to solutions.**
