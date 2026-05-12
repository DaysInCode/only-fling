import { z } from "zod";

export const authRequestSchema = z.object({
  email: z.string().email(),
});

export const authVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  deviceName: z.string().min(2).max(80).optional(),
});

export const onboardingSchema = z.object({
  workspaceName: z.string().min(2).max(80),
  displayName: z.string().min(2).max(80),
  region: z.enum(["UK", "EU", "GLOBAL"]),
  acceptsTerms: z.literal(true),
  acceptsPrivacy: z.literal(true),
  acceptsMarketplacePolicy: z.literal(true),
});

export const itemSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(400),
  priceMinor: z.number().int().positive().max(1000000),
  currency: z.string().length(3).default("GBP"),
  type: z.enum(["digital", "physical", "service-request"]).default("digital"),
});

export const uploadSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
});

export const collaborationProfileSchema = z.object({
  displayName: z.string().min(2).max(80),
  avatarUrl: z.string().min(1).max(500),
  bio: z.string().min(10).max(300),
  city: z.string().min(2).max(80),
  countryCode: z.string().length(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationDisclosureAccepted: z.boolean(),
  promotedHighlight: z.boolean(),
  promotedDisclosureAccepted: z.boolean(),
  notifyOnNearby: z.boolean(),
  availableNow: z.boolean(),
  contactHandle: z.string().min(2).max(120),
  preferences: z.array(z.string().min(2).max(40)).max(8),
  collaborationTypes: z.array(z.enum(["photo", "video", "bundle"])).min(1).max(3),
}).superRefine((value, context) => {
  if (value.promotedHighlight && !value.promotedDisclosureAccepted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["promotedDisclosureAccepted"],
      message: "Paid highlighting requires the additional location disclosure.",
    });
  }
});

export const collaborationRequestSchema = z.object({
  targetUserId: z.string().min(2).max(120),
  collaborationType: z.enum(["photo", "video", "bundle"]),
  note: z.string().min(5).max(220),
});

export const collaborationResponseSchema = z.object({
  requestId: z.string().min(2).max(120),
  accept: z.boolean(),
});

export const platformRequestSchema = z.object({
  platformName: z.string().min(2).max(80),
  type: z.enum(["publishing", "payments", "analytics", "messaging", "crm"]),
  note: z.string().min(5).max(240),
});

export const affiliateCampaignSchema = z.object({
  ctaCopy: z.string().min(8).max(120),
  rewardPercent: z.number().int().min(1).max(40),
  capSalesCount: z.number().int().min(1).max(50),
  capDays: z.number().int().min(1).max(90),
});

export const memberRequestSchema = z.object({
  targetUserId: z.string().min(2).max(120),
  title: z.string().min(4).max(100),
  details: z.string().min(8).max(300),
  type: z.enum(["content-collab", "custom-request", "video-bundle"]),
});

export const memberRequestActionSchema = z.object({
  requestId: z.string().min(2).max(120),
  action: z.enum(["accept", "fulfill", "dispute"]),
});

export const studioSessionSchema = z.object({
  title: z.string().min(4).max(120),
  partnerUserId: z.string().min(2).max(120),
  contentType: z.enum(["photo", "video", "stream"]),
  sessionMode: z.enum(["remote-stream", "upload-bundle"]),
  grossMinor: z.number().int().positive().max(5000000),
  feesMinor: z.number().int().min(0).max(1000000),
});

export const studioSessionActionSchema = z.object({
  sessionId: z.string().min(2).max(120),
  action: z.enum(["confirm-split", "start-session", "initiate-payout", "approve-payout", "dispute"]),
});

const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional().default("");
const isoDateString = z.string().datetime({ offset: true });

export const accountProfileSchema = z.object({
  displayName: trimmedString(2, 80),
  bio: optionalTrimmedString(500),
  avatarUrl: z.string().trim().max(500).default(""),
  preferences: z.object({
    contentTags: z.array(trimmedString(2, 32)).max(12),
    collaborationInterests: z.array(trimmedString(2, 32)).max(8),
    languages: z.array(trimmedString(2, 24)).max(6),
  }),
  privacy: z.object({
    profileVisibility: z.enum(["private", "followers", "public"]),
    discoverable: z.boolean(),
    showActivity: z.boolean(),
    allowDirectMessages: z.boolean(),
  }),
  contact: z.object({
    supportEmail: z.string().email(),
    emailOptIn: z.boolean(),
    marketingOptIn: z.boolean(),
  }),
});

export const accountSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    product: z.boolean(),
    payouts: z.boolean(),
    security: z.boolean(),
  }),
  deviceSync: z.object({
    enabled: z.boolean(),
    lastSyncedSessionId: z.string().min(2).max(120).optional(),
  }),
  payoutPreferences: z.object({
    settlementCurrency: z.string().trim().length(3),
    schedule: z.enum(["manual", "weekly", "monthly"]),
    methodStatus: z.enum(["not-configured", "pending", "ready"]),
  }),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(2).max(120),
});

export const closeAccountSchema = z.object({
  action: z.enum(["request", "close"]),
  confirmDisplayName: trimmedString(2, 80),
  confirmEmail: z.string().email(),
  confirmRetentionAcknowledged: z.literal(true),
  confirmAccessLossAcknowledged: z.literal(true),
  reason: optionalTrimmedString(500),
});

export const mediaCollectionCreateSchema = z.object({
  folderName: trimmedString(2, 80).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_\s]{1,79}$/),
  title: trimmedString(2, 120),
  description: optionalTrimmedString(400),
  visibility: z.enum(["private", "followers", "public"]).default("private"),
  publishState: z.enum(["draft", "published"]).default("draft"),
  priceMinor: z.number().int().min(0).max(5_000_000),
  currency: z.string().trim().length(3).default("GBP"),
});

export const mediaCollectionUpdateSchema = mediaCollectionCreateSchema.extend({
  collectionId: z.string().min(2).max(120),
});

export const mediaCollectionDeleteSchema = z.object({
  collectionId: z.string().min(2).max(120),
});

export const mediaConsentSchema = z.object({
  performerCount: z.number().int().min(1).max(8),
  allAdultsConfirmed: z.literal(true),
  rightsConfirmed: z.literal(true),
  consentCapturedAt: isoDateString,
  consentDocumentName: trimmedString(2, 80).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_\s]{1,79}$/),
  recordRetentionYears: z.number().int().min(1).max(10),
  notes: optionalTrimmedString(300),
});

export const mediaPolicySchema = z.object({
  folderName: trimmedString(2, 80).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_\s]{1,79}$/),
  documentName: trimmedString(2, 80).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_\s]{1,79}$/),
  termsSummary: trimmedString(10, 1000),
  pricingSummary: trimmedString(5, 500),
  additionalNotes: optionalTrimmedString(500),
});

export const mediaUploadIntakeSchema = z.object({
  collectionId: z.string().min(2).max(120),
  title: trimmedString(2, 120),
  description: optionalTrimmedString(500),
  fileName: trimmedString(1, 200),
  contentType: trimmedString(3, 120),
  mediaType: z.enum(["image", "video"]),
  fileSizeBytes: z.number().int().positive().max(1_000_000_000),
  priceMinor: z.number().int().min(0).max(5_000_000),
  currency: z.string().trim().length(3).default("GBP"),
  publishState: z.enum(["draft", "published"]).default("draft"),
  consent: mediaConsentSchema,
  policy: mediaPolicySchema,
});

export const mediaItemUpdateSchema = z.object({
  mediaItemId: z.string().min(2).max(120),
  title: trimmedString(2, 120),
  description: optionalTrimmedString(500),
  priceMinor: z.number().int().min(0).max(5_000_000),
  currency: z.string().trim().length(3),
  publishState: z.enum(["draft", "published"]),
});

export const mediaItemDeleteSchema = z.object({
  mediaItemId: z.string().min(2).max(120),
});

export const payoutsRequestSchema = z.object({
  amountMinor: z.number().int().min(1_000).max(5_000_000),
  note: optionalTrimmedString(200),
});
