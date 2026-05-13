# OnlyFling starter blueprint

This repository is being delivered as a **safe, compliant, adult-only creator marketplace and operations starter**. The evolving product/background scope is tracked in `requirements/background.md`, including onboarding, qualification rules, admin tooling, CRM direction, marketplace requirements, and explicit compliance boundaries.

This repo is scaffolded for a low-cost Azure starter platform with:

- Next.js static frontend from `web`
- Azure Functions API from `api`
- Azure Storage for images, queues, and tables
- GitHub Actions with Azure OIDC
- preview environments, canary promotion, and forward-only releases
- local Azurite emulation with Podman

## Documentation map

- `requirements/background.md` - product scope, boundaries, and delivery direction
- `documentation/userjourneys.md` - engineering-ready user/admin journey definitions, forms, security rules, audit expectations, and role access
- `documentation/dataflows.md` - system-to-system data flows across web, mobile, API, storage, queues, analytics, payments, plugins, GitHub Actions, and admin seeding

## 1. Recommended Azure topology

| Layer | Azure service | Starter role | Cost note |
| --- | --- | --- | --- |
| Edge | Azure Front Door Standard | Single public hostname, health probes, weighted canary traffic | biggest fixed cost; usually ~£25-35/month |
| Frontend | 2 x Storage Account static websites | `primary` + `canary` Next.js export origins | pennies to low single digits |
| API | 2 x Azure Functions (Linux Consumption) | `primary` + `canary` API rings | near-zero at low traffic |
| App data | 1 x Storage Account | private blobs, queues, tables | low single digits |
| Secrets | Azure Key Vault | runtime secrets, webhook secrets, keys | low cost |
| Observability | App Insights + Log Analytics | traces, metrics, alerts, synthetic checks | cap at ~£5-15/month |

**Expected starter spend:** roughly **£45-80/month** before meaningful traffic.

### Topology summary

- **Azure Front Door** is the only public entry point.
- **Two production rings** exist for web and API: `primary` and `canary`.
- **One shared state storage account** holds:
  - private image blobs
  - upload queues / poison queues
  - lightweight tables for metadata and deployment state
- **Preview deployments** use short-lived resource groups per PR.

## 2. CI/CD structure

### Workflows

- `.github/workflows/ci.yml`
  - lint/build Next.js
  - typecheck/build Functions
  - compile Bicep
- `.github/workflows/preview.yml`
  - deploy ephemeral PR environment with OIDC
  - publish static web assets to Storage static website
  - zip deploy Functions
  - delete preview resource group when PR closes
- `.github/workflows/release-canary.yml`
  - deploy to inactive production ring
  - run smoke tests
  - shift Front Door weights 5% -> 25% -> 100%
  - if health checks fail, return traffic to current stable ring without redeploying old artifacts
- `.github/workflows/infra.yml`
  - manual or path-based infra reconciliation for dev/prod
- `.github/workflows/deploy-static-web-app.yml`
  - builds `web` as static export and deploys `web/out` to Azure Static Web Apps
  - expects `AZURE_STATIC_WEB_APPS_API_TOKEN` and public `NEXT_PUBLIC_*` variables

### OIDC model

Use a single Azure AD app or user-assigned managed identity with federated credentials for:

- `repo:OWNER/REPO:pull_request`
- `repo:OWNER/REPO:ref:refs/heads/main`
- optional `repo:OWNER/REPO:environment:production`

Store only these in GitHub **Variables**:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_LOCATION`
- `AZURE_RESOURCE_GROUP_PROD`
- `NEXT_PUBLIC_API_BASE_URL` (for static web app build-time API endpoint)
- `NEXT_PUBLIC_ENVIRONMENT` (for static web app build-time environment label)
- optional: `NEXT_PUBLIC_GA_MEASUREMENT_ID`

No publish profiles or long-lived Azure secrets are required.

### Azure Static Web App deployment quick setup

1. Create an Azure Static Web App in your target subscription/resource group.
2. Add the deployment token to production environment secret `AZURE_STATIC_WEB_APPS_API_TOKEN_NICE_HILL_094710B03`.
3. Set production variables:
   - `SWA_PRODUCTION_URL` (for example `https://kind-ocean-0de01b903.7.azurestaticapps.net`)
   - `NEXT_PUBLIC_ENVIRONMENT` (`production`)
   - optional `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - optional `NEXT_PUBLIC_API_BASE_URL` (if omitted, web defaults to `/api`)
4. Link a backend API to the SWA for same-origin `/api`:
   - upgrade SWA SKU to `Standard`
   - link Function App with `az staticwebapp backends link ...`
5. Run workflow `deploy-static-web-app`.

The workflow is now multi-stage: **build -> draft release -> deploy -> verify (web + API + payout screenshot artifact)**.

## 3. Canary + preview pattern

### Preview

- Every PR gets its own resource group: `rg-onlyfling-pr-<number>`
- Workflow deploys:
  - one Storage static website
  - one Function App
  - one shared data storage account
- PR close deletes the group

### Production forward-only release

1. Detect active ring from Front Door weights.
2. Deploy the new build to the **inactive** ring only.
3. Run direct smoke tests on that ring.
4. Shift traffic progressively through Front Door.
5. If healthy, promote to 100%.
6. Keep the former ring intact as the fallback serving ring until the next release.

This is **forward-only** because the workflow never redeploys an old artifact. A failed canary only stops promotion and restores traffic to the currently healthy ring.

## 4. Self-healing patterns

- **Queue-first writes** for image processing and heavy background work.
- **Poison queues** with automatic re-drive workflow.
- **Blob soft delete + versioning** for accidental deletes.
- **Idempotent Functions** keyed by request or blob ID.
- **Timer-trigger reconciler** to repair missing metadata, stalled uploads, and orphaned blobs.
- **Front Door health probes** for automatic origin failover.
- **App Insights alert rules**:
  - Functions 5xx rate
  - queue backlog age
  - failed image-processing jobs
  - synthetic `/api/health` and homepage failures
- **Deployment freezes by automation** when post-deploy health gates fail.

## 5. Local development with Aspire + Podman/Azurite

Run:

```powershell
npm run tooling:local:aspire
```

This starts a local Aspire orchestration host that runs:

- `api` (`func start --dotnet-isolated` via npm script)
- `web` (`next dev` on port 3000)
- `azurite` container dependency for blob/queue/table emulation

If you prefer the previous non-Aspire path:

```powershell
podman compose -f podman-compose.yml up -d
npm run tooling:local
```

Recommended local loop:

1. `Copy-Item api\local.settings.example.json api\local.settings.json` (first run only)
2. `Copy-Item web\.env.local.example web\.env.local` (first run only)
3. `npm run tooling:local:aspire`
4. `npm run tooling:smoke -- -WebUrl http://127.0.0.1:3000 -ApiBaseUrl http://127.0.0.1:7071/api`

### Local ops tooling

PowerShell-first wrappers now live in `scripts\`:

```powershell
npm run tooling:local
npm run tooling:local:aspire
npm run tooling:validate
npm run tooling:validate:aspire
npm run tooling:smoke -- -WebUrl http://127.0.0.1:3000 -ApiBaseUrl http://127.0.0.1:7071/api
npm run tooling:api:perf -- -BaseUrl http://127.0.0.1:7071/api -Samples 10
npm run tooling:ga -- -ConfigOnly
npm run tooling:gh:watch -- -Workflow release-canary.yml -FollowLatest
```

What each wrapper does:

- `scripts\run-local-system.ps1`
  - starts the local stack with Aspire AppHost when available, then falls back to Podman or local `npm` processes
  - verifies `web` and `api` readiness
  - optionally includes MCP if an in-repo `mcp\package.json` exists
  - keeps services running in `Dev` mode and tears them down in `Validate` mode
- `scripts\validate-local-system.ps1`
  - non-destructive validation entrypoint for local or CI usage
  - uses the same readiness + smoke flow as the dev launcher
- `scripts\test-deployment.ps1`
  - smoke-tests a deployed or local web URL plus `/api/health`
  - captures simple latency stats and reports API health payload fields
- `scripts\measure-api.ps1`
  - repeated API probe for p50/p95 checks from the local machine
- `scripts\test-ga-wiring.ps1`
  - validates checked-in GA wiring and can optionally call the GA4 Measurement Protocol debug endpoint when you provide a local or CI-only API secret
- `scripts\watch-gh-actions.ps1`
  - wraps `gh run list`, `gh run view`, and `gh run watch` for build/deploy monitoring from a Windows PowerShell shell

`mobile` is intentionally not auto-started in the shared launcher because Expo is interactive; validation mode can still typecheck it with `-IncludeMobile`.

Actual Copilot CLI skills cannot be shipped inside this repo, so the practical artifact here is PowerShell tooling plus workflow reuse.

### API BDD coverage

Run the Reqnroll API canary/preview suite with:

```powershell
npm run test:api:bdd
```

This keeps the existing Cypress coverage intact while adding .NET-side executable coverage for auth, uploads, media contracts, payouts, guarded modules, preview enrollment, and cross-account defenses.

### Account/media UI coverage

The web app now includes:

- account profile summary and profile editing
- Slack/Telegram-style settings sections
- dedicated security/devices and close-account danger zone
- media collections, upload intake, and folder markdown policy artifacts
- per-account earnings graph plus payout requests/history
- per-account audit trail
- identity verification readiness/checklist/status only

### Containerized Cypress path

Run:

```powershell
npm run test:e2e:container
```

This builds the static-export web container, starts the supporting API + Azurite stack, runs Cypress against the web container, and tears the stack down.

## 6. Secrets and configuration

### GitHub

- **Variables only** for subscription IDs, tenant IDs, client IDs, resource group names.
- **Secrets only** when GitHub itself must own them, such as optional notification webhooks.

### Azure

- **Key Vault** stores:
  - Stripe secret keys
  - webhook signing secrets
  - JWT signing material
  - any third-party API keys
- **Functions use managed identity** to read Key Vault secrets.
- **Web frontend gets only public config**:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_ENVIRONMENT`

### Naming rule

- secret values stay in Key Vault
- non-secret environment wiring stays in GitHub variables and Bicep params
- local dev uses checked-in `*.example` files only
- Aspire AppHost forwards Stripe provider scaffolding from environment (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CHECKOUT_BASE_URL`) without committing secret values
- GA4 Measurement Protocol API secrets stay out of the repo; use local environment variables or CI secrets when running `scripts\test-ga-wiring.ps1` against the debug endpoint

## 7. Minimum files scaffolded now

- `infra/main.bicep`
- `infra/parameters/dev.bicepparam`
- `infra/parameters/preview.bicepparam`
- `infra/parameters/prod.bicepparam`
- `.github/workflows/ci.yml`
- `.github/workflows/preview.yml`
- `.github/workflows/release-canary.yml`
- `.github/workflows/infra.yml`
- `.github/workflows/deploy-static-web-app.yml`
- `scripts/run-local-system.ps1`
- `scripts/validate-local-system.ps1`
- `scripts/test-deployment.ps1`
- `scripts/measure-api.ps1`
- `scripts/test-ga-wiring.ps1`
- `scripts/watch-gh-actions.ps1`
- `podman-compose.yml`
- `aspire/OnlyFling.AppHost/OnlyFling.AppHost.csproj`
- `aspire/OnlyFling.ServiceDefaults/OnlyFling.ServiceDefaults.csproj`
- `api/host.json`
- `api/tsconfig.json`
- `api/src/index.ts`
- `api/src/functions/health.ts`
- `api/local.settings.example.json`
- `web/.env.local.example`

## 8. Architecture implications for the next requirement slice

- The current web app is **client-heavy Next.js** with a thin fetch wrapper and hand-authored contracts. Localization should therefore be introduced as **shared dictionaries and API-supplied locale/policy metadata**, not page-by-page forks.
- Web and mobile should converge on **shared read/write contracts** for onboarding, browse feed, credits, invoices, challenges, payouts, modules, and device/session management.
- Media processing, purchase settlement, invoice creation, challenge scoring, payout execution, and admin seeding should remain **queue-backed, idempotent, and replayable** rather than synchronous request chains.
- Adult-platform-related work stays limited to **eligibility, consent, age-gate, invoicing, moderation, and plugin scaffolding**. Unsafe or service-oriented flows are intentionally out of scope.

## 9. Immediate next scaffold step

1. Deploy `infra/parameters/dev.bicepparam`
2. point `release-canary.yml` at the production resource group
3. add real API handlers behind queue-based workflows
4. add signed upload URLs for image ingestion
5. synthetic smoke checks are now wired into preview and release validation gates via `scripts\test-deployment.ps1`
