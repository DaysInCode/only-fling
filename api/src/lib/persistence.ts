import { TableClient } from "@azure/data-tables";
import { createId } from "@paralleldrive/cuid2";
import type {
  AuditEvent,
  AuthChallenge,
  CatalogItem,
  CollaborationAlert,
  CollaborationProfile,
  CollaborationRequest,
  DashboardSummary,
  EarningsReportRow,
  LeadRecord,
  ModerationCase,
  NearbyMember,
  OnboardingRecord,
  QualificationRule,
  Role,
  SessionRecord,
  SubscriptionSummary,
  UserProfile,
} from "../domain/types";
import { config } from "./config";

type TableName = "users" | "sessions" | "authchallenges" | "onboarding" | "items" | "auditlog";

const tableCache = new Map<TableName, Promise<TableClient>>();

const memory = (() => {
  const now = new Date().toISOString();
  const adminUser: UserProfile = {
    id: "user-admin",
    email: config.adminEmail,
    role: "platformAdmin",
    displayName: "Platform Admin",
    createdAt: now,
  };

  const creatorOne: UserProfile = {
    id: "user-creator-anna",
    email: "anna@example.com",
    role: "creator",
    displayName: "Anna",
    createdAt: now,
  };

  const creatorTwo: UserProfile = {
    id: "user-creator-luca",
    email: "luca@example.com",
    role: "creator",
    displayName: "Luca",
    createdAt: now,
  };

  return {
    users: new Map<string, UserProfile>([
      [adminUser.id, adminUser],
      [creatorOne.id, creatorOne],
      [creatorTwo.id, creatorTwo],
    ]),
    usersByEmail: new Map<string, UserProfile>([
      [normalizeKey(adminUser.email), adminUser],
      [normalizeKey(creatorOne.email), creatorOne],
      [normalizeKey(creatorTwo.email), creatorTwo],
    ]),
    sessions: new Map<string, SessionRecord>(),
    challenges: new Map<string, AuthChallenge[]>(),
    onboarding: new Map<string, OnboardingRecord>(),
    items: new Map<string, CatalogItem>([
      [
        "item-starter-template",
        {
          id: "item-starter-template",
          ownerId: adminUser.id,
          title: "Community Starter Template",
          description: "A digital starter offer with commission-ready marketplace support.",
          priceMinor: 2900,
          currency: "GBP",
          type: "digital",
          createdAt: now,
        },
      ],
      [
        "item-review-pack",
        {
          id: "item-review-pack",
          ownerId: adminUser.id,
          title: "Launch Review Pack",
          description: "A request-based service slot for account reviews, workflow setup, and launch guidance.",
          priceMinor: 7900,
          currency: "GBP",
          type: "service-request",
          createdAt: now,
        },
      ],
    ]),
    auditLog: [
      {
        id: "audit-bootstrap",
        actorId: adminUser.id,
        action: "system.bootstrap",
        targetType: "platform",
        targetId: "starter",
        createdAt: now,
        details: "Initialized starter platform state.",
      },
    ] satisfies AuditEvent[],
    collaborationProfiles: new Map<string, CollaborationProfile>([
      [
        creatorOne.id,
        {
          userId: creatorOne.id,
          displayName: "Anna",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
          bio: "Available for creator shoots with an upbeat style and quick collaboration turnaround.",
          city: "Bristol",
          countryCode: "GB",
          latitude: 51.4545,
          longitude: -2.5879,
          locationDisclosureAccepted: true,
          promotedHighlight: true,
          promotedDisclosureAccepted: true,
          notifyOnNearby: true,
          availableNow: true,
          contactHandle: "@anna-collabs",
          preferences: ["editorial", "fitness", "glamour"],
          collaborationTypes: ["photo", "video"],
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        creatorTwo.id,
        {
          userId: creatorTwo.id,
          displayName: "Luca",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
          bio: "Interested in short-form collaborative sets and promo bundles with clear planning.",
          city: "Bath",
          countryCode: "GB",
          latitude: 51.3813,
          longitude: -2.359,
          locationDisclosureAccepted: true,
          promotedHighlight: false,
          promotedDisclosureAccepted: false,
          notifyOnNearby: true,
          availableNow: true,
          contactHandle: "@luca-content",
          preferences: ["lifestyle", "duo", "promo"],
          collaborationTypes: ["photo", "bundle"],
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    collaborationRequests: new Map<string, CollaborationRequest>(),
    collaborationAlerts: new Map<string, CollaborationAlert[]>(),
  };
})();

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

async function getTable(tableName: TableName) {
  let existing = tableCache.get(tableName);
  if (!existing) {
    existing = (async () => {
      const client = TableClient.fromConnectionString(config.storageConnectionString, tableName);
      await client.createTable();
      return client;
    })();
    tableCache.set(tableName, existing);
  }

  return existing;
}

async function upsertRecord(tableName: TableName, partitionKey: string, rowKey: string, payload: unknown) {
  const client = await getTable(tableName);
  await client.upsertEntity({
    partitionKey,
    rowKey,
    payload: JSON.stringify(payload),
    updatedAt: new Date().toISOString(),
  });
}

async function getRecord<T>(tableName: TableName, partitionKey: string, rowKey: string): Promise<T | null> {
  const client = await getTable(tableName);
  try {
    const entity = await client.getEntity<{ payload: string }>(partitionKey, rowKey);
    return JSON.parse(entity.payload) as T;
  } catch {
    return null;
  }
}

async function listRecords<T>(tableName: TableName, partitionKey?: string): Promise<T[]> {
  const client = await getTable(tableName);
  const iterator = partitionKey
    ? client.listEntities<{ payload: string }>({ queryOptions: { filter: `PartitionKey eq '${partitionKey}'` } })
    : client.listEntities<{ payload: string }>();

  const results: T[] = [];
  for await (const entity of iterator) {
    results.push(JSON.parse(entity.payload) as T);
  }
  return results;
}

function shouldTryAzureStorage() {
  return Boolean(config.storageConnectionString);
}

async function withFallback<T>(primary: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!shouldTryAzureStorage()) {
    return fallback();
  }

  try {
    return await primary();
  } catch {
    return fallback();
  }
}

export async function createChallenge(email: string) {
  const record: AuthChallenge = {
    id: createId(),
    email,
    code: String(Math.floor(100000 + Math.random() * 900000)),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("authchallenges", normalizeKey(email), record.id, record);
      return record;
    },
    () => {
      const key = normalizeKey(email);
      const entries = memory.challenges.get(key) ?? [];
      entries.push(record);
      memory.challenges.set(key, entries);
      return record;
    },
  );
}

export async function verifyChallenge(email: string, code: string) {
  const key = normalizeKey(email);
  const now = new Date().toISOString();

  return withFallback(
    async () => {
      const entries = await listRecords<AuthChallenge>("authchallenges", key);
      return (
        entries
          .filter((entry) => entry.code === code && entry.expiresAt > now)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
      );
    },
    () => {
      const entries = memory.challenges.get(key) ?? [];
      return (
        entries
          .filter((entry) => entry.code === code && entry.expiresAt > now)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
      );
    },
  );
}

export async function getOrCreateUser(email: string) {
  const normalizedEmail = normalizeKey(email);

  return withFallback(
    async () => {
      const existing = await getRecord<UserProfile>("users", normalizedEmail, "profile");
      if (existing) {
        return existing;
      }

      const created: UserProfile = {
        id: `user-${createId()}`,
        email,
        role: email.toLowerCase() === config.adminEmail.toLowerCase() ? "platformAdmin" : "creator",
        displayName: email.split("@")[0],
        createdAt: new Date().toISOString(),
      };
      await upsertRecord("users", normalizedEmail, "profile", created);
      return created;
    },
    () => {
      const existing = memory.usersByEmail.get(normalizedEmail);
      if (existing) {
        return existing;
      }

      const created: UserProfile = {
        id: `user-${createId()}`,
        email,
        role: email.toLowerCase() === config.adminEmail.toLowerCase() ? "platformAdmin" : "creator",
        displayName: email.split("@")[0],
        createdAt: new Date().toISOString(),
      };
      memory.users.set(created.id, created);
      memory.usersByEmail.set(normalizedEmail, created);
      return created;
    },
  );
}

export async function createSession(user: UserProfile) {
  const session: SessionRecord = {
    token: createId(),
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("sessions", "session", session.token, session);
      return session;
    },
    () => {
      memory.sessions.set(session.token, session);
      return session;
    },
  );
}

export async function getSession(token: string) {
  return withFallback(
    async () => getRecord<SessionRecord>("sessions", "session", token),
    () => memory.sessions.get(token) ?? null,
  );
}

export async function saveOnboarding(userId: string, input: Omit<OnboardingRecord, "id" | "userId" | "createdAt">) {
  const record: OnboardingRecord = {
    id: `onboarding-${createId()}`,
    userId,
    createdAt: new Date().toISOString(),
    ...input,
  };

  return withFallback(
    async () => {
      await upsertRecord("onboarding", userId, record.id, record);
      return record;
    },
    () => {
      memory.onboarding.set(userId, record);
      return record;
    },
  );
}

export async function listItems() {
  return withFallback(
    async () => {
      const items = await listRecords<CatalogItem>("items");
      return items.length ? items : Array.from(memory.items.values());
    },
    () => Array.from(memory.items.values()),
  );
}

export async function createItem(
  userId: string,
  input: Omit<CatalogItem, "id" | "ownerId" | "createdAt">,
) {
  const item: CatalogItem = {
    id: `item-${createId()}`,
    ownerId: userId,
    createdAt: new Date().toISOString(),
    ...input,
  };

  return withFallback(
    async () => {
      await upsertRecord("items", userId, item.id, item);
      return item;
    },
    () => {
      memory.items.set(item.id, item);
      return item;
    },
  );
}

export async function appendAuditEvent(actorId: string, action: string, targetType: string, targetId: string, details: string) {
  const event: AuditEvent = {
    id: `audit-${createId()}`,
    actorId,
    action,
    targetType,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("auditlog", actorId, event.id, event);
      return event;
    },
    () => {
      memory.auditLog.unshift(event);
      return event;
    },
  );
}

export async function listAuditEvents() {
  return withFallback(
    async () => {
      const events = await listRecords<AuditEvent>("auditlog");
      return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    () => memory.auditLog,
  );
}

export async function listModerationCases(): Promise<ModerationCase[]> {
  return [
    {
      id: "case-media-review",
      workspaceName: "Launch Cohort",
      reason: "Manual review required for first upload.",
      status: "open",
      createdAt: new Date().toISOString(),
    },
    {
      id: "case-policy-ack",
      workspaceName: "Community Sellers",
      reason: "Marketplace policy acknowledgement missing for one draft item.",
      status: "open",
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [items, moderationCases] = await Promise.all([listItems(), listModerationCases()]);
  return {
    creators: memory.users.size,
    items: items.length,
    openModerationCases: moderationCases.filter((entry) => entry.status === "open").length,
    activeConnectors: 5,
    monthlyGrossMinor: 186400,
    currency: "GBP",
  };
}

export async function requireRole(session: SessionRecord | null, allowed: Role[]) {
  if (!session || !allowed.includes(session.role)) {
    throw new Error("forbidden");
  }
}

export async function listUsers() {
  return Array.from(memory.users.values());
}

export async function listSubscriptions(): Promise<SubscriptionSummary[]> {
  return [
    {
      id: "sub-admin-pro",
      ownerEmail: config.adminEmail,
      plan: "pro",
      status: "active",
      renewalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "sub-creator-free",
      ownerEmail: "creator@example.com",
      plan: "free",
      status: "trial",
      renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export async function getEarningsReport(): Promise<EarningsReportRow[]> {
  return [
    {
      month: "2026-03",
      grossMinor: 126500,
      netMinor: 111320,
      feesMinor: 15180,
      currency: "GBP",
    },
    {
      month: "2026-04",
      grossMinor: 186400,
      netMinor: 164032,
      feesMinor: 22368,
      currency: "GBP",
    },
  ];
}

export async function listLeads(): Promise<LeadRecord[]> {
  return [
    {
      id: "lead-telegram-starter",
      displayName: "Creator cohort lead",
      channel: "telegram",
      source: "community",
      stage: "qualified",
      aiScore: 82,
      notes: "Opt-in community lead with strong first-week activation signals.",
    },
    {
      id: "lead-whatsapp-referral",
      displayName: "Referral invite chain",
      channel: "whatsapp",
      source: "referral",
      stage: "invited",
      aiScore: 77,
      notes: "Came through an existing creator referral, ready for manual outreach.",
    },
  ];
}

export async function qualificationRules(): Promise<QualificationRule[]> {
  return [
    {
      id: "policy-bundle",
      title: "Terms, privacy, and marketplace policy accepted",
      status: "required",
    },
    {
      id: "adult-declaration",
      title: "Adult-only declaration recorded for the account",
      status: "required",
    },
    {
      id: "profile-complete",
      title: "Display name, workspace, and region completed",
      status: "required",
    },
    {
      id: "first-party-rights",
      title: "Ownership / rights declaration attached to the upload",
      status: "required",
    },
    {
      id: "manual-review",
      title: "Flag unusual uploads for manual moderation before publishing",
      status: "recommended",
    },
  ];
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(
  leftLatitude: number,
  leftLongitude: number,
  rightLatitude: number,
  rightLongitude: number,
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(rightLatitude - leftLatitude);
  const dLon = toRadians(rightLongitude - leftLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(leftLatitude)) *
      Math.cos(toRadians(rightLatitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function predictedAffinity(viewer: CollaborationProfile, candidate: CollaborationProfile) {
  const sharedPreferences = viewer.preferences.filter((item) => candidate.preferences.includes(item)).length;
  const sharedTypes = viewer.collaborationTypes.filter((item) => candidate.collaborationTypes.includes(item)).length;
  const bonus = candidate.promotedHighlight ? 10 : 0;
  return Math.min(100, sharedPreferences * 20 + sharedTypes * 15 + bonus + (candidate.availableNow ? 10 : 0));
}

export async function getCollaborationProfile(userId: string) {
  return memory.collaborationProfiles.get(userId) ?? null;
}

export async function saveCollaborationProfile(
  userId: string,
  input: Omit<CollaborationProfile, "userId" | "createdAt" | "updatedAt">,
) {
  const existing = memory.collaborationProfiles.get(userId);
  const now = new Date().toISOString();
  const record: CollaborationProfile = {
    userId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...input,
  };

  memory.collaborationProfiles.set(userId, record);
  return record;
}

export async function findNearbyMembers(viewerUserId: string, maxKm = 75): Promise<NearbyMember[]> {
  const viewer = memory.collaborationProfiles.get(viewerUserId);
  if (!viewer || !viewer.locationDisclosureAccepted) {
    return [];
  }

  return Array.from(memory.collaborationProfiles.values())
    .filter((profile) => profile.userId !== viewerUserId && profile.locationDisclosureAccepted)
    .map((profile) => ({
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      promotedHighlight: profile.promotedHighlight,
      availableNow: profile.availableNow,
      preferences: profile.preferences,
      collaborationTypes: profile.collaborationTypes,
      distanceKm: Number(distanceKm(viewer.latitude, viewer.longitude, profile.latitude, profile.longitude).toFixed(1)),
      predictedAffinity: predictedAffinity(viewer, profile),
      canRequestContact: true,
    }))
    .filter((entry) => entry.distanceKm <= maxKm)
    .sort((left, right) => {
      if (left.promotedHighlight !== right.promotedHighlight) {
        return left.promotedHighlight ? -1 : 1;
      }

      if (left.availableNow !== right.availableNow) {
        return left.availableNow ? -1 : 1;
      }

      return right.predictedAffinity - left.predictedAffinity || left.distanceKm - right.distanceKm;
    });
}

function alertMessage(target: CollaborationProfile, viewer: CollaborationProfile) {
  return `${target.displayName} is available in ${target.city} for ${target.collaborationTypes.join(" / ")} collaborations.`;
}

export async function refreshAlertsForUser(userId: string) {
  const viewer = memory.collaborationProfiles.get(userId);
  if (!viewer || !viewer.notifyOnNearby) {
    return [];
  }

  const nearby = (await findNearbyMembers(userId, 35)).filter((entry) => entry.availableNow);
  const alerts: CollaborationAlert[] = nearby.slice(0, 3).map((entry) => {
    const target = memory.collaborationProfiles.get(entry.userId)!;
    return {
      id: `alert-${userId}-${entry.userId}`,
      userId,
      targetUserId: entry.userId,
      title: `${target.displayName} is nearby`,
      body: alertMessage(target, viewer),
      status: "new",
      createdAt: new Date().toISOString(),
    };
  });

  memory.collaborationAlerts.set(userId, alerts);
  return alerts;
}

export async function listAlerts(userId: string) {
  return memory.collaborationAlerts.get(userId) ?? [];
}

export async function createCollaborationRequest(
  fromUserId: string,
  toUserId: string,
  collaborationType: "photo" | "video" | "bundle",
  note: string,
) {
  const request: CollaborationRequest = {
    id: `request-${createId()}`,
    fromUserId,
    toUserId,
    collaborationType,
    note,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  memory.collaborationRequests.set(request.id, request);

  const targetProfile = memory.collaborationProfiles.get(toUserId);
  if (targetProfile) {
    const current = memory.collaborationAlerts.get(toUserId) ?? [];
    current.unshift({
      id: `alert-${createId()}`,
      userId: toUserId,
      targetUserId: fromUserId,
      title: `${memory.collaborationProfiles.get(fromUserId)?.displayName ?? "A member"} wants to connect`,
      body: `${request.collaborationType} collaboration request in ${targetProfile.city}.`,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    memory.collaborationAlerts.set(toUserId, current);
  }

  return request;
}

export async function respondToCollaborationRequest(requestId: string, actorUserId: string, accept: boolean) {
  const request = memory.collaborationRequests.get(requestId);
  if (!request || request.toUserId !== actorUserId) {
    throw new Error("not-found");
  }

  request.status = accept ? "accepted" : "declined";
  request.respondedAt = new Date().toISOString();
  memory.collaborationRequests.set(request.id, request);

  if (accept) {
    const fromProfile = memory.collaborationProfiles.get(request.fromUserId);
    const toProfile = memory.collaborationProfiles.get(request.toUserId);
    if (fromProfile && toProfile) {
      const originAlerts = memory.collaborationAlerts.get(request.fromUserId) ?? [];
      originAlerts.unshift({
        id: `alert-${createId()}`,
        userId: request.fromUserId,
        targetUserId: request.toUserId,
        title: `${toProfile.displayName} accepted your request`,
        body: `You can now contact ${toProfile.contactHandle}. They will also receive ${fromProfile.contactHandle}.`,
        status: "new",
        createdAt: new Date().toISOString(),
      });
      memory.collaborationAlerts.set(request.fromUserId, originAlerts);

      const targetAlerts = memory.collaborationAlerts.get(request.toUserId) ?? [];
      targetAlerts.unshift({
        id: `alert-${createId()}`,
        userId: request.toUserId,
        targetUserId: request.fromUserId,
        title: `Contact released for ${fromProfile.displayName}`,
        body: `You can now contact ${fromProfile.contactHandle}.`,
        status: "new",
        createdAt: new Date().toISOString(),
      });
      memory.collaborationAlerts.set(request.toUserId, targetAlerts);
    }
  }

  return request;
}

export async function listCollaborationRequests(userId: string) {
  return Array.from(memory.collaborationRequests.values()).filter(
    (request) => request.fromUserId === userId || request.toUserId === userId,
  );
}

export async function listAllCollaborationProfiles() {
  return Array.from(memory.collaborationProfiles.values());
}
