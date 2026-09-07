# Agent Configuration

This directory contains configuration and guidance for AI-powered development in the OnlyFling project.

## Structure

### `/skills`

Specialized skills for different development areas. Skills provide detailed workflows, principles, and best practices for specific domains.

**Backend Skills:**

- `dotnet-engineer` - .NET development workflow
- `architecture` - .NET architecture patterns
- `dotnet10` - .NET 10 and modern C# guidance
- `code-review` - Code review checklist
- `debugging` - Debugging workflow
- `testing` - Testing strategy

**Frontend Skills:**

- `react-engineer` - React development workflow
- `react-architecture` - React component design patterns
- `next-js` - Next.js 16+ specific patterns
- `react-testing` - React testing strategy
- `react-code-review` - React code review checklist
- `frontend-debugging` - Frontend debugging workflow
- `typescript-frontend` - TypeScript best practices for React

**Improvement & General:**

- `skill-improvement` - Engineering process improvement workflow

See [skills/README.md](skills/README.md) for quick reference and skill selection guidance.

### `/lessons`

Validated engineering lessons discovered during development. These capture repeatable, technically justified insights from the development process.

### `/mcp`

MCP (Model Context Protocol) server configuration for extending AI capabilities.

---

## Using Skills

When working on the OnlyFling project, select the appropriate skill based on your task:

**Starting a frontend feature?**

Use `react-engineer` skill with guidance from `react-architecture` and `next-js`.

**Starting a backend feature?**

Use `dotnet-engineer` skill with guidance from `architecture`.

**Reviewing code?**

Use `react-code-review` for frontend or `code-review` for backend.

**Debugging an issue?**

Use `frontend-debugging` or `debugging` depending on the domain.

For quick reference on which skill to use, see the **Quick Reference** section in [skills/README.md](skills/README.md).

---

## Front-End Technology Stack

The web frontend is built with:

- **Framework**: Next.js 16.2.6 with React 19
- **Language**: TypeScript 5
- **Testing**: Vitest (unit/component), Cypress (E2E)
- **Linting**: ESLint 9
- **Styling**: CSS Modules
- **Build**: Static export (no server runtime)
- **Internationalization**: Locale provider for multi-language support

**Key Project Files:**

- `web/app/` - Next.js App Router pages and layouts
- `web/components/` - React components organized by feature
- `web/lib/` - Utilities, API client, contracts
- `web/cypress/e2e/` - End-to-end tests
- `web/vitest.config.ts` - Unit test configuration
- `web/next.config.ts` - Next.js configuration (static export mode)

---

## Back-End Technology Stack

The API is built with:

- **Runtime**: .NET 10
- **Framework**: Azure Functions (isolated worker model)
- **Language**: C# 13
- **Database**: Table Storage (via Azure Storage)
- **Testing**: BDD tests with SpecFlow
- **Secrets**: Azure Key Vault, environment variables

**Key Project Files:**

- `api/Functions/` - Azure Functions organized by domain
- `api/Core/` - Domain logic and services
- `api/src/` - TypeScript helper functions
- `api/tests/OnlyFling.Api.Bdd/` - BDD test specifications

---

## Getting Help

When stuck or uncertain:

1. Check the relevant skill's **Quick Reference** section
2. Review the principles and workflow sections
3. Look at examples in the skill documentation
4. If the process fails, consider invoking the `skill-improvement` skill to identify and fix the underlying issue

Remember: These skills represent best practices and proven workflows. Following them increases the chance of producing correct, maintainable code and catching issues early.
