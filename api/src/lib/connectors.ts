import type { ConnectorDefinition } from "../domain/types";

export const connectors: ConnectorDefinition[] = [
  {
    id: "stripe",
    name: "Stripe Payments",
    type: "payment",
    status: "ready-for-config",
    mcpCapable: true,
    description: "Payment provider template with webhook and checkout extension points.",
    scopes: ["checkout", "webhooks", "refunds", "commission-ledger"],
  },
  {
    id: "instagram",
    name: "Instagram Connector",
    type: "publishing",
    status: "template",
    mcpCapable: true,
    description: "Connector manifest for creator profile linking and analytics ingestion.",
    scopes: ["account-linking", "publishing-metadata", "analytics-read"],
  },
  {
    id: "tiktok",
    name: "TikTok Connector",
    type: "publishing",
    status: "template",
    mcpCapable: true,
    description: "Short-form platform connector template with policy gate placeholders.",
    scopes: ["account-linking", "analytics-read", "content-queue"],
  },
  {
    id: "onlyfans",
    name: "OnlyFans Connector",
    type: "publishing",
    status: "template",
    mcpCapable: true,
    description: "Restricted connector manifest for compliant creator account operations.",
    scopes: ["account-linking", "metrics-read", "compliance-checks"],
  },
  {
    id: "pornhub",
    name: "Pornhub Connector",
    type: "publishing",
    status: "template",
    mcpCapable: true,
    description: "Connector manifest placeholder with manual approval and compliance hooks.",
    scopes: ["account-linking", "upload-queue", "moderation-checks"],
  },
];
