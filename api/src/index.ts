import { app } from "@azure/functions";
import { auditLog } from "./functions/admin";
import { adminCollaborationOverview } from "./functions/admin-collaboration";
import { adminEarnings, adminSubscriptions, adminUsers } from "./functions/admin-ops";
import { me, requestLink, verifyLink } from "./functions/auth";
import {
  collaborationAlerts,
  collaborationNearby,
  collaborationProfile,
  collaborationRequest,
  collaborationRespond,
} from "./functions/collaboration";
import { listConnectors } from "./functions/connectors";
import { crmLeads } from "./functions/crm";
import { dashboardSummary } from "./functions/dashboard";
import { health } from "./functions/health";
import { items } from "./functions/items";
import { moderationQueue } from "./functions/moderation";
import { completeOnboarding } from "./functions/onboarding";
import { adminPlatformRequests, platformRequests } from "./functions/platform-requests";
import { qualification } from "./functions/qualification";
import { presignUpload } from "./functions/uploads";

app.http("health", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "health",
  handler: health,
});

app.http("connectors", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "connectors",
  handler: listConnectors,
});

app.http("auth-request-link", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/request-link",
  handler: requestLink,
});

app.http("auth-verify", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/verify",
  handler: verifyLink,
});

app.http("me", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "me",
  handler: me,
});

app.http("onboarding-complete", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "onboarding/complete",
  handler: completeOnboarding,
});

app.http("items", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "items",
  handler: items,
});

app.http("uploads-presign", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "uploads/presign",
  handler: presignUpload,
});

app.http("dashboard-summary", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "dashboard/summary",
  handler: dashboardSummary,
});

app.http("moderation-queue", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "moderation/queue",
  handler: moderationQueue,
});

app.http("admin-audit-log", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/audit-log",
  handler: auditLog,
});

app.http("admin-users", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/users",
  handler: adminUsers,
});

app.http("admin-subscriptions", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/subscriptions",
  handler: adminSubscriptions,
});

app.http("admin-earnings", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/reports/earnings",
  handler: adminEarnings,
});

app.http("qualification-rules", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "qualification/rules",
  handler: qualification,
});

app.http("crm-leads", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "crm/leads",
  handler: crmLeads,
});

app.http("collaboration-profile", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "collaboration/profile",
  handler: collaborationProfile,
});

app.http("collaboration-nearby", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "collaboration/nearby",
  handler: collaborationNearby,
});

app.http("collaboration-request", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "collaboration/request",
  handler: collaborationRequest,
});

app.http("collaboration-respond", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "collaboration/respond",
  handler: collaborationRespond,
});

app.http("collaboration-alerts", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "collaboration/alerts",
  handler: collaborationAlerts,
});

app.http("admin-collaboration-overview", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/collaboration",
  handler: adminCollaborationOverview,
});

app.http("platform-requests", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "platform-requests",
  handler: platformRequests,
});

app.http("admin-platform-requests", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/platform-requests",
  handler: adminPlatformRequests,
});
