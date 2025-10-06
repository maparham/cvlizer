# Job Description Test Suite

This directory contains comprehensive unit tests for the Job Description card logic in the frontend application.

## Test Structure

### Component Tests
- **`components/cv/ai/JobDescriptionSummary.test.tsx`** - Tests for the JobDescriptionSummary component
- **`components/cv/ai/JobDescriptionsModal.test.tsx`** - Tests for the JobDescriptionsModal component

### Store Tests
- **`stores/aiStore.test.ts`** - Tests for AI store selectors and job description management

### Integration Tests
- **`integration/JobDescriptionFlows.test.tsx`** - Complete user interaction flow tests

### Test Setup
- **`setup/jobDescriptionTestSetup.ts`** - Common test utilities and mocks

## Test Coverage

### JobDescriptionSummary Component Tests
- ✅ Rendering when no job descriptions exist (shows "No Job Description Yet" state)
- ✅ Rendering when job descriptions exist but none are visible in sidebar
- ✅ Rendering when active job description is selected
- ✅ "Manage" button shows correct total count of all job descriptions
- ✅ "X" button click hides job description from sidebar
- ✅ Success notification appears when hiding job description
- ✅ Edit button opens edit dialog with correct job description data
- ✅ Edit form submission updates job description and maintains active selection
- ✅ "Enhance CV" button calls onGenerateSuggestions when provided
- ✅ "Generate Job Fit Section" button calls handleGenerateJobFit
- ✅ Error handling for all operations
- ✅ Loading states during async operations
- ✅ Date formatting for different time periods
- ✅ URL handling for external links

### JobDescriptionsModal Component Tests
- ✅ Modal opens and loads all job descriptions (including hidden ones)
- ✅ Job description selection sets active job description and shows it in sidebar
- ✅ Job description selection closes modal
- ✅ Edit functionality works correctly
- ✅ Delete functionality works correctly with confirmation dialog
- ✅ URL parsing tab functionality
- ✅ Text input tab functionality
- ✅ Saved job descriptions tab shows all job descriptions normally
- ✅ Tab navigation and error clearing
- ✅ Loading states during operations
- ✅ Error handling for all operations

### AI Store Integration Tests
- ✅ useVisibleJobDescriptions selector filters out hidden job descriptions
- ✅ useActiveJobDescription returns undefined for hidden job descriptions
- ✅ hideJobDescriptionFromSidebar adds ID to hidden list and persists to localStorage
- ✅ showJobDescriptionInSidebar removes ID from hidden list and persists to localStorage
- ✅ Job description state updates trigger component re-renders
- ✅ localStorage persistence across page refreshes
- ✅ Edge cases and error handling
- ✅ Rapid state changes handling

### User Interaction Flow Tests
- ✅ Complete flow: add JD → hide from sidebar → select in modal → appears in sidebar
- ✅ Complete flow: add multiple JDs → hide some → manage count shows total
- ✅ Complete flow: edit JD in sidebar → changes persist in modal
- ✅ Error handling and recovery
- ✅ localStorage persistence across component unmounts and remounts

## Running Tests

### Run All Job Description Tests
```bash
npm test -- --testPathPattern="JobDescription|aiStore"
```

### Run Specific Test Files
```bash
# Component tests
npm test -- --testPathPattern="JobDescriptionSummary.test.tsx"
npm test -- --testPathPattern="JobDescriptionsModal.test.tsx"

# Store tests
npm test -- --testPathPattern="aiStore.test.ts"

# Integration tests
npm test -- --testPathPattern="JobDescriptionFlows.test.tsx"
```

### Run with Coverage
```bash
npm test -- --testPathPattern="JobDescription|aiStore" --coverage
```

### Run in Watch Mode
```bash
npm test -- --testPathPattern="JobDescription|aiStore" --watch
```

## Test Utilities

The test suite includes several utility functions and mocks:

- **Mock Data**: Predefined job description objects for consistent testing
- **Mock Stores**: Simulated AI store states for different scenarios
- **Mock Notifications**: Simulated notification system responses
- **Mock LocalStorage**: Simulated browser storage for persistence testing
- **Async Utilities**: Helper functions for handling asynchronous operations

## Mocking Strategy

### AI Store Mocking
- Uses Jest mocks to simulate the Zustand store
- Provides realistic state updates and side effects
- Handles localStorage persistence simulation

### Service Mocking
- Mocks the AI service for URL parsing and job description operations
- Simulates both success and error scenarios
- Provides realistic response delays for loading state testing

### Component Mocking
- Mocks Material-UI components where necessary
- Provides theme provider for consistent styling
- Handles complex component interactions

## Best Practices

### Test Organization
- Each test file focuses on a specific component or functionality
- Tests are grouped by feature and user interaction
- Clear, descriptive test names that explain the expected behavior

### Test Data
- Consistent mock data across all test files
- Realistic job description objects with proper typing
- Edge cases and error scenarios covered

### Assertions
- Comprehensive assertions that verify both UI and state changes
- Proper async/await handling for asynchronous operations
- Error state verification for robust error handling

### Maintenance
- Tests are designed to be maintainable and easy to update
- Clear separation between test setup and test execution
- Reusable utilities and mocks for consistency

## Debugging Tests

### Common Issues
1. **Async Operations**: Use `waitFor` and `act` for proper async handling
2. **State Updates**: Ensure store state is properly updated between renders
3. **Mock Functions**: Verify mock functions are called with correct parameters
4. **Component Rendering**: Check that components render with expected props

### Debug Commands
```bash
# Run with verbose output
npm test -- --testPathPattern="JobDescription" --verbose

# Run specific test with debug output
npm test -- --testPathPattern="JobDescriptionSummary" --verbose --no-coverage

# Run with Jest debug mode
npm test -- --testPathPattern="JobDescription" --detectOpenHandles
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use the provided mock utilities and test data
3. Ensure tests cover both success and error scenarios
4. Add appropriate documentation for complex test cases
5. Update this README if adding new test categories

## Test Metrics

- **Total Test Files**: 4
- **Component Tests**: 2
- **Store Tests**: 1
- **Integration Tests**: 1
- **Test Coverage**: Comprehensive coverage of all job description functionality
- **Mock Coverage**: All external dependencies properly mocked
- **Edge Cases**: Extensive edge case and error handling coverage
