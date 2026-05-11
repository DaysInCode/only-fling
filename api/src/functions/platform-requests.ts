import type { HttpRequest } from "@azure/functions";
import { platformRequestSchema } from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { appendAuditEvent, createPlatformRequest, getOrCreateUser, listPlatformRequests, requireRole } from "../lib/persistence";

export async function platformRequests(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (request.method === "GET") {
    return jsonResponse({ requests: await listPlatformRequests() });
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = platformRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const user = await getOrCreateUser(session.email);
  const created = await createPlatformRequest(
    session.userId,
    user.displayName,
    parsed.data.platformName,
    parsed.data.type,
    parsed.data.note,
  );
  await appendAuditEvent(session.userId, "platform.request.created", "platform-request", created.id, `Requested ${created.platformName}.`);

  return jsonResponse({ request: created }, 201);
}

export async function adminPlatformRequests(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  try {
    await requireRole(session, ["platformAdmin"]);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({ requests: await listPlatformRequests() });
}
