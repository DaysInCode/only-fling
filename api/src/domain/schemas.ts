import { z } from "zod";

export const authRequestSchema = z.object({
  email: z.string().email(),
});

export const authVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
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
