# Fix Command - Problem-Solving Guidelines

## Core Principles
Fix the problem carefully. Do not break existing logic that is not relevant to the problem. Do not assume the issue is fixed until I test it and confirm it.

## Problem-Solving Approach
1. **READ THE ACTUAL CODE FIRST**
   - Use Read tool to examine the implementation (NEVER assume)
   - Quote the relevant code sections to prove you've read them
   - Explain what the code currently does based on what you see

2. **IDENTIFY THE ROOT CAUSE**
   - Analyze the specific error or issue reported
   - Trace the problem to its source before making changes
   - Understand what's broken vs what's working correctly
   - Distinguish symptoms from root cause

3. **FOCUS ON THE MINIMAL FIX**
   - Make only the necessary changes to resolve the specific issue
   - Don't refactor or "improve" unrelated code
   - Don't add features that weren't requested
   - Don't optimize code that's not part of the problem

4. **VALIDATE YOUR APPROACH**
   - Explain why your fix addresses the root cause
   - Ensure the fix doesn't introduce new problems
   - Consider edge cases and side effects
   - Test the fix logic mentally before implementing

5. **COMMUNICATE CLEARLY & WAIT FOR CONFIRMATION**
   - Explain what you changed and why
   - Provide specific testing instructions for the user
   - NEVER say "fixed", "done", or "resolved" before user confirms
   - Always say: "Changes implemented. Please verify by [steps]. Let me know if the issue persists."
   - Be ready to iterate if the fix doesn't work

## What NOT to Do
- ❌ Don't assume behavior - READ THE ACTUAL CODE with Read tool
- ❌ Don't make sweeping changes across multiple files unless absolutely necessary
- ❌ Don't add logging, debugging code, or "future-proofing" that wasn't requested
- ❌ Don't change working code that's not related to the problem
- ❌ Don't assume the problem is fixed without user confirmation
- ❌ Don't say "fixed", "done", "resolved", or "should work now" before user confirms
- ❌ Don't leave behind commented-out code or temporary solutions
- ❌ Don't create new files or major architectural changes for simple fixes
- ❌ Don't propose fixes before reading and understanding the actual code

## Success Criteria
The fix is complete when:
- The specific reported issue is resolved
- No existing functionality is broken
- The user has tested and confirmed the fix works
- The code is clean and focused on the problem
