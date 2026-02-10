# Unit Tests Documentation

This document contains the documentation for the unit tests done for the current mobile app of Databus. 

> [!WARNING]
> Do NOT use this document as a way to track the coverage, the quantity, or the quality of tests in the project. It is a BAD PRACTICE to do so. Currently it is created as a way to explain the introduced tests to the project and how to run them, but this should be integrated in the README.md of the project and as a general rule to development in it.

## Running Tests

### Run all tests (watch mode)

```bash
npm run test:unit
```

### Run all tests once

```bash
npm run test:unit -- --run
```

### Run specific test file

```bash
npm run test:unit -- tests/unit/composables/useTheme.spec.ts
```

### Run with coverage

```bash
npm run test:unit -- --coverage
```

## Test Coverage

### Components
- **App.vue** - 7 tests
  - Component rendering
  - Ionic component integration
  - Router outlet configuration

- **ExploreContainer.vue** - 9 tests
  - Props rendering
  - Link attributes
  - Edge cases (empty/undefined props)

- **ThemeToggle.vue** - 6 tests
  - Component rendering
  - Icon display
  - Click interactions
  - Slot configuration

### Views
- **Tab1Page.vue** - 11 tests
  - Page structure
  - User information display
  - Theme toggle integration
  - UCR branding

- **Tab2Page.vue** - 22 tests
  - Segment navigation
  - Route/recorrido selection
  - Modal interactions
  - Button states
  - Historical view

- **Tab3Page.vue** - 10 tests
  - Page structure
  - Message page content
  - Theme toggle integration

- **Tab4Page.vue** - 28 tests
  - Profile display
  - Vehicle selection
  - Edit modal functionality
  - Form interactions
  - Data persistence

- **TabsPage.vue** - 18 tests
  - Tab bar configuration
  - Tab button rendering
  - Navigation structure
  - Icons and labels

### Composables
- **useTheme.ts** - 7 tests
  - Theme initialization
  - Theme toggling
  - localStorage persistence
  - CSS class application
  - Singleton behavior

### Router
- **Router** - 17 tests
  - Route configuration
  - Redirects
  - Navigation
  - Lazy loading
  - History mode

## Testing Framework

- **Test Runner:** Vitest (can be changed in the future if needed)
- **Component Testing:** @vue/test-utils
- **Environment:** jsdom
- **Mocking:** vi (Vitest's built-in mocking)

## Key Features Tested

1. **Theme Management**
   - Dark/light mode switching
   - Persistence across sessions
   - CSS class management

2. **Navigation**
   - Tab navigation
   - Route configuration
   - Redirects

3. **User Interface**
   - Component rendering
   - User interactions
   - Form handling
   - Modal dialogs

4. **Data Management**
   - Profile editing
   - Vehicle selection
   - Trip management

## Mocking Strategy

All tests use mocking for:
- External dependencies (Ionic components)
- Composables (useTheme)
- Router navigation
- localStorage

## Best Practices Followed

1. Descriptive test names
2. Proper setup/teardown
3. Isolated tests (no dependencies between tests)
4. Mock external dependencies
5. Test user interactions
6. Test edge cases
7. Consistent test structure

## Continuous Integration

These tests can be integrated into the CI/CD pipeline that we have. When ready to work on that, it can be added as:

```yaml
# Example GitHub Actions
- name: Run unit tests
  run: npm run test:unit -- --run
```

## Future Improvements

Consider adding:
- Code coverage reporting
- Visual regression tests
- Accessibility tests
- Performance tests
- Integration tests with API calls
