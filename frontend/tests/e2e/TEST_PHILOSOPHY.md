# E2E Test Philosophy

## Natural User Flow Testing

**Core Principle**: Tests should execute in a natural sequence on one CV with shared side effects, mimicking how real users interact with the application.

## Key Guidelines

### Sequential Execution
- Tests run in order, not in parallel
- Each test builds on the state left by previous tests
- Use `test.describe.configure({ mode: 'serial' })` for test suites

### Shared State
- Create ONE CV per test suite in `beforeAll`
- Reuse the same page instance across all tests in the suite
- Allow side effects to accumulate naturally (e.g., added sections, created items)

### Realistic Scenarios
- Test workflows match actual user behavior
- Sequential operations: Create → Edit → Add sections → Fill data → Export → Delete
- Don't reset state between tests unless the user would start fresh

### Cleanup Strategy
- Only clean up open forms/dialogs between tests (close modals, escape from forms)
- Keep accumulated data (sections, items) as the next test may depend on it
- Delete test CVs only in `afterAll` cleanup

## Rationale

Real users don't:
- Create a new CV for every action
- Start from scratch after each operation
- Work in isolated, stateless environments

Real users do:
- Create one CV and work on it progressively
- Add sections incrementally
- Edit, delete, and rearrange items in sequence
- Experience accumulated state and side effects

## Anti-Patterns to Avoid

❌ Creating a new CV in every test  
❌ Resetting all state between tests  
❌ Isolated test fixtures with no shared context  
❌ Parallel execution for workflows that should be sequential  

✅ One CV per suite, shared across tests  
✅ Sequential execution with natural state progression  
✅ Minimal cleanup (only close open UI elements)  
✅ Tests build on each other's results  

