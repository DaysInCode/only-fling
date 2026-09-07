---
name: react-code-review
description: >
  Review React and Next.js changes for correctness, maintainability, testing,
  performance, accessibility, security, and accidental changes in frontend code.
---

# React Code Review

Review the actual diff, not merely the final files.

Focus on React-specific concerns while referencing the architecture skill for general principles.

## Correctness

Check:

- requirement satisfaction
- edge cases (null, undefined, empty states)
- error boundaries and error handling
- state management correctness
- hook dependency arrays
- cleanup in useEffect
- conditional rendering logic
- form validation and submission
- API call error handling
- loading and error states

---

## Component Design

Check:

- single responsibility principle
- prop interface design
- prop drilling vs composition
- component reusability
- naming clarity
- documentation

---

## React Patterns

Check:

- proper hook usage (no hooks in conditionals, loops, or callbacks)
- useState used appropriately
- useEffect dependencies correct
- useEffect cleanup functions present when needed
- custom hooks extraction for logic reuse
- context usage justified
- composition over inheritance

---

## Next.js Specifics

Check:

- "use client" directive used only when necessary
- server components preferred where possible
- async/await in server components
- proper data fetching patterns
- Link component used for navigation
- useRouter used correctly in client components
- environment variables use NEXT_PUBLIC_ prefix
- static build assumptions respected

---

## TypeScript

Check:

- all props have types or interfaces
- no `any` types without justification
- proper generic usage
- type imports vs value imports
- type safety for API responses
- proper error typing

---

## Testing

Check:

- tests exist where needed
- tests verify behavior, not implementation
- no snapshot tests without clear value
- component tests use React Testing Library
- e2e tests cover user journeys
- tests are not overly coupled to selectors
- mocking is appropriate
- edge cases are covered

---

## Accessibility

Check:

- semantic HTML (button, nav, form, heading hierarchy)
- ARIA labels where needed
- keyboard navigation support
- focus management
- color contrast
- form labels properly associated
- alt text for images
- skip links for navigation

---

## Performance

Check:

- unnecessary re-renders prevented
- memo() used when props are stable
- useMemo/useCallback used judiciously (not everywhere)
- component splitting to reduce bundle
- lazy loading where appropriate
- images optimized for Next.js
- bundle impact of new dependencies

---

## Security

Check for:

- XSS vulnerabilities (sanitizing user input)
- CSRF token handling
- secure API key usage (never expose in client code)
- localStorage/sessionStorage security
- authentication token handling
- secure headers
- sensitive data not logged
- form data validation

---

## Style and Conventions

Check:

- CSS module naming consistency
- class name clarity
- responsive design approach
- adherence to project patterns
- file organization
- import path consistency
- component export consistency

---

## Final diff

Check:

- only intended files changed
- no console.log statements
- no debugging code
- no commented-out implementation
- no test files accidentally included
- no accidental configuration changes
- no merge conflict markers

---

## Review Format

A review finding should include:

- **problem**: What was found
- **why it matters**: Impact or risk
- **evidence**: Code reference or example
- **recommended correction**: Specific suggestion
