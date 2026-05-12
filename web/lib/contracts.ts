export type Role = "platformAdmin" | "moderator" | "creator" | "member";
export type PrivacyVisibility = "private" | "followers" | "public";
export type PublishState = "draft" | "published";
export type VerificationStatus = "action-required" | "pending-review" | "ready";
export type IdentityStatus = "not-started" | "pending" | "verified";
export type PayoutMethodStatus = "not-configured" | "pending" | "ready";
export type UploadLifecycle = "pending" | "processing" | "ready" | "deleted";

export interface MeResponse {
  user: {
    email: string;
    role: Role;
    userId: string;
    sessionId: string;
  };
}

export interface AuthRequestResponse {
  message: string;
  developmentCode?: string;
}

export interface AuthVerifyResponse {
  token: string;
  user: {
    email: string;
    role: Role;
    userId: string;
  };
}

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

export interface AccountProfileResponse {
  profile: UserAccountProfile;
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
    methodStatus: PayoutMethodStatus;
  };
  purchasePreferences: {
    ageVerifiedAdult: boolean;
    labelAsEntertainment: boolean;
    entertainmentLabelValue: string;
  };
  closeAccount: CloseAccountState;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSettingsResponse {
  settings: AccountSettings;
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

export interface AccountSessionsResponse {
  sessions: AccountSessionView[];
  deviceSync: AccountSettings["deviceSync"];
}

export interface CloseAccountResponse {
  closeAccount: CloseAccountState;
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

export interface AuditResponse {
  events: AuditEvent[];
}

export interface VerificationStep {
  code: string;
  title: string;
  status: "complete" | "required" | "pending";
}

export interface VerificationReadiness {
  userId: string;
  status: VerificationStatus;
  identityStatus: IdentityStatus;
  payoutStatus: PayoutMethodStatus;
  consentStatus: "missing" | "partial" | "complete";
  requiredSteps: VerificationStep[];
  updatedAt: string;
}

export interface VerificationReadinessResponse {
  readiness: VerificationReadiness;
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

export interface ConsentMetadata {
  performerCount: number;
  allAdultsConfirmed: boolean;
  rightsConfirmed: boolean;
  consentCapturedAt: string;
  consentDocumentName: string;
  recordRetentionYears: number;
  notes: string;
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

export interface MediaCollectionsResponse {
  collections: MediaCollection[];
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
  ageRating: "general" | "adult";
  uploadStatus: UploadLifecycle;
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
  preview: {
    status: string;
    snapshotBlobUrl?: string;
    previewBlobUrl?: string;
    posterFileName?: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MediaCollectionItemsResponse {
  items: MediaItem[];
}

export interface UploadStatusEvent {
  id: string;
  ownerId: string;
  mediaItemId: string;
  status: UploadLifecycle;
  message: string;
  createdAt: string;
}

export interface UploadEventsResponse {
  events: UploadStatusEvent[];
}

export interface UploadTarget {
  mode: "azure" | "memory";
  uploadUrl: string;
  blobUrl: string;
  expiresAt?: string;
  requiredHeaders?: Record<string, string>;
}

export interface ProcessingWorkItem {
  id: string;
  ownerId: string;
  mediaItemId: string;
  queueName: string;
  jobType: string;
  status: string;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadIntakeResponse {
  mediaItem: MediaItem;
  upload: UploadTarget;
  workItems?: ProcessingWorkItem[];
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

export interface EarningsSeriesPoint {
  periodStart: string;
  grossMinor: number;
  netMinor: number;
  feesMinor: number;
  soldCount: number;
  currency: string;
}

export interface EarningsSummaryResponse {
  summary: AccountEarningsSummary;
  timeseries: EarningsSeriesPoint[];
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

export interface PayoutsResponse {
  payouts: PayoutRequest[];
  summary: AccountEarningsSummary;
}

export interface PayoutRequestResponse {
  payout: PayoutRequest;
}

export interface AccountWallet {
  userId: string;
  creditsMinor: number;
  heldMinor: number;
  spentMinor: number;
  currency: string;
  updatedAt: string;
}

export interface AccountWalletResponse {
  wallet: AccountWallet;
}

export interface InvoiceLine {
  description: string;
  amountMinor: number;
  currency: string;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
  purchaseId: string;
  mediaItemId: string;
  status: string;
  label: string;
  totalMinor: number;
  currency: string;
  lines: InvoiceLine[];
  createdAt: string;
  settledAt?: string;
}

export interface MediaPurchaseRecord {
  id: string;
  buyerId: string;
  sellerId: string;
  mediaItemId: string;
  invoiceId: string;
  status: string;
  paymentMethod: "credits" | "stripeCheckout";
  adultContent: boolean;
  amountMinor: number;
  currency: string;
  externalReference?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentSessionContract {
  provider: string;
  status: string;
  configured: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  hints: Record<string, string>;
}

export interface AccountInvoicesResponse {
  invoices: InvoiceRecord[];
  purchases: MediaPurchaseRecord[];
}

export interface MediaPurchaseResponse {
  purchase: MediaPurchaseRecord;
  invoice: InvoiceRecord;
  wallet: AccountWallet;
  paymentSession?: PaymentSessionContract;
}

export interface PluginPurchaseBehavior {
  defaultPurchaseMethod: "credits" | "stripeCheckout";
  allowedPurchaseMethods: Array<"credits" | "stripeCheckout">;
  requireAgeVerificationForAdultContent: boolean;
  allowEntertainmentLabeling: boolean;
  minimumPurchaseMinor: number;
  maximumPurchaseMinor: number;
}

export interface PluginRuntimeState {
  id: string;
  displayName: string;
  category: string;
  status: string;
  description: string;
  enabled: boolean;
  clientVisible: boolean;
  adminOnly: boolean;
  purchaseBehavior: PluginPurchaseBehavior;
  payoutGateway: {
    defaultGateway: string;
    allowedGateways: string[];
  };
  usage: {
    usageCount: number;
    lastUsedAt?: string;
  };
  configurationHints: Record<string, string>;
}

export interface ActivePluginsResponse {
  plugins: PluginRuntimeState[];
}

export interface SeedImportOperation {
  id: string;
  actorUserId: string;
  source: string;
  status: string;
  appliedCounts: Record<string, number>;
  createdAt: string;
}

export interface SeedHistoryResponse {
  operations: SeedImportOperation[];
}

export interface MonitoringSummary {
  purchaseCount: number;
  pendingProcessingJobs: number;
  seedImports: number;
  telemetryEvents: number;
  updatedAt: string;
}

export interface MonitoringEvent {
  id: string;
  category: string;
  name: string;
  status: string;
  createdAt: string;
  detail: string;
}

export interface MonitoringSummaryResponse {
  summary: MonitoringSummary;
}

export interface MonitoringEventsResponse {
  events: MonitoringEvent[];
}

export interface ProcessingQueueResponse {
  workItems: ProcessingWorkItem[];
}
