export type Role = "platformAdmin" | "moderator" | "creator" | "member";

export type ConnectorType = "analytics" | "community" | "marketplace" | "payment" | "publishing";

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  token: string;
  userId: string;
  email: string;
  role: Role;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
  deviceLabel?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthChallenge {
  id: string;
  email: string;
  code: string;
  createdAt: string;
  expiresAt: string;
}

export interface OnboardingRecord {
  id: string;
  userId: string;
  workspaceName: string;
  displayName: string;
  region: "UK" | "EU" | "GLOBAL";
  acceptsTerms: boolean;
  acceptsPrivacy: boolean;
  acceptsMarketplacePolicy: boolean;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  priceMinor: number;
  currency: string;
  type: "digital" | "physical" | "service-request";
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  accountId?: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  details: string;
}

export interface ModerationCase {
  id: string;
  workspaceName: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface DashboardSummary {
  creators: number;
  items: number;
  openModerationCases: number;
  activeConnectors: number;
  monthlyGrossMinor: number;
  currency: string;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  type: ConnectorType;
  status: "template" | "ready-for-config";
  mcpCapable: boolean;
  description: string;
  scopes: string[];
}

export interface SubscriptionSummary {
  id: string;
  ownerEmail: string;
  plan: "free" | "pro";
  status: "active" | "trial" | "past_due";
  renewalDate: string;
}

export interface EarningsReportRow {
  month: string;
  grossMinor: number;
  netMinor: number;
  feesMinor: number;
  currency: string;
}

export interface LeadRecord {
  id: string;
  displayName: string;
  channel: "telegram" | "whatsapp" | "email" | "manual";
  source: "referral" | "community" | "manual-research" | "import";
  stage: "new" | "qualified" | "invited" | "active";
  aiScore: number;
  notes: string;
}

export interface QualificationRule {
  id: string;
  title: string;
  status: "required" | "recommended";
}

export interface CollaborationProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  locationDisclosureAccepted: boolean;
  promotedHighlight: boolean;
  promotedDisclosureAccepted: boolean;
  notifyOnNearby: boolean;
  availableNow: boolean;
  contactHandle: string;
  preferences: string[];
  collaborationTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NearbyMember {
  userId: string;
  displayName: string;
  avatarUrl: string;
  city: string;
  promotedHighlight: boolean;
  availableNow: boolean;
  preferences: string[];
  collaborationTypes: string[];
  distanceKm: number;
  predictedAffinity: number;
  canRequestContact: boolean;
}

export interface CollaborationRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  collaborationType: "photo" | "video" | "bundle";
  note: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt?: string;
}

export interface CollaborationAlert {
  id: string;
  userId: string;
  targetUserId: string;
  title: string;
  body: string;
  status: "new" | "opened";
  createdAt: string;
}

export interface PlatformRequest {
  id: string;
  userId: string;
  platformName: string;
  type: "publishing" | "payments" | "analytics" | "messaging" | "crm";
  note: string;
  requestedByDisplayName: string;
  status: "new" | "reviewing" | "planned";
  votes: number;
  createdAt: string;
}

export interface AffiliateCampaign {
  id: string;
  ownerUserId: string;
  ownerDisplayName: string;
  shareCode: string;
  ctaCopy: string;
  rewardPercent: number;
  capSalesCount: number;
  capDays: number;
  activeReferrals: number;
  rewardMinorPaid: number;
  currency: string;
  createdAt: string;
}

export interface MemberRequest {
  id: string;
  requesterUserId: string;
  requesterDisplayName: string;
  targetUserId: string;
  targetDisplayName: string;
  title: string;
  details: string;
  type: "content-collab" | "custom-request" | "video-bundle";
  status: "open" | "accepted" | "fulfilled" | "disputed";
  promisedByUserId?: string;
  createdAt: string;
  promisedAt?: string;
  fulfilledAt?: string;
}

export type StudioSessionStatus =
  | "draft"
  | "pending_partner_confirm"
  | "both_confirmed"
  | "live"
  | "payout_initiated"
  | "payout_approved_creator_a"
  | "payout_approved_creator_b"
  | "settled"
  | "disputed";

export interface StudioSession {
  id: string;
  title: string;
  initiatorUserId: string;
  creatorAUserId: string;
  creatorADisplayName: string;
  creatorBUserId: string;
  creatorBDisplayName: string;
  contentType: "photo" | "video" | "stream";
  sessionMode: "remote-stream" | "upload-bundle";
  status: StudioSessionStatus;
  grossMinor: number;
  feesMinor: number;
  netMinor: number;
  creatorAShareMinor: number;
  creatorBShareMinor: number;
  creatorASharePercent: 60;
  creatorBSharePercent: 40;
  partnerConfirmed: boolean;
  createdAt: string;
}

export interface StudioTimelineEntry {
  id: string;
  sessionId: string;
  timestamp: string;
  actorDisplayName: string;
  eventType:
    | "request.accepted"
    | "split.initiated"
    | "split.confirmed"
    | "session.started"
    | "session.ended"
    | "item.published"
    | "purchase.recorded"
    | "payout.initiated"
    | "payout.approved"
    | "payout.settled"
    | "session.disputed";
  description: string;
}

export type PrivacyVisibility = "private" | "followers" | "public";
export type PublishState = "draft" | "published";
export type MediaLifecycleStatus = "pending" | "processing" | "ready" | "deleted";

export interface UserAccountProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  preferences: {
    contentTags: string[];
    collaborationInterests: string[];
    languages: string[];
  };
  privacy: {
    profileVisibility: PrivacyVisibility;
    discoverable: boolean;
    showActivity: boolean;
    allowDirectMessages: boolean;
  };
  contact: {
    supportEmail: string;
    emailOptIn: boolean;
    marketingOptIn: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CloseAccountState {
  status: "active" | "requested" | "closed";
  requestedAt?: string;
  requestedBySessionId?: string;
  closedAt?: string;
  reason?: string;
  retentionAcknowledged?: boolean;
  accessLossAcknowledged?: boolean;
}

export interface AccountSettings {
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    product: boolean;
    payouts: boolean;
    security: boolean;
  };
  deviceSync: {
    enabled: boolean;
    canonicalUpdatedAt: string;
    lastSyncedSessionId?: string;
    sessionCount: number;
  };
  payoutPreferences: {
    settlementCurrency: string;
    schedule: "manual" | "weekly" | "monthly";
    methodStatus: "not-configured" | "pending" | "ready";
  };
  closeAccount: CloseAccountState;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSessionView {
  id: string;
  userId: string;
  deviceLabel: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
  current: boolean;
}

export interface ConsentMetadata {
  performerCount: number;
  allAdultsConfirmed: boolean;
  rightsConfirmed: boolean;
  consentCapturedAt: string;
  consentDocumentName: string;
  recordRetentionYears: number;
  notes: string;
}

export interface PolicyArtifactRecord {
  id: string;
  ownerId: string;
  folderName: string;
  documentName: string;
  fileName: string;
  uri: string;
  createdAt: string;
}

export interface MediaCollection {
  id: string;
  ownerId: string;
  folderName: string;
  title: string;
  description: string;
  visibility: PrivacyVisibility;
  publishState: PublishState;
  priceMinor: number;
  currency: string;
  soldCount: number;
  earnedMinor: number;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MediaItem {
  id: string;
  ownerId: string;
  collectionId: string;
  folderName: string;
  title: string;
  description: string;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video";
  uploadStatus: MediaLifecycleStatus;
  publishState: PublishState;
  priceMinor: number;
  currency: string;
  soldCount: number;
  earnedMinor: number;
  blobUrl: string;
  uploadUrl?: string;
  uploadMode: "azure" | "memory";
  expiresAt?: string;
  requiredHeaders?: Record<string, string>;
  backgroundStreamId: string;
  backgroundUpdatedAt: string;
  consent: ConsentMetadata;
  policyArtifact: PolicyArtifactRecord;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface UploadStatusEvent {
  id: string;
  ownerId: string;
  mediaItemId: string;
  status: MediaLifecycleStatus;
  message: string;
  createdAt: string;
}

export interface EarningsSeriesPoint {
  periodStart: string;
  grossMinor: number;
  netMinor: number;
  feesMinor: number;
  soldCount: number;
  currency: string;
}

export interface AccountEarningsSummary {
  accountId: string;
  totalGrossMinor: number;
  totalNetMinor: number;
  totalFeesMinor: number;
  availableForPayoutMinor: number;
  pendingPayoutMinor: number;
  paidOutMinor: number;
  currency: string;
  rangeStart: string;
  rangeEnd: string;
}

export interface PayoutRequest {
  id: string;
  ownerId: string;
  amountMinor: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "rejected";
  note: string;
  requestedAt: string;
  processedAt?: string;
}

export interface VerificationStep {
  code: string;
  title: string;
  status: "complete" | "required" | "pending";
}

export interface VerificationReadiness {
  userId: string;
  status: "action-required" | "pending-review" | "ready";
  identityStatus: "not-started" | "pending" | "verified";
  payoutStatus: "not-configured" | "pending" | "ready";
  consentStatus: "missing" | "partial" | "complete";
  requiredSteps: VerificationStep[];
  updatedAt: string;
}
