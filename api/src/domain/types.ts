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
  token: string;
  userId: string;
  email: string;
  role: Role;
  expiresAt: string;
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
