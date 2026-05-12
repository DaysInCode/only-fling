import type { HttpRequest } from "@azure/functions";
import {
  accountProfileSchema,
  accountSettingsSchema,
  closeAccountSchema,
  revokeSessionSchema,
} from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import {
  getOrCreateAccountProfile,
  getOrCreateAccountSettings,
  getVerificationReadiness,
  toAccountSessionView,
  updateAccountProfile,
  updateAccountSettings,
  requestCloseAccount,
} from "../lib/account-store";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import {
  appendAuditEvent,
  getOrCreateUser,
  listAuditEventsForAccount,
  listUserSessions,
  revokeUserSession,
  updateUserDisplayName,
} from "../lib/persistence";

export async function accountProfile(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const user = await getOrCreateUser(session.email);
  if (request.method === "GET") {
    return jsonResponse({ profile: await getOrCreateAccountProfile(user) });
  }

  const parsed = accountProfileSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const profile = await updateAccountProfile(user, parsed.data);
  if (profile.displayName !== user.displayName) {
    await updateUserDisplayName(user.id, user.email, profile.displayName);
  }

  await appendAuditEvent(session.userId, "account.profile.updated", "account-profile", session.userId, "Updated account profile settings.");
  return jsonResponse({ profile });
}

export async function accountSettings(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const sessions = await listUserSessions(session.userId);
  if (request.method === "GET") {
    return jsonResponse({ settings: await getOrCreateAccountSettings(session.userId, sessions.length) });
  }

  const parsed = accountSettingsSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  if (parsed.data.deviceSync.lastSyncedSessionId && !sessions.some((entry) => entry.id === parsed.data.deviceSync.lastSyncedSessionId)) {
    return jsonResponse({ error: "unknown-session-reference" }, 400);
  }

  const settings = await updateAccountSettings(session.userId, parsed.data, sessions.length);
  await appendAuditEvent(session.userId, "account.settings.updated", "account-settings", session.userId, "Updated account settings.");
  return jsonResponse({ settings });
}

export async function accountSessions(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const sessions = await listUserSessions(session.userId);
  const settings = await getOrCreateAccountSettings(session.userId, sessions.length);
  return jsonResponse({
    sessions: sessions.map((entry) => toAccountSessionView(entry, session.id)),
    deviceSync: settings.deviceSync,
  });
}

export async function accountSessionsRevoke(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = revokeSessionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const revoked = await revokeUserSession(session.userId, parsed.data.sessionId);
  if (!revoked) {
    return jsonResponse({ error: "session-not-found" }, 404);
  }

  await appendAuditEvent(session.userId, "account.session.revoked", "session", revoked.id, "Revoked an active session.");
  return jsonResponse({ session: toAccountSessionView(revoked, session.id) });
}

export async function accountClose(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = closeAccountSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const user = await getOrCreateUser(session.email);
  const profile = await getOrCreateAccountProfile(user);
  if (parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase() || parsed.data.confirmDisplayName !== profile.displayName) {
    return jsonResponse({ error: "confirmation-mismatch" }, 400);
  }

  const settings = await getOrCreateAccountSettings(user.id);
  if (parsed.data.action === "close" && settings.closeAccount.status !== "requested") {
    return jsonResponse({ error: "closure-must-be-requested-first" }, 409);
  }

  const updated = await requestCloseAccount(user, session.id, parsed.data.reason, parsed.data.action);
  await appendAuditEvent(
    session.userId,
    parsed.data.action === "request" ? "account.closure.requested" : "account.closed",
    "account",
    session.userId,
    parsed.data.action === "request" ? "Requested account closure." : "Account marked closed without deleting audit history.",
  );
  return jsonResponse({ closeAccount: updated.closeAccount });
}

export async function accountAudit(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const rawLimit = Number(request.query.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 50;
  const events = await listAuditEventsForAccount(session.userId);
  return jsonResponse({ events: events.slice(0, limit) });
}

export async function verificationReadiness(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const user = await getOrCreateUser(session.email);
  return jsonResponse({ readiness: await getVerificationReadiness(user) });
}
