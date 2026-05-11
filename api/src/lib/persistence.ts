import { TableClient } from "@azure/data-tables";
import { createId } from "@paralleldrive/cuid2";
import type {
  AuditEvent,
  AuthChallenge,
  CatalogItem,
  DashboardSummary,
  EarningsReportRow,
  LeadRecord,
  ModerationCase,
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

  return {
    users: new Map<string, UserProfile>([[adminUser.id, adminUser]]),
    usersByEmail: new Map<string, UserProfile>([[normalizeKey(adminUser.email), adminUser]]),
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
