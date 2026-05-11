import type { HttpRequest } from "@azure/functions";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse } from "../lib/http";
import { getEarningsReport, listSubscriptions, listUsers, requireRole } from "../lib/persistence";

async function requireAdmin(request: HttpRequest) {
  const session = await getBearerSession(request);
  await requireRole(session, ["platformAdmin"]);
}

export async function adminUsers(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    await requireAdmin(request);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({ users: await listUsers() });
}

export async function adminSubscriptions(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    await requireAdmin(request);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({ subscriptions: await listSubscriptions() });
}

export async function adminEarnings(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    await requireAdmin(request);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({ report: await getEarningsReport() });
}
