---
name: frontend-debugging
description: >
  Systematic debugging workflow for diagnosing failing tests, runtime errors,
  unexpected behavior, build failures, and rendering issues in React and
  Next.js applications.
---

# Frontend Debugging

Debugging is an investigation, not trial-and-error editing.

## Workflow

    OBSERVE
       ↓
    REPRODUCE
       ↓
    ISOLATE
       ↓
    HYPOTHESIZE
       ↓
    TEST HYPOTHESIS
       ↓
    FIX ROOT CAUSE
       ↓
    REGRESSION TEST
       ↓
    VALIDATE

---

# Observe

Collect:

- error messages and stack traces
- console warnings and errors
- failing tests (unit or e2e)
- browser DevTools output
- network requests and responses
- component props and state
- actual vs expected behavior
- reproduction steps
- environment information

Check:

- browser console for errors
- terminal output for build issues
- network tab for API failures
- React DevTools for component tree
- Vitest output for test failures

Do not assume the first error is the root cause.

---

# Reproduce

Create the smallest reliable reproduction:

For component issues:

- Isolate to a single component
- Create a minimal test case
- Document exact steps

For tests:

- Run the failing test in isolation
- Add console logs if needed
- Use test debugging features

```bash
npm run test:components -- --reporter=verbose path/to/test.test.tsx
```

For e2e issues:

```bash
npm run test:e2e -- --headed --spec path/to/spec.cy.ts
```

For dev server issues:

```bash
npm run dev
# Open browser DevTools
```

---

# Isolate

Determine which layer contains the defect:

- **Component logic**: State, handlers, side effects
- **Props/Interface**: Wrong props passed, type mismatch
- **API Integration**: Fetch failure, wrong data structure
- **Routing**: Navigation not working, wrong page loading
- **Build**: Compilation error, configuration issue
- **Testing**: Test setup, mocking, assertion
- **Environment**: Missing env vars, wrong config
- **Dependencies**: Version mismatch, import issue

For component issues, check:

```tsx
// Add debug logging
console.log('Component props:', props);
console.log('Component state:', state);
console.log('Effect dependencies:', [deps]);

// Use React DevTools to inspect
// Props tab
// Hooks tab
// Render why re-rendered
```

For state issues:

```tsx
// Check initial state
console.log('Initial state:', state);

// Check state updates
const handleClick = () => {
  setCount(prev => {
    console.log('Old state:', prev, 'New state:', prev + 1);
    return prev + 1;
  });
};
```

For effect issues:

```tsx
useEffect(() => {
  console.log('Effect ran, dependencies:', [dep1, dep2]);
  
  return () => {
    console.log('Cleanup ran');
  };
}, [dep1, dep2]);
```

---

# Hypothesis

State the most likely cause before making changes:

Examples:

- "The component re-renders on every keystroke because the dependency array is missing"
- "The API call fails because the token is not being sent in the header"
- "The test fails because the mock is returning the wrong shape"
- "The page is blank because the data fetch is throwing an error that's not caught"

Test the hypothesis with a focused experiment.

Do not make many unrelated changes at once.

---

# Test Hypothesis

Make a targeted test of your hypothesis:

**For rendering issues:**

```tsx
// Add a test to verify the component renders
render(<MyComponent prop="test" />);
expect(screen.getByText('expected text')).toBeInTheDocument();
```

**For state issues:**

```tsx
const { rerender } = render(<MyComponent count={0} />);
expect(screen.getByText('0')).toBeInTheDocument();

rerender(<MyComponent count={1} />);
expect(screen.getByText('1')).toBeInTheDocument();
```

**For API issues:**

```tsx
// Mock the API
vi.mock('@/lib/api', () => ({
  getAccount: vi.fn(() => Promise.resolve({ 
    data: { email: 'test@example.com' } 
  }))
}));

render(<AccountComponent />);
await waitFor(() => {
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
});
```

**For e2e issues:**

```typescript
// Use Cypress debugging
cy.debug(); // Pauses execution
cy.pause(); // Steps through manually

// Inspect the state
cy.window().then(win => console.log(win));
```

---

# Fix Root Cause

Fix the root cause, not the symptom.

Common root causes:

- **Missing dependency in useEffect**: Add to dependency array
- **State not updating**: Check setState call and state structure
- **Component re-rendering unexpectedly**: Check prop changes, memo() if needed
- **API not called**: Check async logic, error handling
- **Test failing**: Fix component logic or fix incorrect assertion
- **Props incorrect**: Fix parent component passing wrong props
- **Type mismatch**: Fix TypeScript types or data structure

Example fixes:

**Missing dependency:**

```tsx
// Before: causes infinite loop
useEffect(() => {
  fetch(`/api/user/${userId}`);
}, []);

// After: correct
useEffect(() => {
  fetch(`/api/user/${userId}`);
}, [userId]);
```

**Incorrect event handler:**

```tsx
// Before: gets called immediately
<button onClick={handleClick()}>Click</button>

// After: correct
<button onClick={handleClick}>Click</button>
```

**Missing error handling:**

```tsx
// Before
const { data } = await getAccount();
setAccount(data); // Crashes if getAccount returns error

// After
const result = await getAccount();
if (result.error) {
  setError(result.error);
} else {
  setAccount(result.data);
}
```

---

# Regression Protection

Add a test to prevent recurrence:

```tsx
it('fetches user account on mount', async () => {
  const mockGetAccount = vi.fn().mockResolvedValue({
    data: { email: 'test@example.com' }
  });
  vi.mock('@/lib/api', () => ({ getAccount: mockGetAccount }));
  
  render(<AccountPage />);
  
  expect(mockGetAccount).toHaveBeenCalled();
  await waitFor(() => {
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
```

---

# Validate

After the fix, verify:

1. The specific issue is resolved
2. Related functionality still works
3. The fix doesn't break other tests
4. The fix works in the dev server
5. The regression test passes

Run validation:

```bash
# Component tests
npm run test:components

# E2E tests
npm run test:e2e

# Dev server
npm run dev
```

---

# Common Issues

**"Cannot find module" error:**

- Check import path and file name
- Verify file exists
- Check tsconfig paths if using path aliases

**"React Hook ... is called conditionally" error:**

- Hooks must be called at the top level of a component
- Cannot be called inside if/loop/function
- Move the condition inside the hook

**"Maximum update depth exceeded" error:**

- useEffect is missing dependency array
- State update triggers re-render which triggers effect again
- Add correct dependencies to useEffect

**Component doesn't update when props change:**

- Check prop values actually changed
- Check useEffect dependency array includes the prop
- Consider using memo() if prop object is recreated

**Test times out:**

- API mock is not resolving
- User event is not completing
- Async operation not awaited
- Check with `async` and `await waitFor`

**Cypress test can't find element:**

- Element might not exist yet
- Use `cy.get()` with `{ timeout: 5000 }`
- Use `cy.wait()` for API responses
- Check selectors match the actual element
