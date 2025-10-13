# Codebase Cleanup Command

## Phase 1: Pre-Cleanup Verification
1. **Run all unit tests** and ensure they pass (backend + frontend)
3. **Document current state**: Count total lines, note any known issues

## Phase 2: Systematic Cleanup (SAFETY FIRST)

### 2.1 Debug & Test Files Cleanup
- Remove `console.log`, `print()`, `debugger` statements
- Remove temporary test files and debug artifacts
- Remove commented-out code blocks
- Clean up TODO/FIXME comments (unless they're legitimate)

### 2.2 Unused Code Removal (VERIFY FIRST!)
**Before removing ANY code:**
- Search for references using grep/find
- Check if it's used in parent components
- Verify it's not part of a public API
- Look for dynamic usage (string-based references)

**Safe to remove:**
- Truly unused imports
- Dead code branches
- Unused private functions
- Unused local variables

**NEVER remove:**
- Interface/type definitions
- Props that parent components pass
- Public API methods
- Required parameters (even if unused in specific implementation)

### 2.3 Linting Error Fixes (CAREFUL APPROACH)
**For each linting error:**
1. **Identify the type:**
   - `no-unused-vars`: Check if variable is used in component body
   - `react-hooks/exhaustive-deps`: Review dependency arrays carefully
   - `no-case-declarations`: Wrap case blocks in braces
   - `no-useless-escape`: Remove unnecessary escape characters

2. **Fix strategy:**
   - **Interface parameters**: Prefix with `_` if unused in component
   - **Component parameters**: Check parent component usage first
   - **Local variables**: Remove if truly unused
   - **Hook dependencies**: Add missing deps or use useCallback/useMemo

3. **Test after each fix** to ensure no functionality breaks

### 2.4 Code Organization
- Group related imports together
- Sort imports alphabetically
- Consolidate similar utility functions
- Extract complex logic into separate functions
- Add JSDoc comments for complex functions

## Phase 3: Incremental Testing
**After EACH significant change:**
- Run relevant tests
- Build the project (frontend + backend)
- Check for TypeScript errors
- Verify no runtime errors

## Phase 4: Final Verification
1. **Run all tests** (backend + frontend)
2. **Build both projects** successfully
3. **Check for any remaining linting errors**
4. **Verify no runtime errors** in browser/console

## Phase 5: Documentation & Reporting
**Report the following:**
- Files modified (count and names)
- Lines added/removed (net change)
- Types of cleanup performed
- Any issues encountered
- Test results (before/after)

## CRITICAL SAFETY RULES
- **NEVER remove interface parameters** without checking component body usage
- **ALWAYS verify unused code** by searching for references before removal
- **Test incrementally** - don't wait until the end
- **When in doubt, DON'T remove** - it's better to leave unused code than break functionality
- **Check parent components** when removing props/parameters
- **Build frequently** to catch compilation errors early

## Success Criteria
- All tests pass
- Clean build (no errors/warnings)
- Reduced codebase size
- Improved maintainability
- No functionality broken
