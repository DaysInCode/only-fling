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
