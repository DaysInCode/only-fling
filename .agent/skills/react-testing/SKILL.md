---
name: react-testing
description: >
  Testing strategy for React components and Next.js applications including
  unit tests with Vitest, integration tests with Cypress, component testing
  with React Testing Library, test design, validation, and test-driven development.
---

# React Testing

Tests are executable specifications of expected behavior.

Testing must happen throughout development, not only at the end.

This project uses:

- **Vitest**: Unit and component testing with jsdom
- **React Testing Library**: Component interaction testing
- **Cypress**: End-to-end and integration testing

---

# Test classification

Use the appropriate test level.

## Component Unit Test

Use component unit tests for isolated component behavior.

Run with:

```bash
npm run test:components
```

Examples:

- Component rendering with different props
- User interactions (clicks, form input)
- State changes and prop updates
- Conditional rendering
- Hook behavior
- Event handlers

Component tests should be:

- fast
- deterministic
- focused on a single component
- test user behavior, not implementation

Use React Testing Library queries:

- `getByRole()` - preferred, finds by accessibility role
- `getByLabelText()` - for form fields
- `getByText()` - for text content
- `getByPlaceholderText()` - for form inputs
- `getByDisplayValue()` - for form values
- Avoid `getByTestId()` unless no other option

---

## Integration Test

Use integration tests when correctness depends on multiple components or layers working together.

Run with:

```bash
npm run test:e2e
```

Examples:

- complete user journeys
- form submission and API integration
- authentication flows
- page navigation
- error handling across components
- API mocking and validation

Integration tests should:

- test from the user's perspective
- verify complete workflows
- validate API contracts
- test error scenarios

---

## Testing Patterns

### Component Unit Test Example

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('submits form with email and password', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<LoginForm onSubmit={onSubmit} />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('shows validation error when email is invalid', async () => {
    const user = userEvent.setup();
    
    render(<LoginForm onSubmit={vi.fn()} />);
    
    await user.type(screen.getByLabelText(/email/i), 'invalid');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
describe('Login Journey', () => {
  it('completes user registration and sign in', () => {
    cy.visit('/auth/sign-in');
    
    // Submit login form
    cy.get('input[aria-label="Email"]').type('user@example.com');
    cy.get('input[aria-label="Password"]').type('password123');
    cy.get('button').contains('Sign in').click();
    
    // Verify dashboard loads
    cy.url().should('include', '/dashboard');
    cy.get('h1').should('contain', 'Dashboard');
  });
});
```

---

# Test Organization

Organize tests alongside components:

```
components/
  account/
    settings-shell.tsx
    settings-shell.test.tsx
  auth/
    login-form.tsx
    login-form.test.tsx
```

Page tests go in:

```
app/
  account/
    account.test.tsx
    page.tsx
```

---

# Bug Fixing Workflow

Every reproducible bug should result in a regression test.

Preferred workflow:

    create component test
       ↓
    confirm test fails
       ↓
    implement fix
       ↓
    test passes
       ↓
    add integration test if needed
       ↓
    broader validation

---

# New Feature Workflow

For new component behavior:

1. Identify the observable behavior
2. Write the smallest meaningful component test
3. Confirm expected failure
4. Implement component
5. Run focused tests
6. Run all component tests
7. Add integration test coverage if needed
8. Run e2e tests
9. Manual validation

---

# Test Quality

Avoid:

- Snapshot tests (brittle, not meaningful)
- Testing implementation details
- Tests tightly coupled to DOM structure
- Over-mocking dependencies
- Tests that verify "things don't happen"

Prefer:

- Behavior-focused tests
- User-interaction tests
- Testing public component interface (props)
- Minimal, meaningful mocks
- Clear test names that describe behavior

---

# Mocking Strategy

Mock appropriately based on test scope:

**Unit Test:**

- Mock external APIs
- Mock child components only if necessary
- Use `vi.mock()` for modules

**Integration Test:**

- Mock third-party services
- Keep API mocks close to real behavior
- Use Cypress fixtures for API responses

```cypress
cy.intercept('GET', '/api/account', {
  statusCode: 200,
  body: { email: 'user@example.com' }
}).as('getAccount');

cy.visit('/account');
cy.wait('@getAccount');
```

---

# Coverage Goals

Aim for:

- Core business logic: 80%+
- Component interactions: 70%+
- UI edge cases: focus on real user scenarios
- Error paths: comprehensive coverage

Don't obsess over coverage numbers—focus on meaningful tests.
