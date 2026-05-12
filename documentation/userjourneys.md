# OnlyFling user journeys

This file defines **atomic flows** (no bundled/ambiguous journeys) and cross-references `requirements/background.md` requirement IDs.

## Roles

| Role | Allowed scope |
| --- | --- |
| Guest | Marketing pages, sign-in code request, public-safe browse only |
| Member | Own profile, settings, purchases, referrals, collaboration/community actions |
| Creator | Member scope + uploads, collections, publishing, payouts, modules |
| Moderator | Moderation/dispute operations only |
| Accountant | Finance/reporting/payout processing only |
| Platform admin | Full audited staff operations |

## Global rules (apply to every flow)

- Requirement refs: BG-01, BG-08.
- User APIs are account-scoped; no cross-account access.
- **Users cannot access admin events/admin-only event streams.**
- Every mutating action must be idempotent and auditable.
- Public read models must exclude private blob URLs, exact location, and foreign account IDs.

---

## UF-01 Request passwordless sign-in code

- **Requirement refs:** BG-02, BG-01
- **Actor/role:** Guest
- **Preconditions:** Valid email; rate-limit budget available.
- **Happy path:** submit `email`, `locale`; system creates short-lived challenge.
- **Alternate/error paths:** invalid email -> `400`; throttled -> `429`; blocked IP/email -> `403`.
- **Security/access constraints:** hashed one-time code, anti-automation checks, IP/email throttling.
- **Data validation notes:** `email` 5-254 (lowercased), `locale` BCP-47 (2-10).
- **Audit events expected:** `auth.challenge_requested`.
- **Automation mapping:** `api/tests/OnlyFling.Api.Bdd/Features/Authentication.feature` -> `Passwordless sign-in issues and revokes API sessions`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** clear sign-in UX; challenge TTL enforced server-side; deterministic error codes; throttle + abuse tests pass.

## UF-02 Verify sign-in code and create session

- **Requirement refs:** BG-02, BG-01
- **Actor/role:** Guest -> Member/Creator
- **Preconditions:** Active challenge exists; code not used/expired.
- **Happy path:** submit `email`, `code`, `deviceLabel`, `timezone`; system verifies, creates account (if first login), opens session.
- **Alternate/error paths:** wrong/expired code -> `401`; replayed code -> `409`; malformed payload -> `400`.
- **Security/access constraints:** single-use code, opaque revocable session token, no impersonation bypass.
- **Data validation notes:** `code` 6-8; `deviceLabel` 1-64; `timezone` 1-64 IANA.
- **Audit events expected:** `auth.challenge_verified`, `account.created` (first login), `session.created`.
- **Automation mapping:** `Authentication.feature` scenario above.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** first-login bootstrap complete; session identity stable; account/session transaction safe; replay tests covered.

## UF-03 List and revoke active sessions

- **Requirement refs:** BG-02, BG-01
- **Actor/role:** Member/Creator
- **Preconditions:** Signed in.
- **Happy path:** view `/account/sessions`; revoke selected session by `sessionId`.
- **Alternate/error paths:** foreign/nonexistent session -> `404`; already revoked -> idempotent `200/204`.
- **Security/access constraints:** self-only revocation; no cross-account session access.
- **Data validation notes:** `sessionId` UUID/string key from current account set.
- **Audit events expected:** `session.revoked`.
- **Automation mapping:** `Authentication.feature`; `CrossAccountDefense.feature` -> `A different account cannot delete collections or revoke foreign sessions`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** device naming visible; revocation immediate; token invalidation consistent; negative cross-account tests pass.

## UF-04 Complete localized onboarding and policy acceptance

- **Requirement refs:** BG-02, BG-01
- **Actor/role:** Member/Creator
- **Preconditions:** Signed in; onboarding incomplete.
- **Happy path:** submit profile seed + locale/country/timezone + required policy accepts with policy versions.
- **Alternate/error paths:** missing required acceptance -> `400`; stale policy version -> `409`.
- **Security/access constraints:** completion decided server-side; legal docs versioned and immutable.
- **Data validation notes:** `displayName/workspaceName` 1-80; `countryCode` ISO-2; policy booleans required.
- **Audit events expected:** `onboarding.started`, `policy.accepted`, `onboarding.completed`.
- **Automation mapping:** Planned (no BDD scenario yet).
- **Acceptance checkpoints (BA/Arch/Dev/Test):** legal copy versioned; resumable state machine; consistent locale behavior; policy regression tests required.

## UF-05 Update profile/privacy/discovery preferences

- **Requirement refs:** BG-02, BG-01, BG-05
- **Actor/role:** Member/Creator
- **Preconditions:** Signed in.
- **Happy path:** update profile fields, privacy toggles, discoverability options.
- **Alternate/error paths:** invalid tags/language -> `400`; forbidden field edits -> `403`.
- **Security/access constraints:** sanitize text; self-only updates; cached browse projections refreshed.
- **Data validation notes:** `bio` <=500; `languages[]` BCP-47 max 10; `contentTags[]` max 20.
- **Audit events expected:** `profile.updated`, `privacy.updated`, `contact_preferences.updated`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** privacy defaults safe; projection refresh path exists; API contract typed; validation/unit tests for arrays.

## UF-06 Create/update collection folder

- **Requirement refs:** BG-03
- **Actor/role:** Creator
- **Preconditions:** Signed in as creator.
- **Happy path:** create folder (`folderName`, `title`, `visibility`, pricing metadata); update metadata as needed.
- **Alternate/error paths:** duplicate `folderName` per owner -> `409`; invalid visibility/state -> `400`.
- **Security/access constraints:** owner-only mutation; no public exposure until eligible.
- **Data validation notes:** `folderName` 3-64 slug-safe; `title` 1-120; `priceMinor` >=0.
- **Audit events expected:** `collection.created`, `collection.updated`.
- **Automation mapping:** `UploadIntake.feature` (collection create), `MediaContracts.feature` (collection reads).
- **Acceptance checkpoints (BA/Arch/Dev/Test):** predictable folder identity; owner uniqueness guaranteed; schema/DTO validation; create/update contract tests.

## UF-07 Soft-delete (and restore) collection

- **Requirement refs:** BG-03, BG-01
- **Actor/role:** Creator (delete), Platform admin (restore)
- **Preconditions:** Collection exists and belongs to actor for delete.
- **Happy path:** creator requests soft-delete; system hides collection/items from user feeds immediately.
- **Alternate/error paths:** foreign collection delete -> `404`; restore outside retention -> `409`.
- **Security/access constraints:** delete idempotent; restore staff-audited only.
- **Data validation notes:** `collectionId` required; optional `deleteReason` <=250.
- **Audit events expected:** `collection.soft_deleted`, `collection.restored`.
- **Automation mapping:** `CrossAccountDefense.feature` (foreign delete blocked).
- **Acceptance checkpoints (BA/Arch/Dev/Test):** deletion visibility instant; retention policy explicit; safe retry semantics; hide/show integration tests.

## UF-08 Upload intake with consent and policy artifact

- **Requirement refs:** BG-03, BG-01
- **Actor/role:** Creator
- **Preconditions:** Creator owns target collection; onboarding/policy prerequisites met.
- **Happy path:** submit upload intake metadata + consent object + policy artifact summary; system returns constrained private upload contract and queues qualification.
- **Alternate/error paths:** missing consent fields -> `400`; unsafe media type -> `415`; unauthorized collection -> `404`.
- **Security/access constraints:** private storage only; MIME sniffing; no direct permanent public URLs.
- **Data validation notes:** `title` 1-120; `fileSizeBytes` per media limit; consent booleans required; retention years 1-10.
- **Audit events expected:** `media.upload_intake_created`, `media.policy_artifact_created`, `media.qualification_started`.
- **Automation mapping:** `UploadIntake.feature` -> `Upload intake captures consent metadata and policy artifacts`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** consent captured before transfer; queue contract generated; storage metadata identity-safe; artifact file assertions pass.

## UF-09 Submit folder for publishing approval gate

- **Requirement refs:** BG-09, BG-03, BG-06
- **Actor/role:** Creator
- **Preconditions:** Folder exists with completed consent/policy artifacts and qualified media.
- **Happy path:** creator requests publish; system evaluates folder approval gate and marks `approved_for_fanout` or returns actionable block reasons.
- **Alternate/error paths:** incomplete metadata/qualification -> `409`; moderation hold -> `423`.
- **Security/access constraints:** creator cannot bypass gate; only approved metadata package enters fan-out queue.
- **Data validation notes:** required publish metadata includes `publishState`, locale labels, pricing metadata.
- **Audit events expected:** `publish.gate_requested`, `publish.gate_passed`, `publish.gate_blocked`.
- **Automation mapping:** Partial via `MediaContracts.feature` publish update; full gate scenario Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** transparent blocker reasons; deterministic gate rules; queue message schema versioned; blocked-path tests required.

## UF-10 Execute metadata-driven publish fan-out

- **Requirement refs:** BG-09, BG-06, BG-04
- **Actor/role:** Platform admin + system worker
- **Preconditions:** Folder gate passed (UF-09); approved destination mapping exists.
- **Happy path:** fan-out worker reads approved metadata package, publishes to allowlisted destinations using admin-managed platform accounts, applies plugin-enabled transforms, computes convenience fee/cut projection.
- **Alternate/error paths:** destination failure -> retry/backoff and partial status; plugin rule violation -> fail-safe block.
- **Security/access constraints:** no user-supplied direct destination credentials; plugin steps allowlisted only; gate bypass forbidden.
- **Data validation notes:** metadata package must include destination IDs, pricing basis, tax/fee profile, and version.
- **Audit events expected:** `publish.fanout_started`, `publish.destination_completed`, `publish.destination_failed`, `commerce.convenience_fee_applied`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** governance traceability visible; fan-out idempotent; per-destination state machine implemented; retry/failure integration tests required.

## UF-11 Browse media feed and preview

- **Requirement refs:** BG-03, BG-01
- **Actor/role:** Guest/Member/Creator
- **Preconditions:** Published + eligible media exists.
- **Happy path:** client calls browse endpoint using cursor; renders cards and optional preview URLs.
- **Alternate/error paths:** invalid cursor -> `400`; hidden/deleted content filtered out.
- **Security/access constraints:** preview URLs time-limited/proxied; no private source paths in response.
- **Data validation notes:** response includes `items[]`, `nextCursor`, `viewerState`, `impressionToken`.
- **Audit events expected:** `media.feed_impression_sampled`.
- **Automation mapping:** `MediaContracts.feature`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** feed shape shared across web/mobile; eligibility filters honored; stable cursor pagination; contract tests for response schema.

## UF-12 Complete adult eligibility/age gate

- **Requirement refs:** BG-04, BG-01
- **Actor/role:** Member/Creator buyer
- **Preconditions:** Attempting adult-rated purchase/playback.
- **Happy path:** submit age-gate payload; server issues short-lived eligibility token.
- **Alternate/error paths:** denied eligibility -> `403`; expired token -> re-prompt.
- **Security/access constraints:** server-enforced decision only; override is audited staff path.
- **Data validation notes:** `countryCode` ISO-2; `policyVersion` required; method enum allowlist.
- **Audit events expected:** `age_gate.presented`, `age_gate.completed`, `age_gate.denied`, `age_gate.override_used`.
- **Automation mapping:** `PaymentCommerce.feature` (age-verification requirement path).
- **Acceptance checkpoints (BA/Arch/Dev/Test):** regional policy routing clear; minimal-data storage; token expiry consistent; negative test matrix by method/region.

## UF-13 Purchase media with credits/plugin policy

- **Requirement refs:** BG-04, BG-06, BG-01
- **Actor/role:** Member/Creator buyer
- **Preconditions:** Entitled item available; age gate satisfied when required.
- **Happy path:** submit purchase request; server validates method against plugin policy, commits ledger, grants entitlement.
- **Alternate/error paths:** method not allowed -> `409`; insufficient credits -> `409`; duplicate idempotency key -> safe replay.
- **Security/access constraints:** server recalculates payable amount; entitlement only after commit.
- **Data validation notes:** `mediaItemId` required; `paymentMethod` allowlist; idempotency key 16-64 when used.
- **Audit events expected:** `purchase.started`, `purchase.completed`, `entitlement.granted`, `purchase.refunded`.
- **Automation mapping:** `PaymentCommerce.feature`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** buyer sees clear failure reason; immutable ledger entries; race-safe idempotency handling; end-to-end purchase assertions pass.

## UF-14 View/download invoices

- **Requirement refs:** BG-04, BG-01
- **Actor/role:** Buyer, Creator, Accountant/Admin
- **Preconditions:** Completed purchase/order exists.
- **Happy path:** user fetches own invoice list and downloads generated invoice.
- **Alternate/error paths:** foreign invoice access -> `404/403`; label override without rights -> `403`.
- **Security/access constraints:** immutable invoice snapshot; encrypted billing data; role-redacted views.
- **Data validation notes:** controlled entertainment label vocabulary only.
- **Audit events expected:** `invoice.generated`, `invoice.downloaded`, `invoice.label_set`.
- **Automation mapping:** `PaymentCommerce.feature` (`/account/invoices` checks).
- **Acceptance checkpoints (BA/Arch/Dev/Test):** invoice labels understandable; numbering immutable; access guardrails enforced; download authorization tests pass.

## UF-15 Join challenge and view rankings

- **Requirement refs:** BG-05, BG-01
- **Actor/role:** Member/Creator
- **Preconditions:** Challenge active and eligible.
- **Happy path:** user opts in, optionally enables public ranking alias, views scoreboard.
- **Alternate/error paths:** duplicate join -> idempotent response; fraud-adjusted score -> visible reason code.
- **Security/access constraints:** one account entry unless team challenge; redacted public chart identity.
- **Data validation notes:** `nickname` 1-40; `metricScope` enum.
- **Audit events expected:** `challenge.joined`, `challenge.score_recorded`, `challenge.reward_issued`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** scoring rules documented; read model snapshot strategy; anti-fraud adjustment tooling; challenge API tests needed.

## UF-16 Request payout and track status

- **Requirement refs:** BG-04
- **Actor/role:** Creator (request), Accountant/Admin (process)
- **Preconditions:** Settled available balance; no active hold.
- **Happy path:** creator submits payout request; finance pipeline transitions status until paid/rejected.
- **Alternate/error paths:** hold active -> `409/423`; below minimum -> `400`; duplicate request -> idempotent handling.
- **Security/access constraints:** fresh auth for payout submission; moderator cannot approve payouts.
- **Data validation notes:** `amountMinor` config min/max; `currency` ISO-4217.
- **Audit events expected:** `payout.requested`, `payout.processing`, `payout.rejected`, `payout.paid`.
- **Automation mapping:** `EarningsPayout.feature`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** available-balance math transparent; state model explicit; gateway adapters isolated; payout regression tests pass.

## UF-17 Install modules and enroll in preview/canary

- **Requirement refs:** BG-06
- **Actor/role:** Creator (self-install/enroll), Admin (catalog/config)
- **Preconditions:** Account tier and eligibility rules satisfied.
- **Happy path:** creator reads module catalog, installs approved module, optionally enrolls preview where allowed.
- **Alternate/error paths:** preview not enrolled -> blocked reason; canary-required module on stable ring -> denied.
- **Security/access constraints:** least-privilege scopes; kill switch; no direct secret entry in client.
- **Data validation notes:** `moduleId` slug/UUID; `versionChannel` enum; `scopes[]` allowlist.
- **Audit events expected:** `module.installed`, `module.preview_opted_in`, `module.disabled`.
- **Automation mapping:** `ModuleManagement.feature`, `PreviewCanary.feature`, `PaymentCommerce.feature` (admin plugin config access control).
- **Acceptance checkpoints (BA/Arch/Dev/Test):** eligibility reason visible; ring-aware routing stable; manifest-driven config enforced; channel/ring tests pass.

## UF-18 Share referral and attribute signup

- **Requirement refs:** BG-05, BG-02
- **Actor/role:** Member/Creator + invited Guest
- **Preconditions:** Referrer has active account/referral code.
- **Happy path:** referrer shares code/link; invitee signs up; attribution stored; capped reward later issued.
- **Alternate/error paths:** self-referral blocked; duplicate attribution ignored.
- **Security/access constraints:** tamper-resistant signed referral links; anti-abuse heuristics.
- **Data validation notes:** `referralCode` 3-32; optional invite email 5-254.
- **Audit events expected:** `referral.link_opened`, `referral.attributed`, `referral.reward_issued`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** reward cap disclosed; immutable attribution events; abuse detection hooks; attribution tests required.

## UF-19 Enable collaboration discovery profile

- **Requirement refs:** BG-05, BG-01
- **Actor/role:** Member/Creator
- **Preconditions:** Signed in; profile baseline complete.
- **Happy path:** user opts in, sets coarse location/preferences, optionally enables promoted highlight with disclosure acceptance.
- **Alternate/error paths:** disclosure missing for promoted highlight -> `400`; opt-out removes discoverability.
- **Security/access constraints:** default-off; coarse location only in public model.
- **Data validation notes:** `coarseGeoHash` 4-6; `preferences[]` max 20; `promotedDisclosureAccepted` required if promoted.
- **Audit events expected:** `collab.discovery_enabled`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** opt-in consent clarity; coarse-vs-exact data separation; ranking input contracts; privacy tests needed.

## UF-20 Collaboration request and mutual contact release

- **Requirement refs:** BG-05, BG-01
- **Actor/role:** Member/Creator + peer user
- **Preconditions:** both users discoverable/eligible.
- **Happy path:** requester sends collaboration request; recipient accepts; system releases approved contact path to both sides.
- **Alternate/error paths:** rejected/expired request -> closed without contact release; spam throttling enforced.
- **Security/access constraints:** contact details released only after mutual acceptance.
- **Data validation notes:** `requestNote` <=500.
- **Audit events expected:** `collab.request_created`, `collab.request_accepted`, `collab.contact_released`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** mutuality rule non-bypassable; request lifecycle explicit; notification queue idempotent; acceptance/rejection tests required.

## UF-21 Submit community platform request and vote

- **Requirement refs:** BG-05, BG-06
- **Actor/role:** Member/Creator
- **Preconditions:** Signed in.
- **Happy path:** user submits requested integration/platform and votes on demand items.
- **Alternate/error paths:** duplicate request merged; throttled spam -> `429`.
- **Security/access constraints:** sanitize free text; anti-automation controls.
- **Data validation notes:** `platformName` 1-80; `type` enum; `note` <=500.
- **Audit events expected:** `platform_request.submitted`, `platform_request.voted`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** visible demand signals; dedupe strategy documented; aggregation read model; submit/vote API tests needed.

## UF-22 Share affiliate launch link with capped rewards

- **Requirement refs:** BG-05
- **Actor/role:** Creator
- **Preconditions:** creator reached configured earnings milestone.
- **Happy path:** system presents affiliate CTA, creator shares link, reward window capped by first N sales or first N days.
- **Alternate/error paths:** outside milestone -> CTA hidden; cap reached -> reward stop.
- **Security/access constraints:** disclosure always shown where rewards are presented.
- **Data validation notes:** cap config includes count + days; immutable campaign ID.
- **Audit events expected:** `affiliate.link_created`, `affiliate.link_opened`, `affiliate.reward_issued`, `affiliate.reward_capped`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** cap language unambiguous; event model immutable; reward calculator deterministic; cap boundary tests needed.

## UF-23 Submit member request; creator accepts/fulfills/disputes

- **Requirement refs:** BG-05, BG-01
- **Actor/role:** Member (requester), Creator (responder)
- **Preconditions:** both accounts active.
- **Happy path:** member submits request (collab/custom/bundle); creator accepts, promises, marks fulfilled (or disputes).
- **Alternate/error paths:** creator rejects/disputes; requester notified with status reason.
- **Security/access constraints:** only involved parties and staff can view request details.
- **Data validation notes:** request type enum; notes bounded and sanitized.
- **Audit events expected:** `member_request.submitted`, `member_request.accepted`, `member_request.fulfilled`, `member_request.disputed`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** request states clear to users; state transitions enforced; notifications auditable; workflow tests required.

## UF-24 Collab studio joint publish and 60/40 settlement

- **Requirement refs:** BG-05, BG-04, BG-09
- **Actor/role:** Creator A + Creator B (+ Accountant/Admin for settlement oversight)
- **Preconditions:** both creators verified for collab studio access.
- **Happy path:** create joint session/item, both confirm, publish, payout initiated, both approve, settled with fixed 60/40 split.
- **Alternate/error paths:** partner reject -> draft/disputed; payout disagreement -> disputed state.
- **Security/access constraints:** partner confirmation required before go-live; settlement immutable after finalization.
- **Data validation notes:** fixed split rule 60/40; gross/fee/net/share fields mandatory.
- **Audit events expected:** `collab.split_initiated`, `collab.split_confirmed`, `collab.item_published`, `collab.payout_settled`, `collab.dispute_opened`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** split disclosure explicit; settlement state machine complete; ledger posting idempotent; dual-approval/dispute tests required.

## UF-25 Close account and request export

- **Requirement refs:** BG-02, BG-01
- **Actor/role:** Member/Creator
- **Preconditions:** signed in with recent auth.
- **Happy path:** user reviews sessions, acknowledges retention/access loss, requests closure, optionally requests export; tokens revoked.
- **Alternate/error paths:** legal/compliance hold -> closure deferred; missing acknowledgements -> `400`.
- **Security/access constraints:** closure revokes sessions and excludes account from active commerce/feed flows.
- **Data validation notes:** `closeReason` controlled enum; free text <=500; acknowledgement booleans required.
- **Audit events expected:** `account.closure_requested`, `account.closure_completed`, `account.export_requested`, `session.revoked`.
- **Automation mapping:** Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** user warnings clear; async deletion/export jobs tracked; revocation immediate; closure workflow tests required.

## UF-26 Admin seeding/import from approved filesystem root

- **Requirement refs:** BG-07, BG-01
- **Actor/role:** Platform admin
- **Preconditions:** staff auth; allowlisted import source and valid manifest.
- **Happy path:** admin runs seed import; system processes per-file statuses and records operation history.
- **Alternate/error paths:** non-admin caller -> `403`; invalid source path/manifest -> `400`.
- **Security/access constraints:** allowlisted paths only; checksums validated; service principals least privilege.
- **Data validation notes:** `sourcePath` under approved root; manifest maps owners/metadata.
- **Audit events expected:** `seed.batch_started`, `seed.file_imported`, `seed.file_skipped`, `seed.batch_completed`.
- **Automation mapping:** `AdminSeeding.feature`.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** operator visibility adequate; queue-safe import processing; strict path validation; admin/non-admin boundary tests pass.

## UF-27 Admin events access denial for users

- **Requirement refs:** BG-08, BG-01
- **Actor/role:** Guest/Member/Creator
- **Preconditions:** user calls admin-only event endpoint.
- **Happy path:** request denied; user receives generic authorization error; no admin event data leaked.
- **Alternate/error paths:** repeated probes trigger security throttling/monitoring.
- **Security/access constraints:** staff-only authorization policy on admin event streams; user audit feed remains self-scoped.
- **Data validation notes:** N/A (authorization boundary flow).
- **Audit events expected:** `security.admin_event_access_denied`.
- **Automation mapping:** Partial via `AdminSeeding.feature` (non-admin blocked) and `CrossAccountDefense.feature` (no foreign audit leakage). Dedicated scenario Planned.
- **Acceptance checkpoints (BA/Arch/Dev/Test):** boundary explicitly documented; policy enforced centrally; no data in error payloads; penetration-style access tests required.

---

## Coverage summary

- **Automated now:** Authentication/session, upload intake, media contracts, commerce controls, payouts, module/preview safeguards, admin seeding, cross-account defense.
- **Planned automation:** onboarding/profile, challenges, referrals, collaboration, community demand, affiliate, member request outlet, collab studio, full publishing governance gate/fan-out, closure/export, explicit admin-event denial scenario.
