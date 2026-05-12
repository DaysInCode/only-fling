import type { HttpRequest } from "@azure/functions";
import {
  affiliateCampaignSchema,
  memberRequestActionSchema,
  memberRequestSchema,
  studioSessionActionSchema,
  studioSessionSchema,
} from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import {
  actOnMemberRequest,
  actOnStudioSession,
  appendAuditEvent,
  createMemberRequest,
  createStudioSession,
  getAffiliateCampaign,
  getOrCreateUser,
  listMemberRequests,
  listStudioSessions,
  listStudioTimeline,
  listUsers,
  saveAffiliateCampaign,
} from "../lib/persistence";

export async function affiliateLaunch(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const user = await getOrCreateUser(session.email);

  if (request.method === "GET") {
    let campaign = await getAffiliateCampaign(session.userId);
    if (!campaign) {
      campaign = await saveAffiliateCampaign(session.userId, user.displayName, "Start earning with me", 10, 5, 21);
    }

    return jsonResponse({
      campaign,
      landingUrl: `https://onlyfling.local/invite/${campaign.shareCode}`,
      rewardRule: `Affiliate reward applies for the first ${campaign.capSalesCount} sales or ${campaign.capDays} days, whichever comes first.`,
    });
  }

  const parsed = affiliateCampaignSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const campaign = await saveAffiliateCampaign(
    session.userId,
    user.displayName,
    parsed.data.ctaCopy,
    parsed.data.rewardPercent,
    parsed.data.capSalesCount,
    parsed.data.capDays,
  );
  await appendAuditEvent(session.userId, "affiliate.campaign.saved", "affiliate-campaign", campaign.id, "Updated affiliate launch settings.");
  return jsonResponse({ campaign });
}

export async function memberRequests(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const currentUser = await getOrCreateUser(session.email);

  if (request.method === "GET") {
    const requests = await listMemberRequests(session.userId);
    return jsonResponse({
      requests,
      summary: {
        open: requests.filter((entry) => entry.status === "open").length,
        promised: requests.filter((entry) => entry.status === "accepted").length,
        fulfilled: requests.filter((entry) => entry.status === "fulfilled").length,
      },
    });
  }

  const parsed = memberRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const users = await listUsers();
  const targetUser = users.find((entry) => entry.id === parsed.data.targetUserId);
  if (!targetUser) {
    return jsonResponse({ error: "target-not-found" }, 404);
  }

  const created = await createMemberRequest(
    session.userId,
    currentUser.displayName,
    parsed.data.targetUserId,
    targetUser.displayName,
    parsed.data.title,
    parsed.data.details,
    parsed.data.type,
  );
  await appendAuditEvent(session.userId, "member.request.created", "member-request", created.id, `Created request '${created.title}'.`);
  return jsonResponse({ request: created }, 201);
}

export async function memberRequestAction(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = memberRequestActionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  try {
    const updated = await actOnMemberRequest(parsed.data.requestId, session.userId, parsed.data.action);
    await appendAuditEvent(
      session.userId,
      "member.request.updated",
      "member-request",
      updated.id,
      `Marked request '${updated.title}' as ${updated.status}.`,
    );
    return jsonResponse({ request: updated });
  } catch {
    return jsonResponse({ error: "not-found" }, 404);
  }
}

export async function studioSessions(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const currentUser = await getOrCreateUser(session.email);

  if (request.method === "GET") {
    const sessions = await listStudioSessions(session.userId);
    const selectedSessionId = request.query.get("sessionId");
    const timeline = selectedSessionId ? await listStudioTimeline(selectedSessionId) : [];
    return jsonResponse({ sessions, timeline });
  }

  const parsed = studioSessionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const users = await listUsers();
  const partner = users.find((entry) => entry.id === parsed.data.partnerUserId);
  if (!partner) {
    return jsonResponse({ error: "partner-not-found" }, 404);
  }

  const created = await createStudioSession(
    session.userId,
    currentUser.displayName,
    parsed.data.partnerUserId,
    partner.displayName,
    parsed.data.title,
    parsed.data.contentType,
    parsed.data.sessionMode,
    parsed.data.grossMinor,
    parsed.data.feesMinor,
  );
  await appendAuditEvent(session.userId, "studio.session.created", "studio-session", created.id, `Created studio session '${created.title}'.`);
  return jsonResponse({ session: created }, 201);
}

export async function studioSessionAction(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = studioSessionActionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const currentUser = await getOrCreateUser(session.email);

  try {
    const updated = await actOnStudioSession(
      parsed.data.sessionId,
      session.userId,
      currentUser.displayName,
      parsed.data.action,
    );
    await appendAuditEvent(
      session.userId,
      "studio.session.updated",
      "studio-session",
      updated.id,
      `Applied studio action ${parsed.data.action} to '${updated.title}'.`,
    );
    return jsonResponse({ session: updated, timeline: await listStudioTimeline(updated.id) });
  } catch {
    return jsonResponse({ error: "not-found" }, 404);
  }
}
