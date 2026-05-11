import type { HttpRequest } from "@azure/functions";
import { authRequestSchema, authVerifySchema } from "../domain/schemas";
import { isLocalDevelopment } from "../lib/config";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { appendAuditEvent, createChallenge, createSession, getOrCreateUser, verifyChallenge } from "../lib/persistence";

export async function requestLink(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const parsed = authRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const challenge = await createChallenge(parsed.data.email);
  const user = await getOrCreateUser(parsed.data.email);
  await appendAuditEvent(user.id, "auth.challenge.created", "user", user.id, "Created passwordless sign-in challenge.");

  return jsonResponse({
    message: "Challenge created.",
    developmentCode: isLocalDevelopment() ? challenge.code : undefined,
  });
}

export async function verifyLink(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const parsed = authVerifySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const challenge = await verifyChallenge(parsed.data.email, parsed.data.code);
  if (!challenge) {
    return jsonResponse({ error: "invalid-or-expired-code" }, 401);
  }

  const user = await getOrCreateUser(parsed.data.email);
  const session = await createSession(user);
  await appendAuditEvent(user.id, "auth.session.created", "session", session.token, "Issued API session token.");

  return jsonResponse({
    token: session.token,
    user,
  });
}

export async function me(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  return jsonResponse({
    user: {
      email: session.email,
      role: session.role,
      userId: session.userId,
    },
  });
}
