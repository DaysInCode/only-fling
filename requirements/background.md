# OnlyFling background

## Current delivery direction

OnlyFling is a **safe, compliant, adult-only creator operations and marketplace platform**. Unsafe service solicitation and non-consensual growth tactics are out of scope.

Primary stack:

- **Next.js** web
- **Azure Functions** API
- **Expo** mobile companion
- **Azure Storage** private media + queue-first processing
- **GitHub Actions** automation + deployment
- **MCP-ready connector/plugin architecture**

## Requirement baseline (cross-reference source for `documentation/userjourneys.md`)

### BG-01 Platform and compliance boundaries

1. UK/EU-hostable architecture with GDPR-aware consent, retention, and auditability.
2. No cross-account data access.
3. Admin break-glass access must be audited and time-bound.
4. Private media storage only; minimal public data exposure.
5. Adult-rated scope limited to consent, eligibility, age gate, invoicing labels, moderation, and plugin scaffolding.

### BG-02 Account and identity

1. Passwordless sign-in with named devices and session revocation.
2. Localized onboarding with versioned policy acceptance (terms, privacy, marketplace).
3. Profile/settings with explicit privacy and discoverability controls.
4. Account closure remains soft-state with explicit acknowledgement and session revocation.

### BG-03 Media and publishing

1. Upload intake must capture consent + policy artifact before transfer completes.
2. Qualification pipeline states: `accepted`, `needs-review`, `rejected`.
3. Collection/folder management must support soft delete with audit.
4. Browse/publish contracts must be API-first and shared by web/mobile.

### BG-04 Commerce and finance

1. Credit purchase flow with immutable ledger semantics.
2. Adult-rated purchases require eligibility/age-gate checks.
3. Invoice generation with controlled entertainment-label taxonomy.
4. Payouts require hold checks, finance controls, and audit trail.

### BG-05 Growth, collaboration, and community

1. Referral/invite attribution with capped reward windows.
2. Challenge/ranking support with anti-fraud and public-redaction controls.
3. Collaboration discovery is opt-in, coarse-location first, mutual contact release only.
4. Community demand requests and roadmap signal aggregation.
5. Affiliate prompts and rewards must be clearly capped/disclosed.

### BG-06 Plugins, connectors, and rollout controls

1. Connector/module catalogs are manifest-driven.
2. Preview/canary behavior requires enrollment + channel/ring gates.
3. Connector templates for external channels remain template/scaffold until compliant rollout.
4. Plugin behavior may alter purchase/publish behavior only through allowlisted server-side config.

### BG-07 Admin and operational tooling

1. Admin tools include users, roles/staff, subscriptions, disputes, moderation, finance reports, audit trail, and compliance visibility.
2. Admin filesystem seeding/import must run from allowlisted paths with manifest checksums and per-file status.
3. Service principals have least-privilege import/ops rights.

### BG-08 Explicit access boundary (newly clarified)

1. **Users (guest/member/creator) cannot access admin events or admin-only event streams.**
2. Admin event endpoints are staff-only and audited.
3. User-visible audit feeds must contain only subject-account events.

### BG-09 Publishing governance flow (newly clarified)

Publishing must pass a governance gate:

1. Creator submits folder + media metadata in `draft`.
2. Folder approval gate validates:
   - ownership
   - consent artifact presence
   - policy artifact completeness
   - qualification state and moderation status
3. Metadata-driven publish fan-out worker reads approved metadata package and executes destination-specific publish tasks.
4. External platform/account publishing uses **admin-managed platform accounts** only (no user-supplied direct credentials in this slice).
5. Enabled plugins may add allowlisted publish transforms/steps, but cannot bypass approval gate or policy checks.
6. Commerce fan-out must apply platform convenience fee/cut rules and record gross, fee, net fields in audit/ledger projections.

## Architecture guardrails

- Localization via shared dictionaries + versioned legal copy, not route duplication.
- Web/mobile consume shared typed API read models.
- Queue-backed, idempotent processing for uploads, purchases, invoices, scoring, payouts, plugins, and seeding.
- Sensitive data redaction by default in non-finance/non-admin surfaces.

## AI and Copilot direction

Extension points should support qualification scoring, moderation assistance, CRM prioritization, connector operations, and MCP-backed operational tooling.

## Implementation notes and blockers

1. Remote `https://github.com/DaysInCode/only-fling.git` may be unreachable from some environments.
2. Live Stripe/MCP/provider credentials are currently scaffold-only.
3. Real WhatsApp/Telegram onboarding requires provider credentials before activation.

## Journeys cross-reference anchor

`documentation/userjourneys.md` defines atomic user/staff flows and maps each flow to:

- requirement references (BG-xx),
- data/validation and security constraints,
- audit events,
- automation coverage (BDD feature links),
- BA/architect/developer/tester acceptance checkpoints.
