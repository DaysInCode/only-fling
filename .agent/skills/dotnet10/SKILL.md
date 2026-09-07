---
name: dotnet10
description: >
  .NET 10 and modern C# development guidance. Use when implementing,
  reviewing, refactoring, or debugging .NET 10 applications.
---

# .NET 10 Development

Assume the repository targets .NET 10 unless repository inspection
shows otherwise.

Always inspect the actual TargetFramework before assuming the version.

## Rules

- Prefer APIs available in the repository's target framework.
- Prefer modern .NET APIs over obsolete patterns.
- Follow existing project conventions.
- Do not introduce APIs from newer frameworks than the project targets.
- Check package compatibility before adding dependencies.
- Prefer built-in .NET functionality before adding a package.
- Preserve nullable reference type correctness.
- Respect analyzers configured by the repository.
- Prefer async APIs for I/O-bound operations.
- Propagate CancellationToken where appropriate.
- Avoid unnecessary allocations in performance-sensitive paths.
- Do not optimize without evidence when performance is not part of the task.

## C# practices

Prefer:

- clear types
- pattern matching where it improves readability
- records where the domain requires value semantics
- primary constructors where appropriate
- collection expressions where they improve clarity
- required members where appropriate
- nullable reference types
- file-scoped namespaces
- modern switch expressions
- explicit domain-oriented naming

Do not use newer syntax simply because it exists.

Readability and repository consistency take precedence.

## Dependency management

Before adding a NuGet package:

1. Determine whether .NET already provides the capability.
2. Check whether the repository already has an equivalent dependency.
3. Check whether the dependency is compatible with .NET 10.
4. Consider maintenance and security implications.

## ASP.NET Core

When working with ASP.NET Core:

- follow the existing hosting model
- preserve dependency injection conventions
- use middleware appropriately
- validate request boundaries
- use appropriate HTTP semantics
- maintain authentication and authorization behavior
- test endpoint behavior where appropriate

## EF Core

When working with EF Core:

- inspect existing DbContext configuration
- inspect existing migrations
- understand tracking behavior
- avoid accidental N+1 queries
- avoid unnecessary client-side evaluation
- test important query behavior
- use integration tests when database behavior is part of the requirement

## Do not

- introduce architecture solely to demonstrate a language feature
- rewrite working code unnecessarily
- ignore repository conventions
- suppress warnings without understanding them
