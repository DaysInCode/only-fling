---
name: architecture
description: >
  Architecture and design guidance for maintaining and evolving
  .NET applications without unnecessary complexity.
---

# Architecture

Architecture changes must be justified by requirements.

## Before changing architecture

Inspect:

- existing boundaries
- dependencies
- project structure
- abstractions
- dependency injection
- data access
- domain boundaries
- application boundaries
- existing architectural conventions

## Principles

Prefer:

- high cohesion
- low coupling
- explicit dependencies
- clear boundaries
- simple designs
- testable components
- existing project conventions

Avoid:

- speculative abstractions
- unnecessary interfaces
- unnecessary layers
- premature generic frameworks
- pattern-driven development
- large rewrites for small requirements

## Refactoring

Separate:

1. behavior change
2. structural refactoring

When possible, preserve behavior while refactoring.

Use tests as the safety net.

## Architecture decision

For significant architectural changes document:

- problem
- current behavior
- proposed change
- alternatives considered
- trade-offs
- testing strategy
- migration considerations
