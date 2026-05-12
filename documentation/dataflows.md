# OnlyFling data flows

This document maps the intended movement of data between web, mobile, API, storage, queues, analytics, payments, plugins/modules, GitHub Actions, and admin seeding. It also notes the design implications of the current UI and dependency shape.

## 1. Current system shape

| Layer | Current shape | Design implication |
| --- | --- | --- |
| Web | Next.js app with many client components, thin `fetch` wrapper, local session provider, hand-authored contracts, minimal dependencies | Favor contract-first APIs, shared DTOs, and dictionary-driven localization; avoid coupling business logic to page components |
| Mobile | Expo shell with minimal dependencies and mostly presentational screens | Reuse the same API contracts and analytics taxonomy as web; keep orchestration server-side |
| API | Azure Functions isolated worker with JSON contracts and singleton services | Good fit for command/read separation, queue-triggered workers, and policy-driven responses |
| Storage | Azure blobs/queues/tables implied by current architecture | Use private blobs plus projection tables/read models for feed, charts, invoices, and admin dashboards |
| Analytics | GA4-ready web hooks plus platform events | Split product analytics from compliance/audit logging |
| CI/CD | GitHub Actions preview/canary/infra workflows | Preview opt-ins and module rollout should align with deployment rings and feature flags |
| Local orchestration | .NET Aspire AppHost (`aspire/OnlyFling.AppHost`) | Local dev can coordinate web + API + Azurite without changing static-web production topology |

## 2. Canonical components

| Component | Writes | Reads | Notes |
| --- | --- | --- | --- |
| Web app | Auth, profile, onboarding, collections, uploads, purchases, payouts, module toggles | Feed, account, wallet, charts, module catalog | Best for richer admin/operator screens |
| Mobile app | Same domain commands with notification-first UX | Feed, alerts, charts, wallet, collaboration results | Should stay on the same contracts as web |
| API | Validation, auth, command handling, read models | Blob metadata, queues, policies, ledgers | Primary policy enforcement layer |
| Blob/private storage | Media files, thumbnails, invoices, seed bundles | Signed/proxied file reads | No permanent public blob URLs |
| Queue workers | Qualification, transcoding, projections, invoicing, scoring, payouts, imports | Command payloads, storage events | Parallelizable and replayable |
| Analytics | Product events, funnel tracking | Dashboards, experimentation | No compliance decisions from GA alone |
| Payments/ledger | Credit purchase, invoice, payout, settlement | Order and payout state | Keep immutable finance records |
| Module/plugin catalog | Manifests, scopes, rollout channels | Install state and preview flags | Secrets remain server-side |
| GitHub Actions | Deploy preview/canary/prod, optional seed jobs | Repo state, IaC, artifact outputs | Can also trigger safe operational reconciliation |

## 3. End-to-end flow map

### 3.1 Account creation, sign-in, and localized onboarding

1. Web/mobile submits `auth.request`.
2. API creates a challenge and emits audit + analytics events.
3. Web/mobile submits `auth.verify` with device label, locale, and timezone.
4. API creates/loads account, creates session, and returns token plus role.
5. Web/mobile requests onboarding state.
6. API returns locale-aware copy references, policy versions, and completion state.
7. On submit, API stores onboarding record plus policy acceptance versions.
8. Analytics receives funnel events; audit store receives compliance/security events.

**Key stores:** user table, session store, onboarding store, policy/version store, audit log, analytics events.

### 3.2 Profile, sessions, and account closure

1. Web/mobile loads profile, settings, verification readiness, and active sessions.
2. API returns subject-scoped data plus sync metadata.
3. Profile/privacy changes update account store and invalidate discovery/feed projections.
4. Session revocations update session store immediately.
5. Account closure request creates closure record and enqueues downstream revocation/export/deletion tasks.
6. Queue workers revoke sessions, deactivate browse visibility, and prepare export/deletion jobs.

**Design note:** because the current UI is client-heavy, these should be composed from a small number of API read models rather than many browser-side joins.

### 3.3 Upload intake, qualification, and publication

1. Creator submits upload intake with consent metadata and policy artifact content.
2. API validates ownership, creates metadata row, writes policy artifact, issues signed upload target.
3. Client uploads blob to private storage.
4. Blob event or explicit completion enqueues qualification/transcode/projection jobs.
5. Workers validate checksum, content type, preview assets, moderation flags, and publish readiness.
6. API updates upload state and projection tables.
7. Published items flow into browse/feed projections consumed by web/mobile.

**Key queues:**

| Queue | Producer | Consumer | Parallelism notes |
| --- | --- | --- | --- |
| `upload-qualification` | API/blob event | Qualification worker | Parallel per media item |
| `media-transcode` | Qualification worker | Preview/transcode worker | Parallel by output profile |
| `feed-projection` | Publish/update events | Feed projector | Parallel by item/partition |
| `audit-write` | API/workers | Audit sink | Fire-and-forget with retry |

### 3.4 Short-video browse contract

1. Web/mobile requests cursor-based feed.
2. API reads from precomputed browse projection, not raw upload tables.
3. API decorates each card with localized labels, purchase state, preview URL/token, and age-gate requirement.
4. Client renders TikTok-style browse UI with web/mobile-specific layout.
5. Impression, completion, and engagement events flow to analytics and optional scoring queues.

**Design note:** the browse contract should remain API-driven so web and mobile stay aligned even if rendering differs.

### 3.5 Credits purchase, adult-rated age gate, invoice generation

1. Buyer requests purchase of a media entitlement.
2. API checks entitlement state, age-gate token, and credit balance.
3. API reserves credits in immutable ledger.
4. On success, API commits order + entitlement and enqueues invoice generation.
5. Invoice worker renders localized invoice artifact with controlled entertainment label.
6. Buyer/creator reads invoice metadata through API; document download is signed or proxied.

**Key queues:**

| Queue | Producer | Consumer | Purpose |
| --- | --- | --- | --- |
| `purchase-settlement` | API | Ledger/order worker | Commit or release credit reservation |
| `invoice-render` | Order worker | Document worker | PDF/JSON invoice creation |
| `purchase-analytics` | API/order worker | Analytics sink | Revenue funnel reporting |

### 3.6 Challenges, competitions, charts, and rewards

1. User opts into a challenge.
2. API records participation and emits analytics/audit event.
3. Uploads, purchases, referrals, or other qualifying events emit scoring events.
4. Scoring worker updates challenge aggregates and leaderboard snapshots.
5. Chart APIs read from snapshots/time-series projections.
6. Reward issuance flows through finance/reward workers, not inline chart requests.

**Design note:** charts should read from time-series projections because the current frontend has minimal charting/state dependencies and should not aggregate raw events in the browser.

### 3.7 Payout and cash-out

1. Creator requests payout from available balance.
2. API validates minimums, holds, and payout method readiness.
3. API creates payout request and enqueues payout processing.
4. Finance/payout worker talks to external provider or manual ops queue.
5. Results flow back into payout store, earnings projections, and audit trail.

### 3.8 Module/plugin management and preview opt-in

1. Web/mobile loads global module catalog plus account install state.
2. API returns manifest-driven modules, scopes, preview channel, and eligibility flags.
3. User enables module or opts into preview.
4. API stores install state and, if needed, enqueues background sync/config validation.
5. Preview rollout aligns with deployment ring (`preview`, `canary`, `primary`) and feature flags.

**GitHub Actions link:** preview and canary workflows should be able to enable module cohorts safely without exposing secrets to static clients.

### 3.9 Collaboration discovery and community requests

1. User opts into collaboration discovery or submits a platform request.
2. API stores private source data and updates public/community read models.
3. Nearby matching/alerts run in background using coarse location only.
4. Community voting/demand aggregation updates ranking projections and analytics.

### 3.10 Admin filesystem seeding

1. Platform admin submits a seed batch against an allowlisted import path or mounted volume.
2. API validates manifest and enqueues file hashing/import tasks.
3. Workers import media/metadata into private storage and metadata tables.
4. Projection workers create browse/admin/read models.
5. Audit log records per-file and per-batch outcomes.

**Design note:** seeding is inherently parallelizable and should never be a synchronous request/response import loop.

### 3.11 GitHub Actions preview, canary, and production

1. CI validates web/api/mobile/infra.
2. Preview workflow deploys isolated PR environment.
3. Release workflow deploys inactive production ring and shifts traffic gradually.
4. Feature flags/module preview cohorts are evaluated against ring and account opt-in state.
5. Optional operational jobs can reconcile queues, re-drive poison items, or execute controlled seed imports.

## 4. Storage and ownership boundaries

| Data class | System of record | Public exposure rule |
| --- | --- | --- |
| Sessions/tokens | API/session store | Never exposed except current-session summary |
| Profile public fields | Account/profile store | Only filtered public read model |
| Consent and policy artifacts | Protected metadata/document store | Staff and subject only |
| Media blobs | Private blob storage | Signed/proxied URLs only |
| Feed cards | Projection/read store | Public or auth-scoped depending visibility |
| Credits/orders/payouts | Ledger/order/payout stores | Subject + finance roles only |
| Challenge scores | Scoring projections | Public charts must be redacted/aliased |
| Module secrets | Key Vault/server config | Never sent to static web/mobile |
| Seed manifests/import logs | Admin import store | Platform admin only |

## 5. Analytics vs audit split

| Concern | Destination | Retention style | Example events |
| --- | --- | --- | --- |
| Product analytics | GA4 / analytics pipeline | Aggregated and sampled as needed | page view, onboarding step, feed impression, challenge join |
| Security audit | Audit store | Long-lived, append-only | sign-in, session revoke, break-glass, payout action |
| Compliance audit | Audit store/document store | Long-lived, versioned | policy acceptance, consent capture, age gate, invoice label |
| Operational telemetry | App Insights / logs | SRE retention | queue lag, worker failure, blob processing error |

## 6. Architectural implications

### Localization

- No dedicated i18n dependency exists yet, so introduce locale support through shared dictionaries, stable message IDs, and locale-aware API payloads.
- Legal/policy copy should be versioned server-side and referenced by ID from clients.
- Feed cards, invoices, and age-gate prompts should expose locale-ready labels from API rather than hard-coded page text.

### API-driven rendering

- The current web app relies on direct client fetches and simple local state; expanding scope will be safer if pages consume consolidated read models (`account`, `browse`, `wallet`, `charts`, `modules`) instead of many bespoke calls.
- Mobile should reuse those contracts verbatim.
- Read models should be purpose-built for UI, while command endpoints remain smaller and validation-heavy.

### Queue-backed parallelism

- Upload qualification, preview generation, feed projection, purchase settlement, invoice rendering, challenge scoring, payout execution, module sync, and seeding are all suitable for independent queue workers.
- Use idempotent workers keyed by item/order/batch IDs.
- Prefer projection rebuildability over tightly coupling UI reads to transactional stores.

### Safe scope

- Adult-platform-related work remains limited to consent, age-gate, invoicing labels, moderation, and module scaffolding.
- No unsafe service workflows should be added to web/mobile/API contracts.
