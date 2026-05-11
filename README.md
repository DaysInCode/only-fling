# OnlyFling starter blueprint

This repository is being delivered as a **safe, compliant, adult-only creator marketplace and operations starter**. The evolving product/background scope is tracked in `requirements/background.md`, including onboarding, qualification rules, admin tooling, CRM direction, marketplace requirements, and explicit compliance boundaries.

This repo is scaffolded for a low-cost Azure starter platform with:

- Next.js static frontend from `web`
- Azure Functions API from `api`
- Azure Storage for images, queues, and tables
- GitHub Actions with Azure OIDC
- preview environments, canary promotion, and forward-only releases
- local Azurite emulation with Podman

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

No publish profiles or long-lived Azure secrets are required.

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

## 5. Local development with Podman + Azurite

Run:

```powershell
podman compose -f podman-compose.yml up -d
```

Then:

```powershell
Copy-Item api\local.settings.example.json api\local.settings.json
Copy-Item web\.env.local.example web\.env.local
Set-Location api; npm install; Set-Location ..
Set-Location web; npm install; Set-Location ..
```

Recommended local loop:

1. Azurite in Podman
2. `npm run dev` in `web`
3. `npm run build` / `npm test` in `api`
4. later add `func start` once API handlers expand beyond the health endpoint

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

## 7. Minimum files scaffolded now

- `infra/main.bicep`
- `infra/parameters/dev.bicepparam`
- `infra/parameters/preview.bicepparam`
- `infra/parameters/prod.bicepparam`
- `.github/workflows/ci.yml`
- `.github/workflows/preview.yml`
- `.github/workflows/release-canary.yml`
- `.github/workflows/infra.yml`
- `podman-compose.yml`
- `api/host.json`
- `api/tsconfig.json`
- `api/src/index.ts`
- `api/src/functions/health.ts`
- `api/local.settings.example.json`
- `web/.env.local.example`

## Immediate next scaffold step

1. Deploy `infra/parameters/dev.bicepparam`
2. point `release-canary.yml` at the production resource group
3. add real API handlers behind queue-based workflows
4. add signed upload URLs for image ingestion
5. wire synthetic tests into post-deploy promotion gates
