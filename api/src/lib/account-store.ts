import { TableClient } from "@azure/data-tables";
import { createId } from "@paralleldrive/cuid2";
import type {
  AccountEarningsSummary,
  AccountSessionView,
  AccountSettings,
  EarningsSeriesPoint,
  MediaCollection,
  MediaItem,
  PayoutRequest,
  PolicyArtifactRecord,
  UploadStatusEvent,
  UserAccountProfile,
  UserProfile,
  VerificationReadiness,
  VerificationStep,
} from "../domain/types";
import { config } from "./config";
import { persistPolicyArtifact, createUploadUrl } from "./uploads";

type AccountTableName =
  | "accountprofiles"
  | "accountsettings"
  | "mediacollections"
  | "mediaitems"
  | "uploadevents"
  | "payoutrequests"
  | "verificationreadiness";

type UploadIntakeInput = {
  collectionId: string;
  title: string;
  description: string;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video";
  fileSizeBytes: number;
  priceMinor: number;
  currency: string;
  publishState: "draft" | "published";
  consent: MediaItem["consent"];
  policy: {
    folderName: string;
    documentName: string;
    termsSummary: string;
    pricingSummary: string;
    additionalNotes: string;
  };
};

type AccountStoreState = {
  profiles: Map<string, UserAccountProfile>;
  settings: Map<string, AccountSettings>;
  collections: Map<string, MediaCollection>;
  mediaItems: Map<string, MediaItem>;
  uploadEvents: UploadStatusEvent[];
  payouts: PayoutRequest[];
  verification: Map<string, VerificationReadiness>;
  earningsLedger: Array<{
    id: string;
    ownerId: string;
    periodStart: string;
    grossMinor: number;
    netMinor: number;
    feesMinor: number;
    soldCount: number;
    currency: string;
  }>;
};

const tableCache = new Map<AccountTableName, Promise<TableClient>>();

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function shouldTryAzureStorage() {
  return Boolean(config.storageConnectionString);
}

async function getTable(tableName: AccountTableName) {
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

async function upsertRecord(tableName: AccountTableName, partitionKey: string, rowKey: string, payload: unknown) {
  const client = await getTable(tableName);
  await client.upsertEntity({
    partitionKey,
    rowKey,
    payload: JSON.stringify(payload),
    updatedAt: new Date().toISOString(),
  });
}

async function getRecord<T>(tableName: AccountTableName, partitionKey: string, rowKey: string): Promise<T | null> {
  const client = await getTable(tableName);
  try {
    const entity = await client.getEntity<{ payload: string }>(partitionKey, rowKey);
    return JSON.parse(entity.payload) as T;
  } catch {
    return null;
  }
}

async function listRecords<T>(tableName: AccountTableName, partitionKey?: string): Promise<T[]> {
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

function defaultProfile(user: UserProfile): UserAccountProfile {
  const now = new Date().toISOString();
  return {
    userId: user.id,
    displayName: user.displayName,
    bio: "",
    avatarUrl: "",
    preferences: {
      contentTags: [],
      collaborationInterests: [],
      languages: ["en"],
    },
    privacy: {
      profileVisibility: "followers",
      discoverable: true,
      showActivity: false,
      allowDirectMessages: true,
    },
    contact: {
      supportEmail: user.email,
      emailOptIn: true,
      marketingOptIn: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function defaultSettings(userId: string): AccountSettings {
  const now = new Date().toISOString();
  return {
    userId,
    notifications: {
      email: true,
      push: true,
      product: true,
      payouts: true,
      security: true,
    },
    deviceSync: {
      enabled: true,
      canonicalUpdatedAt: now,
      sessionCount: 0,
    },
    payoutPreferences: {
      settlementCurrency: "GBP",
      schedule: "manual",
      methodStatus: "not-configured",
    },
    closeAccount: {
      status: "active",
    },
    createdAt: now,
    updatedAt: now,
  };
}

function buildPolicyMarkdown(
  ownerDisplayName: string,
  collection: MediaCollection,
  input: UploadIntakeInput,
  consentCapturedByUserId: string,
) {
  return `# Upload policy artifact

- Account: ${ownerDisplayName}
- Account ID: ${consentCapturedByUserId}
- Collection: ${collection.title}
- Folder: ${input.policy.folderName}
- Document: ${input.policy.documentName}
- File name: ${input.fileName}
- Media type: ${input.mediaType}
- Publish state: ${input.publishState}
- Price minor: ${input.priceMinor}
- Currency: ${input.currency}
- Performer count: ${input.consent.performerCount}
- All adults confirmed: ${input.consent.allAdultsConfirmed ? "yes" : "no"}
- Rights confirmed: ${input.consent.rightsConfirmed ? "yes" : "no"}
- Consent captured at: ${input.consent.consentCapturedAt}
- Consent record years: ${input.consent.recordRetentionYears}

## Terms summary
${input.policy.termsSummary}

## Pricing summary
${input.policy.pricingSummary}

## Consent notes
${input.consent.notes || "None provided."}

## Additional notes
${input.policy.additionalNotes || "None provided."}
`;
}

function getCollectionTotals(collection: MediaCollection, items: MediaItem[]) {
  const activeItems = items.filter((item) => item.collectionId === collection.id && item.ownerId === collection.ownerId && !item.deletedAt);
  const publishedItems = activeItems.filter((item) => item.publishState === "published");
  return {
    mediaCount: activeItems.length,
    soldCount: collection.soldCount + publishedItems.reduce((sum, item) => sum + item.soldCount, 0),
    earnedMinor: collection.earnedMinor + publishedItems.reduce((sum, item) => sum + item.earnedMinor, 0),
  };
}

const memory = (() => {
  const now = new Date().toISOString();

  const annaProfile: UserAccountProfile = {
    userId: "user-creator-anna",
    displayName: "Anna",
    bio: "Creator account ready for moderated publishing and compliant monetization setup.",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    preferences: {
      contentTags: ["fitness", "editorial", "glamour"],
      collaborationInterests: ["photo", "video"],
      languages: ["en", "it"],
    },
    privacy: {
      profileVisibility: "followers",
      discoverable: true,
      showActivity: true,
      allowDirectMessages: true,
    },
    contact: {
      supportEmail: "anna@example.com",
      emailOptIn: true,
      marketingOptIn: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  const lucaProfile: UserAccountProfile = {
    userId: "user-creator-luca",
    displayName: "Luca",
    bio: "Account with staged identity checks and draft collections for moderated launch planning.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    preferences: {
      contentTags: ["lifestyle", "promo"],
      collaborationInterests: ["bundle"],
      languages: ["en"],
    },
    privacy: {
      profileVisibility: "private",
      discoverable: false,
      showActivity: false,
      allowDirectMessages: false,
    },
    contact: {
      supportEmail: "luca@example.com",
      emailOptIn: true,
      marketingOptIn: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  const annaSettings: AccountSettings = {
    ...defaultSettings("user-creator-anna"),
    payoutPreferences: {
      settlementCurrency: "GBP",
      schedule: "weekly",
      methodStatus: "ready",
    },
    updatedAt: now,
  };

  const lucaSettings: AccountSettings = {
    ...defaultSettings("user-creator-luca"),
    deviceSync: {
      enabled: true,
      canonicalUpdatedAt: now,
      lastSyncedSessionId: "session-luca-tablet",
      sessionCount: 2,
    },
    payoutPreferences: {
      settlementCurrency: "GBP",
      schedule: "manual",
      methodStatus: "pending",
    },
    closeAccount: {
      status: "requested",
      requestedAt: now,
      requestedBySessionId: "session-luca-tablet",
      reason: "Reducing account activity while identity review is pending.",
      retentionAcknowledged: true,
      accessLossAcknowledged: true,
    },
    updatedAt: now,
  };

  const annaCollection: MediaCollection = {
    id: "collection-anna-editorial",
    ownerId: "user-creator-anna",
    folderName: "anna-editorial-drop",
    title: "Editorial Drop",
    description: "Published image bundle with staged moderation and sales history.",
    visibility: "followers",
    publishState: "published",
    priceMinor: 1800,
    currency: "GBP",
    soldCount: 9,
    earnedMinor: 16200,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const lucaCollection: MediaCollection = {
    id: "collection-luca-drafts",
    ownerId: "user-creator-luca",
    folderName: "luca-launch-drafts",
    title: "Launch Drafts",
    description: "Processing-ready content waiting on payout and identity readiness.",
    visibility: "private",
    publishState: "draft",
    priceMinor: 0,
    currency: "GBP",
    soldCount: 0,
    earnedMinor: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const annaPolicy: PolicyArtifactRecord = {
    id: "policy-anna-editorial",
    ownerId: "user-creator-anna",
    folderName: annaCollection.folderName,
    documentName: "editorial-consent",
    fileName: `${annaCollection.folderName}-editorial-consent.md`,
    uri: `memory://policies/${annaCollection.folderName}-editorial-consent.md`,
    createdAt: now,
  };

  const lucaPolicy: PolicyArtifactRecord = {
    id: "policy-luca-launch",
    ownerId: "user-creator-luca",
    folderName: lucaCollection.folderName,
    documentName: "launch-checklist",
    fileName: `${lucaCollection.folderName}-launch-checklist.md`,
    uri: `memory://policies/${lucaCollection.folderName}-launch-checklist.md`,
    createdAt: now,
  };

  const annaMediaReady: MediaItem = {
    id: "media-anna-ready-1",
    ownerId: "user-creator-anna",
    collectionId: annaCollection.id,
    folderName: annaCollection.folderName,
    title: "Editorial Cover Set",
    description: "Approved image set ready for storefront rendering.",
    fileName: "editorial-cover.jpg",
    contentType: "image/jpeg",
    mediaType: "image",
    uploadStatus: "ready",
    publishState: "published",
    priceMinor: 900,
    currency: "GBP",
    soldCount: 11,
    earnedMinor: 9900,
    blobUrl: "memory://media/editorial-cover.jpg",
    uploadMode: "memory",
    backgroundStreamId: "stream-media-anna-ready-1",
    backgroundUpdatedAt: now,
    consent: {
      performerCount: 1,
      allAdultsConfirmed: true,
      rightsConfirmed: true,
      consentCapturedAt: now,
      consentDocumentName: "editorial-consent",
      recordRetentionYears: 7,
      notes: "Creator self-owned release attached.",
    },
    policyArtifact: annaPolicy,
    createdAt: now,
    updatedAt: now,
  };

  const annaMediaProcessing: MediaItem = {
    id: "media-anna-processing-1",
    ownerId: "user-creator-anna",
    collectionId: annaCollection.id,
    folderName: annaCollection.folderName,
    title: "Behind The Scenes Reel",
    description: "Video upload currently in moderated processing.",
    fileName: "behind-scenes.mp4",
    contentType: "video/mp4",
    mediaType: "video",
    uploadStatus: "processing",
    publishState: "draft",
    priceMinor: 1200,
    currency: "GBP",
    soldCount: 0,
    earnedMinor: 0,
    blobUrl: "memory://media/behind-scenes.mp4",
    uploadMode: "memory",
    backgroundStreamId: "stream-media-anna-processing-1",
    backgroundUpdatedAt: now,
    consent: {
      performerCount: 1,
      allAdultsConfirmed: true,
      rightsConfirmed: true,
      consentCapturedAt: now,
      consentDocumentName: "editorial-consent",
      recordRetentionYears: 7,
      notes: "Pending transcoding checks.",
    },
    policyArtifact: annaPolicy,
    createdAt: now,
    updatedAt: now,
  };

  const lucaMediaPending: MediaItem = {
    id: "media-luca-pending-1",
    ownerId: "user-creator-luca",
    collectionId: lucaCollection.id,
    folderName: lucaCollection.folderName,
    title: "Launch Preview Bundle",
    description: "Pending upload intake awaiting moderation handoff.",
    fileName: "launch-preview.jpg",
    contentType: "image/jpeg",
    mediaType: "image",
    uploadStatus: "pending",
    publishState: "draft",
    priceMinor: 700,
    currency: "GBP",
    soldCount: 0,
    earnedMinor: 0,
    blobUrl: "memory://media/launch-preview.jpg",
    uploadMode: "memory",
    backgroundStreamId: "stream-media-luca-pending-1",
    backgroundUpdatedAt: now,
    consent: {
      performerCount: 1,
      allAdultsConfirmed: true,
      rightsConfirmed: true,
      consentCapturedAt: now,
      consentDocumentName: "launch-checklist",
      recordRetentionYears: 7,
      notes: "Awaiting identity check completion before publishing.",
    },
    policyArtifact: lucaPolicy,
    createdAt: now,
    updatedAt: now,
  };

  const uploadEvents: UploadStatusEvent[] = [
    {
      id: "upload-event-anna-1",
      ownerId: "user-creator-anna",
      mediaItemId: annaMediaReady.id,
      status: "ready",
      message: "Upload passed moderation checks and is ready.",
      createdAt: now,
    },
    {
      id: "upload-event-anna-2",
      ownerId: "user-creator-anna",
      mediaItemId: annaMediaProcessing.id,
      status: "processing",
      message: "Upload is being processed for streaming renditions.",
      createdAt: now,
    },
    {
      id: "upload-event-luca-1",
      ownerId: "user-creator-luca",
      mediaItemId: lucaMediaPending.id,
      status: "pending",
      message: "Upload intake created and waiting for transfer completion.",
      createdAt: now,
    },
  ];

  const payouts: PayoutRequest[] = [
    {
      id: "payout-anna-paid",
      ownerId: "user-creator-anna",
      amountMinor: 12500,
      currency: "GBP",
      status: "paid",
      note: "Weekly settlement",
      requestedAt: now,
      processedAt: now,
    },
    {
      id: "payout-anna-processing",
      ownerId: "user-creator-anna",
      amountMinor: 6400,
      currency: "GBP",
      status: "processing",
      note: "Manual payout review",
      requestedAt: now,
    },
    {
      id: "payout-luca-pending",
      ownerId: "user-creator-luca",
      amountMinor: 3100,
      currency: "GBP",
      status: "pending",
      note: "Awaiting payout details readiness",
      requestedAt: now,
    },
  ];

  const verification = new Map<string, VerificationReadiness>([
    [
      "user-creator-anna",
      {
        userId: "user-creator-anna",
        status: "ready",
        identityStatus: "verified",
        payoutStatus: "ready",
        consentStatus: "complete",
        requiredSteps: [],
        updatedAt: now,
      },
    ],
    [
      "user-creator-luca",
      {
        userId: "user-creator-luca",
        status: "pending-review",
        identityStatus: "pending",
        payoutStatus: "pending",
        consentStatus: "partial",
        requiredSteps: [
          { code: "identity-check", title: "Identity check submitted", status: "pending" },
          { code: "payout-details", title: "Payout details ready", status: "pending" },
        ],
        updatedAt: now,
      },
    ],
  ]);

  return {
    profiles: new Map<string, UserAccountProfile>([
      [annaProfile.userId, annaProfile],
      [lucaProfile.userId, lucaProfile],
    ]),
    settings: new Map<string, AccountSettings>([
      [annaSettings.userId, annaSettings],
      [lucaSettings.userId, lucaSettings],
    ]),
    collections: new Map<string, MediaCollection>([
      [annaCollection.id, annaCollection],
      [lucaCollection.id, lucaCollection],
    ]),
    mediaItems: new Map<string, MediaItem>([
      [annaMediaReady.id, annaMediaReady],
      [annaMediaProcessing.id, annaMediaProcessing],
      [lucaMediaPending.id, lucaMediaPending],
    ]),
    uploadEvents,
    payouts,
    verification,
    earningsLedger: [
      {
        id: "earn-anna-2026-03",
        ownerId: "user-creator-anna",
        periodStart: "2026-03-01",
        grossMinor: 19800,
        netMinor: 17424,
        feesMinor: 2376,
        soldCount: 22,
        currency: "GBP",
      },
      {
        id: "earn-anna-2026-04",
        ownerId: "user-creator-anna",
        periodStart: "2026-04-01",
        grossMinor: 28400,
        netMinor: 24992,
        feesMinor: 3408,
        soldCount: 31,
        currency: "GBP",
      },
      {
        id: "earn-luca-2026-04",
        ownerId: "user-creator-luca",
        periodStart: "2026-04-01",
        grossMinor: 6200,
        netMinor: 5456,
        feesMinor: 744,
        soldCount: 8,
        currency: "GBP",
      },
    ],
  } satisfies AccountStoreState;
})();

export async function getOrCreateAccountProfile(user: UserProfile) {
  return withFallback(
    async () => {
      const existing = await getRecord<UserAccountProfile>("accountprofiles", user.id, "profile");
      if (existing) {
        return existing;
      }

      const created = defaultProfile(user);
      await upsertRecord("accountprofiles", user.id, "profile", created);
      return created;
    },
    () => {
      const existing = memory.profiles.get(user.id);
      if (existing) {
        return existing;
      }

      const created = defaultProfile(user);
      memory.profiles.set(user.id, created);
      return created;
    },
  );
}

export async function updateAccountProfile(user: UserProfile, input: Omit<UserAccountProfile, "userId" | "createdAt" | "updatedAt">) {
  const existing = await getOrCreateAccountProfile(user);
  const updated: UserAccountProfile = {
    ...existing,
    ...input,
    userId: user.id,
    updatedAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("accountprofiles", user.id, "profile", updated);
      return updated;
    },
    () => {
      memory.profiles.set(user.id, updated);
      return updated;
    },
  );
}

export async function getOrCreateAccountSettings(userId: string, sessionCount = 0) {
  return withFallback(
    async () => {
      const existing = await getRecord<AccountSettings>("accountsettings", userId, "settings");
      if (existing) {
        return existing;
      }

      const created = {
        ...defaultSettings(userId),
        deviceSync: {
          ...defaultSettings(userId).deviceSync,
          sessionCount,
        },
      };
      await upsertRecord("accountsettings", userId, "settings", created);
      return created;
    },
    () => {
      const existing = memory.settings.get(userId);
      if (existing) {
        return {
          ...existing,
          deviceSync: {
            ...existing.deviceSync,
            sessionCount,
          },
        };
      }

      const created = {
        ...defaultSettings(userId),
        deviceSync: {
          ...defaultSettings(userId).deviceSync,
          sessionCount,
        },
      };
      memory.settings.set(userId, created);
      return created;
    },
  );
}

export async function updateAccountSettings(
  userId: string,
  input: {
    notifications: AccountSettings["notifications"];
    deviceSync: {
      enabled: boolean;
      lastSyncedSessionId?: string;
    };
    payoutPreferences: AccountSettings["payoutPreferences"];
  },
  sessionCount: number,
) {
  const existing = await getOrCreateAccountSettings(userId, sessionCount);
  const updated: AccountSettings = {
    ...existing,
    notifications: input.notifications,
    deviceSync: {
      enabled: input.deviceSync.enabled,
      canonicalUpdatedAt: new Date().toISOString(),
      lastSyncedSessionId: input.deviceSync.lastSyncedSessionId,
      sessionCount,
    },
    payoutPreferences: input.payoutPreferences,
    updatedAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("accountsettings", userId, "settings", updated);
      return updated;
    },
    () => {
      memory.settings.set(userId, updated);
      return updated;
    },
  );
}

export async function requestCloseAccount(
  user: UserProfile,
  sessionId: string,
  reason: string,
  action: "request" | "close",
) {
  const existing = await getOrCreateAccountSettings(user.id);
  const now = new Date().toISOString();
  const closeAccount =
    action === "request"
      ? {
          status: "requested" as const,
          requestedAt: now,
          requestedBySessionId: sessionId,
          reason,
          retentionAcknowledged: true,
          accessLossAcknowledged: true,
        }
      : {
          ...existing.closeAccount,
          status: "closed" as const,
          requestedAt: existing.closeAccount.requestedAt ?? now,
          requestedBySessionId: existing.closeAccount.requestedBySessionId ?? sessionId,
          closedAt: now,
          reason: reason || existing.closeAccount.reason,
          retentionAcknowledged: true,
          accessLossAcknowledged: true,
        };

  const updated: AccountSettings = {
    ...existing,
    closeAccount,
    updatedAt: now,
  };

  return withFallback(
    async () => {
      await upsertRecord("accountsettings", user.id, "settings", updated);
      return updated;
    },
    () => {
      memory.settings.set(user.id, updated);
      return updated;
    },
  );
}

export async function listMediaCollections(ownerId: string) {
  return withFallback(
    async () => {
      const collections = await listRecords<MediaCollection>("mediacollections", ownerId);
      const items = await listRecords<MediaItem>("mediaitems", ownerId);
      const sourceCollections = collections.length ? collections : Array.from(memory.collections.values()).filter((entry) => entry.ownerId === ownerId);
      const sourceItems = items.length ? items : Array.from(memory.mediaItems.values()).filter((entry) => entry.ownerId === ownerId);
      return sourceCollections
        .filter((collection) => collection.status !== "deleted")
        .map((collection) => ({ ...collection, ...getCollectionTotals(collection, sourceItems) }))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    () => {
      const items = Array.from(memory.mediaItems.values()).filter((entry) => entry.ownerId === ownerId);
      return Array.from(memory.collections.values())
        .filter((collection) => collection.ownerId === ownerId && collection.status !== "deleted")
        .map((collection) => ({ ...collection, ...getCollectionTotals(collection, items) }))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
  );
}

async function getCollection(ownerId: string, collectionId: string) {
  return withFallback(
    async () => getRecord<MediaCollection>("mediacollections", ownerId, collectionId),
    () => memory.collections.get(collectionId) ?? null,
  );
}

export async function createMediaCollection(
  ownerId: string,
  input: Omit<MediaCollection, "id" | "ownerId" | "soldCount" | "earnedMinor" | "status" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();
  const record: MediaCollection = {
    id: `collection-${createId()}`,
    ownerId,
    soldCount: 0,
    earnedMinor: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...input,
  };

  return withFallback(
    async () => {
      await upsertRecord("mediacollections", ownerId, record.id, record);
      return record;
    },
    () => {
      memory.collections.set(record.id, record);
      return record;
    },
  );
}

export async function updateMediaCollection(
  ownerId: string,
  collectionId: string,
  input: Omit<MediaCollection, "id" | "ownerId" | "soldCount" | "earnedMinor" | "status" | "createdAt" | "updatedAt" | "deletedAt">,
) {
  const existing = await getCollection(ownerId, collectionId);
  if (!existing || existing.ownerId !== ownerId || existing.status === "deleted") {
    return null;
  }

  const updated: MediaCollection = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("mediacollections", ownerId, collectionId, updated);
      return updated;
    },
    () => {
      memory.collections.set(collectionId, updated);
      return updated;
    },
  );
}

export async function softDeleteMediaCollection(ownerId: string, collectionId: string) {
  const existing = await getCollection(ownerId, collectionId);
  if (!existing || existing.ownerId !== ownerId || existing.status === "deleted") {
    return null;
  }

  const now = new Date().toISOString();
  const updated: MediaCollection = {
    ...existing,
    status: "deleted",
    deletedAt: now,
    updatedAt: now,
  };

  return withFallback(
    async () => {
      await upsertRecord("mediacollections", ownerId, collectionId, updated);
      return updated;
    },
    () => {
      memory.collections.set(collectionId, updated);
      return updated;
    },
  );
}

export async function listMediaItemsForCollection(ownerId: string, collectionId: string) {
  const collection = await getCollection(ownerId, collectionId);
  if (!collection || collection.ownerId !== ownerId || collection.status === "deleted") {
    return null;
  }

  return withFallback(
    async () => {
      const items = await listRecords<MediaItem>("mediaitems", ownerId);
      return items
        .filter((item) => item.collectionId === collectionId && !item.deletedAt)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    () =>
      Array.from(memory.mediaItems.values())
        .filter((item) => item.ownerId === ownerId && item.collectionId === collectionId && !item.deletedAt)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
}

async function getMediaItem(ownerId: string, mediaItemId: string) {
  return withFallback(
    async () => getRecord<MediaItem>("mediaitems", ownerId, mediaItemId),
    () => memory.mediaItems.get(mediaItemId) ?? null,
  );
}

async function appendUploadEvent(ownerId: string, mediaItemId: string, status: UploadStatusEvent["status"], message: string) {
  const event: UploadStatusEvent = {
    id: `upload-event-${createId()}`,
    ownerId,
    mediaItemId,
    status,
    message,
    createdAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("uploadevents", ownerId, event.id, event);
      return event;
    },
    () => {
      memory.uploadEvents.unshift(event);
      return event;
    },
  );
}

export async function createUploadIntake(owner: UserProfile, input: UploadIntakeInput) {
  const collection = await getCollection(owner.id, input.collectionId);
  if (!collection || collection.ownerId !== owner.id || collection.status === "deleted") {
    return { error: "collection-not-found" as const };
  }

  if (input.policy.folderName !== collection.folderName) {
    return { error: "folder-mismatch" as const };
  }

  const markdown = buildPolicyMarkdown(owner.displayName, collection, input, owner.id);
  const persistedArtifact = await persistPolicyArtifact(input.policy.folderName, input.policy.documentName, markdown);
  const policyArtifact: PolicyArtifactRecord = {
    id: `policy-${createId()}`,
    ownerId: owner.id,
    folderName: input.policy.folderName,
    documentName: input.policy.documentName,
    fileName: persistedArtifact.fileName,
    uri: persistedArtifact.uri,
    createdAt: new Date().toISOString(),
  };

  const upload = await createUploadUrl(input.fileName, input.contentType);
  const now = new Date().toISOString();
  const mediaItem: MediaItem = {
    id: `media-${createId()}`,
    ownerId: owner.id,
    collectionId: collection.id,
    folderName: input.policy.folderName,
    title: input.title,
    description: input.description,
    fileName: input.fileName,
    contentType: input.contentType,
    mediaType: input.mediaType,
    uploadStatus: "pending",
    publishState: input.publishState,
    priceMinor: input.priceMinor,
    currency: input.currency.toUpperCase(),
    soldCount: 0,
    earnedMinor: 0,
    blobUrl: upload.blobUrl,
    uploadUrl: upload.uploadUrl,
    uploadMode: upload.mode,
    expiresAt: upload.expiresAt,
    requiredHeaders: upload.requiredHeaders,
    backgroundStreamId: `stream-${createId()}`,
    backgroundUpdatedAt: now,
    consent: input.consent,
    policyArtifact,
    createdAt: now,
    updatedAt: now,
  };

  await withFallback(
    async () => {
      await upsertRecord("mediaitems", owner.id, mediaItem.id, mediaItem);
      return mediaItem;
    },
    () => {
      memory.mediaItems.set(mediaItem.id, mediaItem);
      return mediaItem;
    },
  );

  const event = await appendUploadEvent(owner.id, mediaItem.id, "pending", "Upload intake created and awaiting transfer.");
  return {
    mediaItem: {
      ...mediaItem,
      backgroundUpdatedAt: event.createdAt,
    },
    upload,
  };
}

export async function updateMediaItem(
  ownerId: string,
  mediaItemId: string,
  input: Pick<MediaItem, "title" | "description" | "priceMinor" | "currency" | "publishState">,
) {
  const existing = await getMediaItem(ownerId, mediaItemId);
  if (!existing || existing.ownerId !== ownerId || existing.deletedAt) {
    return null;
  }

  const updated: MediaItem = {
    ...existing,
    ...input,
    currency: input.currency.toUpperCase(),
    updatedAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("mediaitems", ownerId, mediaItemId, updated);
      return updated;
    },
    () => {
      memory.mediaItems.set(mediaItemId, updated);
      return updated;
    },
  );
}

export async function softDeleteMediaItem(ownerId: string, mediaItemId: string) {
  const existing = await getMediaItem(ownerId, mediaItemId);
  if (!existing || existing.ownerId !== ownerId || existing.deletedAt) {
    return null;
  }

  const now = new Date().toISOString();
  const updated: MediaItem = {
    ...existing,
    uploadStatus: "deleted",
    deletedAt: now,
    updatedAt: now,
    backgroundUpdatedAt: now,
  };

  await withFallback(
    async () => {
      await upsertRecord("mediaitems", ownerId, mediaItemId, updated);
      return updated;
    },
    () => {
      memory.mediaItems.set(mediaItemId, updated);
      return updated;
    },
  );
  await appendUploadEvent(ownerId, mediaItemId, "deleted", "Media item marked deleted and removed from active views.");
  return updated;
}

export async function listUploadEvents(ownerId: string, limit = 50) {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  return withFallback(
    async () => {
      const events = await listRecords<UploadStatusEvent>("uploadevents", ownerId);
      return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, boundedLimit);
    },
    () =>
      memory.uploadEvents
        .filter((event) => event.ownerId === ownerId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, boundedLimit),
  );
}

export async function getAccountEarnings(userId: string): Promise<{ summary: AccountEarningsSummary; timeseries: EarningsSeriesPoint[] }> {
  const timeseries = memory.earningsLedger
    .filter((entry) => entry.ownerId === userId)
    .sort((left, right) => left.periodStart.localeCompare(right.periodStart))
    .map((entry) => ({
      periodStart: entry.periodStart,
      grossMinor: entry.grossMinor,
      netMinor: entry.netMinor,
      feesMinor: entry.feesMinor,
      soldCount: entry.soldCount,
      currency: entry.currency,
    }));

  const totals = timeseries.reduce(
    (accumulator, point) => ({
      grossMinor: accumulator.grossMinor + point.grossMinor,
      netMinor: accumulator.netMinor + point.netMinor,
      feesMinor: accumulator.feesMinor + point.feesMinor,
    }),
    { grossMinor: 0, netMinor: 0, feesMinor: 0 },
  );

  const payouts = await listPayoutRequests(userId);
  const pendingPayoutMinor = payouts
    .filter((entry) => entry.status === "pending" || entry.status === "processing")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);
  const paidOutMinor = payouts.filter((entry) => entry.status === "paid").reduce((sum, entry) => sum + entry.amountMinor, 0);
  const availableForPayoutMinor = Math.max(0, totals.netMinor - pendingPayoutMinor - paidOutMinor);

  return {
    summary: {
      accountId: userId,
      totalGrossMinor: totals.grossMinor,
      totalNetMinor: totals.netMinor,
      totalFeesMinor: totals.feesMinor,
      availableForPayoutMinor,
      pendingPayoutMinor,
      paidOutMinor,
      currency: timeseries[0]?.currency ?? "GBP",
      rangeStart: timeseries[0]?.periodStart ?? new Date().toISOString().slice(0, 10),
      rangeEnd: timeseries[timeseries.length - 1]?.periodStart ?? new Date().toISOString().slice(0, 10),
    },
    timeseries,
  };
}

export async function listPayoutRequests(userId: string) {
  return withFallback(
    async () => {
      const payouts = await listRecords<PayoutRequest>("payoutrequests", userId);
      return payouts.sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
    },
    () =>
      memory.payouts
        .filter((entry) => entry.ownerId === userId)
        .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)),
  );
}

export async function createPayoutRequest(userId: string, amountMinor: number, note: string) {
  const earnings = await getAccountEarnings(userId);
  if (amountMinor > earnings.summary.availableForPayoutMinor) {
    return { error: "amount-exceeds-available" as const };
  }

  const payout: PayoutRequest = {
    id: `payout-${createId()}`,
    ownerId: userId,
    amountMinor,
    currency: earnings.summary.currency,
    status: "pending",
    note,
    requestedAt: new Date().toISOString(),
  };

  return withFallback(
    async () => {
      await upsertRecord("payoutrequests", userId, payout.id, payout);
      return { payout };
    },
    () => {
      memory.payouts.unshift(payout);
      return { payout };
    },
  );
}

function buildVerificationSteps(
  profile: UserAccountProfile,
  settings: AccountSettings,
  mediaItems: MediaItem[],
  existing?: VerificationReadiness,
) {
  const hasProfile = Boolean(profile.displayName && profile.contact.supportEmail);
  const consentReady = mediaItems.some((item) => !item.deletedAt && item.consent.allAdultsConfirmed && item.consent.rightsConfirmed);
  const payoutReady = settings.payoutPreferences.methodStatus === "ready";
  const identityStatus = existing?.identityStatus ?? "not-started";

  const steps: VerificationStep[] = [
    { code: "profile-complete", title: "Profile and contact controls complete", status: hasProfile ? "complete" : "required" },
    {
      code: "identity-check",
      title: "Identity check submitted or verified",
      status: identityStatus === "verified" ? "complete" : identityStatus === "pending" ? "pending" : "required",
    },
    {
      code: "consent-documents",
      title: "Consent documents attached to upload policy artifacts",
      status: consentReady ? "complete" : "required",
    },
    {
      code: "payout-details",
      title: "Payout details placeholder marked ready",
      status: payoutReady ? "complete" : settings.payoutPreferences.methodStatus === "pending" ? "pending" : "required",
    },
  ];

  const status = steps.some((step) => step.status === "required")
    ? "action-required"
    : steps.some((step) => step.status === "pending")
      ? "pending-review"
      : "ready";

  return {
    status,
    identityStatus,
    payoutStatus: settings.payoutPreferences.methodStatus,
    consentStatus: consentReady ? "complete" : mediaItems.length ? "partial" : "missing",
    requiredSteps: steps.filter((step) => step.status !== "complete"),
  } satisfies Omit<VerificationReadiness, "userId" | "updatedAt">;
}

export async function getVerificationReadiness(user: UserProfile) {
  const [profile, settings, mediaItems, stored] = await Promise.all([
    getOrCreateAccountProfile(user),
    getOrCreateAccountSettings(user.id),
    withFallback(
      async () => (await listRecords<MediaItem>("mediaitems", user.id)).filter((item) => !item.deletedAt),
      () => Array.from(memory.mediaItems.values()).filter((item) => item.ownerId === user.id && !item.deletedAt),
    ),
    withFallback(
      async () => getRecord<VerificationReadiness>("verificationreadiness", user.id, "readiness"),
      () => memory.verification.get(user.id) ?? null,
    ),
  ]);

  const computed = {
    userId: user.id,
    ...buildVerificationSteps(profile, settings, mediaItems, stored ?? undefined),
    updatedAt: new Date().toISOString(),
  } satisfies VerificationReadiness;

  return withFallback(
    async () => {
      await upsertRecord("verificationreadiness", user.id, "readiness", computed);
      return computed;
    },
    () => {
      memory.verification.set(user.id, computed);
      return computed;
    },
  );
}

export function toAccountSessionView(session: {
  id: string;
  userId: string;
  deviceLabel?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
}, currentSessionId: string): AccountSessionView {
  return {
    id: session.id,
    userId: session.userId,
    deviceLabel: session.deviceLabel ?? "Unknown device",
    userAgent: session.userAgent ?? "unknown",
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    current: session.id === currentSessionId,
  };
}
