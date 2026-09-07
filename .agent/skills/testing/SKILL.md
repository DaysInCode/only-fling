---
name: testing
description: >
  Testing strategy for .NET applications including unit tests,
  integration tests, regression tests, test design, validation,
  and test-driven development workflows.
---

# Testing

Tests are executable specifications of expected behavior.

Testing must happen throughout development, not only at the end.

---

# Test classification

Use the appropriate test level.

## Unit test

Use a unit test when the behavior can be verified without requiring
real external infrastructure.

Typical examples:

- domain logic
- calculations
- validation
- transformations
- application services
- pure business rules

Unit tests should be:

- fast
- deterministic
- isolated
- focused

---

# Integration test

Use integration tests when correctness depends on interaction between
components or infrastructure.

Examples:

- EF Core + database
- ASP.NET Core request pipeline
- authentication
- serialization
- HTTP clients
- filesystem
- message brokers
- external service contracts

Do not mock away the thing that the integration test is intended to verify.

---

# Bug fixing

Every reproducible bug should normally result in a regression test.

Preferred workflow:

    reproduce
       ↓
    regression test
       ↓
    confirm failure
       ↓
    implementation fix
       ↓
    test passes
       ↓
    broader validation

---

# New feature

For new behavior:

1. Identify the observable behavior.
2. Write the smallest meaningful test.
3. Confirm expected failure.
4. Implement.
5. Run focused tests.
6. Add integration coverage when required.
7. Run broader validation.

---

# Test quality

Avoid tests that merely reproduce implementation details.

Prefer assertions about:

- behavior
- outputs
- observable state
- externally meaningful interactions

A test should fail when the behavior is wrong.

A test should not fail merely because an internal implementation detail
changed when behavior remains correct.

---

# Mocking

Mock dependencies only when isolation provides value.

Do not mock:

- everything by default
- simple data structures
- the system under test
- infrastructure when the purpose is integration testing

Be especially careful with mocks around:

- EF Core
- IQueryable
- HTTP
- serialization
- transactions

If mocking produces behavior substantially different from production,
prefer an integration test.

---

# Test failure analysis

When a test fails:

1. Read the failure.
2. Determine whether the test or implementation is wrong.
3. Inspect relevant code.
4. Fix the root cause.
5. Re-run the focused test.
6. Run related tests.
7. Run broader validation when appropriate.

Never modify the test merely to make it pass without understanding
the expected behavior.
