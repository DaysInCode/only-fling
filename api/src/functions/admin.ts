import type { HttpRequest } from "@azure/functions";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse } from "../lib/http";
import { listAuditEvents, requireRole } from "../lib/persistence";

export async function auditLog(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  try {
    await requireRole(session, ["platformAdmin"]);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({ events: (await listAuditEvents()).slice(0, 25) });
}
