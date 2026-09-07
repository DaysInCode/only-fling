# Skills Guide

This directory contains specialized skills for developing the OnlyFling platform.

The platform is full-stack with:

- **Backend**: .NET 10 Azure Functions API
- **Frontend**: Next.js 16+ React TypeScript web application
- **Mobile**: React Native (Expo) mobile app

## Core Engineering Skills

### Backend Development

#### `.NET Engineer` (`dotnet-engineer`)

Use this skill for all substantive .NET development work including:

- Feature development
- Bug fixes  
- Refactoring
- Architecture changes
- API development
- Database changes
- Testing and validation

**Workflow**: UNDERSTAND → INSPECT → PLAN → TEST → IMPLEMENT → UNIT TEST → INTEGRATION TEST → VALIDATE → REVIEW → COMPLETE

Start here for: Feature development, bug fixes, new API endpoints, data model changes

#### `.NET Architecture` (`architecture`)

Use this skill when making significant architectural decisions affecting the .NET codebase:

- Changing service boundaries
- Adding new abstraction layers
- Refactoring component relationships
- Updating dependency injection
- Changing data access patterns

**When**: Only for changes justified by requirements that cannot be solved with smaller modifications

#### `.NET Debugging` (`debugging`)

Use this skill when investigating failing tests, runtime errors, or unexpected behavior:

- Failing unit or integration tests
- Runtime exceptions
- Unexpected application behavior
- Build failures
- Configuration issues

**Workflow**: OBSERVE → REPRODUCE → ISOLATE → HYPOTHESIZE → TEST HYPOTHESIS → FIX ROOT CAUSE → REGRESSION TEST → VALIDATE

#### `.NET Code Review` (`code-review`)

Use this skill to review .NET changes for correctness, maintainability, performance, security, and architecture.

Check: correctness, testing, design, .NET-specific concerns, security, and final diff quality

#### `.NET Testing` (`testing`)

Use this skill for guidance on testing strategy for .NET applications:

- Unit tests for domain logic
- Integration tests for component interaction
- Bug fix regression tests
- Test-driven development
- Test quality

#### `.NET 10` (`dotnet10`)

Use this skill for guidance on modern .NET 10 and C# features:

- Target framework best practices
- Modern language features
- SDK tooling
- Project structure

---

### Frontend Development

#### `React Engineer` (`react-engineer`)

Use this skill for all substantive React development work including:

- Feature development
- Bug fixes
- Refactoring
- Component architecture changes
- State management changes
- Testing and validation

**Workflow**: UNDERSTAND → INSPECT → PLAN → TEST → IMPLEMENT → UNIT TEST → INTEGRATION TEST → VALIDATE → REVIEW → COMPLETE

Start here for: React component development, feature implementation, bug fixes, component refactoring

#### `React Architecture` (`react-architecture`)

Use this skill when making significant architectural decisions affecting the React codebase:

- Component hierarchy redesign
- State management patterns
- Props interface design
- Code organization
- Performance optimization
- Composition patterns

**When**: When adding new component patterns, refactoring component relationships, or making structural changes

#### `Next.js` (`next-js`)

Use this skill for guidance on Next.js 16+ specific patterns and features:

- App Router file-based routing
- Server vs client components
- Data fetching patterns
- Static export configuration
- Environment variables
- Common Next.js patterns and pitfalls

Reference: Read `node_modules/next/dist/docs/` for authoritative Next.js documentation

#### `React Testing` (`react-testing`)

Use this skill for guidance on testing strategy for React components:

- Component unit tests with Vitest and React Testing Library
- End-to-end tests with Cypress
- Component testing patterns
- Integration testing
- Test organization
- Mock strategies

#### `React Code Review` (`react-code-review`)

Use this skill to review React and Next.js changes for:

- Correctness and edge cases
- Component design and responsibility
- React patterns and hooks usage
- Next.js conventions
- TypeScript correctness
- Testing coverage
- Accessibility
- Performance
- Security
- Final diff quality

#### `Frontend Debugging` (`frontend-debugging`)

Use this skill when investigating failing tests, rendering issues, or unexpected behavior:

- Component rendering issues
- State management bugs
- Hook dependency issues
- Event handler problems
- API integration failures
- Test failures
- Browser DevTools investigation

**Workflow**: OBSERVE → REPRODUCE → ISOLATE → HYPOTHESIZE → TEST HYPOTHESIS → FIX ROOT CAUSE → REGRESSION TEST → VALIDATE

---

### Shared Skills

#### `Code Review` (`code-review`)

Generic code review guidance. Use `react-code-review` or the .NET-specific guidance for domain-specific reviews.

#### `Debugging` (`debugging`)

Generic debugging workflow. Use `frontend-debugging` or .NET-specific guidance for domain-specific debugging.

#### `Architecture` (`architecture`)

Generic architecture principles. Use `react-architecture` or domain-specific guidance for implementation details.

#### `Testing` (`testing`)

Generic testing strategy. Use `react-testing` or .NET testing guidance for specific test patterns.

#### `Skill Improvement` (`skill-improvement`)

Use this skill when:

- A defect is discovered in your work
- An existing workflow was insufficient
- A repeated failure occurs
- A new repository-specific convention is discovered
- An existing skill contains incorrect guidance

Workflow: INCIDENT → UNDERSTAND → ROOT CAUSE → PROCESS FAILURE? → LESSON → SKILL CHANGE? → REGRESSION → VALIDATE → RECORD

---

## Quick Reference

### Frontend Task: Implement a New Component

1. Use `react-engineer` for the development workflow
2. Reference `react-architecture` for design guidance
3. Use `react-testing` for test strategy
4. Use `next-js` if the component interacts with routing or server/client boundaries
5. Use `react-code-review` for final review

### Backend Task: Implement a New API Endpoint

1. Use `dotnet-engineer` for the development workflow
2. Reference `architecture` for design decisions
3. Use `testing` for test strategy
4. Use `code-review` for final review

### Debugging Issue: Frontend Component Not Rendering

1. Use `frontend-debugging` for investigation workflow
2. May reference `react-engineer` for implementation details
3. Use `react-testing` to write regression test

### Debugging Issue: API Endpoint Returns Wrong Data

1. Use `debugging` for investigation workflow
2. May reference `dotnet-engineer` for implementation details
3. Use `testing` to write regression test

---

## Notes for Future Development

- **Mobile development**: A `react-native` skill should be created when mobile development becomes the focus
- **Full-stack features**: When implementing cross-platform features, use the appropriate skill for each layer, coordinating through requirements and architecture
- **Shared patterns**: Common patterns are documented in each skill; domain-specific skills should reference shared skills when appropriate
