import type { HttpRequest } from "@azure/functions";
import {
  collaborationProfileSchema,
  collaborationRequestSchema,
  collaborationResponseSchema,
} from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import {
  appendAuditEvent,
  createCollaborationRequest,
  findNearbyMembers,
  getCollaborationProfile,
  listAlerts,
  listCollaborationRequests,
  refreshAlertsForUser,
  respondToCollaborationRequest,
  saveCollaborationProfile,
} from "../lib/persistence";

export async function collaborationProfile(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  if (request.method === "GET") {
    const profile = await getCollaborationProfile(session.userId);
    return jsonResponse({ profile });
  }

  const parsed = collaborationProfileSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const profile = await saveCollaborationProfile(session.userId, parsed.data);
  await appendAuditEvent(
    session.userId,
    "collaboration.profile.saved",
    "collaboration-profile",
    session.userId,
    `Saved collaboration profile for ${profile.city}.`,
  );

  return jsonResponse({ profile }, 201);
}

export async function collaborationNearby(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const maxKm = Number(request.query.get("maxKm") ?? "75");
  const nearby = await findNearbyMembers(session.userId, Number.isFinite(maxKm) ? maxKm : 75);
  return jsonResponse({ nearby });
}

export async function collaborationRequest(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = collaborationRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const item = await createCollaborationRequest(
    session.userId,
    parsed.data.targetUserId,
    parsed.data.collaborationType,
    parsed.data.note,
  );
  await appendAuditEvent(
    session.userId,
    "collaboration.request.created",
    "collaboration-request",
    item.id,
    `Requested ${item.collaborationType} collaboration from ${item.toUserId}.`,
  );

  return jsonResponse({ request: item }, 201);
}

export async function collaborationRespond(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = collaborationResponseSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  try {
    const response = await respondToCollaborationRequest(parsed.data.requestId, session.userId, parsed.data.accept);
    await appendAuditEvent(
      session.userId,
      "collaboration.request.responded",
      "collaboration-request",
      response.id,
      `Marked collaboration request as ${response.status}.`,
    );
    return jsonResponse({ request: response });
  } catch {
    return jsonResponse({ error: "not-found" }, 404);
  }
}

export async function collaborationAlerts(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const alerts = await refreshAlertsForUser(session.userId);
  const requests = await listCollaborationRequests(session.userId);
  return jsonResponse({
    alerts: alerts.length ? alerts : await listAlerts(session.userId),
    requests,
  });
}
