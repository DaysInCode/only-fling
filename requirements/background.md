# OnlyFling background

## Current delivery direction

The implementation is being shaped as a **safe, compliant, adult-only creator operations and marketplace platform** rather than a system for sexual services or non-consensual growth tactics. The codebase is being built around:

- **Next.js** web experience
- **Azure Functions** API
- **Expo** mobile companion for iOS and Android
- **Azure Storage** for private media, queue-first workflows, and lightweight metadata
- **GitHub Actions** automation with Azure deployment
- **MCP-ready connector architecture** for future Copilot/AI and third-party integrations

## Active product scope

### 1. Core user journeys

1. Passwordless sign-in
2. Five-click onboarding
3. First secure upload within 5 minutes of policy acceptance
4. First storefront item creation
5. Invite/referral activation
6. Ongoing creator ranking and rewards

### 2. Account model

- **Free account**
  - sign-up
  - profile
  - uploads
  - one storefront
  - one invite flow
- **Paid account**
  - expanded analytics
  - connector/plugin installs
  - stronger rewards/rank multipliers
  - premium moderation and reporting surfaces
- **Admin account**
  - full audited visibility
  - user management
  - staff management
  - subscriptions
  - dispute handling
  - accountant reporting

### 3. Growth model

Temu-inspired ideas being applied only where appropriate:

- mobile-first UX
- shorter flows
- rewards and rank progression
- referral loops
- social proof and momentum cues
- rapid iteration based on funnel analytics

### 4. Marketplace

- digital items
- physical items
- service request listings
- platform commission
- future Stripe checkout adapter
- future subscription billing

### 5. Connectors and external channels

Connector templates are being prepared for:

- Stripe
- Instagram
- TikTok
- OnlyFans
- Pornhub
- WhatsApp onboarding/notifications
- Telegram onboarding/notifications

These are treated as **connector manifests/templates** first, with real credentials and operational rollout deferred until compliant platform approval, API access, and moderation policy are in place.

## Upload analysis and qualification process

Uploads need a formal qualification pipeline before publication:

1. **Upload requested**
   - API issues private upload URL
   - asset linked to the signed-in account only
2. **Initial validation**
   - file type
   - file size
   - upload completeness
   - ownership/account binding
3. **Qualification rules**
   - terms accepted
   - privacy accepted
   - marketplace policy accepted
   - adult-only declaration
   - profile completeness
   - moderation status
4. **Analysis result**
   - accepted
   - needs-review
   - rejected
5. **Audit trail**
   - result logged
   - reviewer/system source recorded

## Admin tool requirements

The admin tool must include:

- users list
- role and staff management
- subscriptions view
- disputes queue
- moderation queue
- accountant-friendly earnings reports
- audit trail
- connector installation status
- compliance request visibility

## CRM direction

The platform needs a **mini CRM** that is AI-ready and supports:

- opt-in leads
- referral-origin tracking
- WhatsApp / Telegram preferred contact channel flags
- lead stage
- invite status
- owner assignment
- notes
- AI scoring hooks

### Important boundary

The CRM can support:

- imported contacts with consent
- manually researched public business leads
- referral-driven growth
- creator-provided invite lists

The CRM **must not rely on scraping private or platform-restricted personal data** or bulk unsolicited outreach flows that would create privacy, spam, or compliance risk.

## Compliance requirements

- UK/EU-hostable
- GDPR-aware consent and retention model
- PIPL considered: either dedicated regional deployment later or China blocked until localized controls exist
- no cross-account data access
- admin break-glass access must be audited
- private media storage
- minimal public data exposure

## AI and Copilot direction

The platform should expose extension points for:

- qualification scoring
- moderation assistance
- CRM prioritization
- connector operations
- internal productivity improvements
- MCP-backed operational tools

## Collaboration discovery

The platform now needs a **member collaboration discovery** feature for creators who want to find other members nearby to collaborate on content.

### Product rules

- collaboration discovery is **opt-in**
- location sharing is **off by default**
- paid promotion/highlighting requires an **additional disclosure** confirming that the member is comfortable sharing collaboration-area visibility
- location exposure should default to **coarse area/city-level** rather than exact address
- exact/direct contact details are shared only after **mutual acceptance**
- admin and management users retain audited visibility across requests, disclosures, and matches

### Collaboration flow

1. member enables collaboration discovery
2. member adds profile photo, tags, and collaboration preferences
3. member optionally enables location sharing
4. member optionally pays for highlight/promotion and accepts the extra disclosure
5. nearby members appear in search results ranked by distance, availability, and preference fit
6. if a user accepts terms, they can request collaboration contact
7. if the other user accepts, both sides receive the approved return contact path
8. admin can review all profiles, requests, and alerts

### Nearby alerts

- users can opt into nearby availability alerts
- the system should create alerts when a matching creator is nearby and available
- mobile should surface these alerts as notification-oriented UI now
- full push transport can be added later via Expo/FCM/APNs provider wiring

### Preference prediction

Preference prediction should be conservative and transparent:

- based on declared tags and prior accepted collaborations
- never infer hidden sensitive attributes
- used only to improve ranking/recommendation order
- always overrideable by user controls and filters

## Current blockers

1. The requested remote repository `https://github.com/DaysInCode/only-fling.git` is not currently reachable from this environment (`repository not found`).
2. Live Stripe/MCP credentials are not available yet, so payment/provider integrations are scaffold-only for now.
3. Real WhatsApp/Telegram onboarding flows need credentials and provider setup before activation.
4. The pasted GitHub PAT will not be used here; remote push must be done through a valid accessible repository and the user's own credential path.

## Next implementation surfaces

- qualification API + UI
- admin users/subscriptions/reports/disputes API + UI
- mini CRM API + UI
- mobile companion dashboard
- collaboration discovery API + UI
- Cypress smoke coverage
- local emulator wiring and deployment verification
