import type { HttpRequest } from "@azure/functions";
import {
  mediaCollectionCreateSchema,
  mediaCollectionDeleteSchema,
  mediaCollectionUpdateSchema,
  mediaItemDeleteSchema,
  mediaItemUpdateSchema,
  mediaUploadIntakeSchema,
} from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import {
  createMediaCollection,
  createUploadIntake,
  listMediaCollections,
  listMediaItemsForCollection,
  listUploadEvents,
  softDeleteMediaCollection,
  softDeleteMediaItem,
  updateMediaCollection,
  updateMediaItem,
} from "../lib/account-store";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { appendAuditEvent, getOrCreateUser } from "../lib/persistence";

export async function mediaCollections(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  if (request.method === "GET") {
    return jsonResponse({ collections: await listMediaCollections(session.userId) });
  }

  const parsed = mediaCollectionCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const collection = await createMediaCollection(session.userId, parsed.data);
  await appendAuditEvent(session.userId, "media.collection.created", "media-collection", collection.id, `Created collection '${collection.title}'.`);
  return jsonResponse({ collection }, 201);
}

export async function mediaCollectionUpdate(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = mediaCollectionUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const collection = await updateMediaCollection(session.userId, parsed.data.collectionId, {
    folderName: parsed.data.folderName,
    title: parsed.data.title,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    publishState: parsed.data.publishState,
    priceMinor: parsed.data.priceMinor,
    currency: parsed.data.currency,
  });
  if (!collection) {
    return jsonResponse({ error: "collection-not-found" }, 404);
  }

  await appendAuditEvent(session.userId, "media.collection.updated", "media-collection", collection.id, `Updated collection '${collection.title}'.`);
  return jsonResponse({ collection });
}

export async function mediaCollectionDelete(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = mediaCollectionDeleteSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const collection = await softDeleteMediaCollection(session.userId, parsed.data.collectionId);
  if (!collection) {
    return jsonResponse({ error: "collection-not-found" }, 404);
  }

  await appendAuditEvent(session.userId, "media.collection.deleted", "media-collection", collection.id, `Soft deleted collection '${collection.title}'.`);
  return jsonResponse({ collection });
}

export async function mediaCollectionItems(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const collectionId = request.params.collectionId;
  if (!collectionId) {
    return jsonResponse({ error: "collection-id-required" }, 400);
  }

  const items = await listMediaItemsForCollection(session.userId, collectionId);
  if (!items) {
    return jsonResponse({ error: "collection-not-found" }, 404);
  }

  return jsonResponse({ items });
}

export async function mediaUploadIntake(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = mediaUploadIntakeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const user = await getOrCreateUser(session.email);
  const created = await createUploadIntake(user, parsed.data);
  if ("error" in created) {
    return jsonResponse({ error: created.error }, created.error === "collection-not-found" ? 404 : 400);
  }

  await appendAuditEvent(session.userId, "media.upload.intake.created", "media-item", created.mediaItem.id, `Created upload intake for '${created.mediaItem.title}'.`);
  return jsonResponse(created, 201);
}

export async function mediaUploadEvents(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const rawLimit = Number(request.query.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 50;
  return jsonResponse({ events: await listUploadEvents(session.userId, limit) });
}

export async function mediaItemUpdateAction(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = mediaItemUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const item = await updateMediaItem(session.userId, parsed.data.mediaItemId, {
    title: parsed.data.title,
    description: parsed.data.description,
    priceMinor: parsed.data.priceMinor,
    currency: parsed.data.currency,
    publishState: parsed.data.publishState,
  });
  if (!item) {
    return jsonResponse({ error: "media-item-not-found" }, 404);
  }

  await appendAuditEvent(session.userId, "media.item.updated", "media-item", item.id, `Updated media item '${item.title}'.`);
  return jsonResponse({ mediaItem: item });
}

export async function mediaItemDeleteAction(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = mediaItemDeleteSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const item = await softDeleteMediaItem(session.userId, parsed.data.mediaItemId);
  if (!item) {
    return jsonResponse({ error: "media-item-not-found" }, 404);
  }

  await appendAuditEvent(session.userId, "media.item.deleted", "media-item", item.id, `Soft deleted media item '${item.title}'.`);
  return jsonResponse({ mediaItem: item });
}
