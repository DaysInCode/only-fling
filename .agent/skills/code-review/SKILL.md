---
name: code-review
description: >
  Review .NET changes for correctness, maintainability, testing,
  security, performance, architecture, and accidental changes.
---

# Code Review

Review the actual diff, not merely the final files.

## Correctness

Check:

- requirement
- edge cases
- error paths
- null handling
- concurrency
- cancellation
- state transitions

## Testing

Check:

- tests exist where needed
- tests verify behavior
- regression coverage exists
- integration testing is used where appropriate
- tests are not overly coupled to implementation

## Design

Check:

- cohesion
- coupling
- dependency direction
- unnecessary abstractions
- duplication
- naming

## .NET

Check:

- target framework compatibility
- async usage
- disposal
- nullable reference types
- dependency injection
- logging
- configuration
- EF Core behavior

## Security

Check for:

- secrets
- unsafe input handling
- authorization gaps
- sensitive logging
- injection risks
- insecure defaults

## Final diff

Check:

- only intended files changed
- no temporary files
- no debug code
- no commented-out implementation
- no accidental configuration changes

A review finding should include:

- problem
- why it matters
- evidence
- recommended correction
