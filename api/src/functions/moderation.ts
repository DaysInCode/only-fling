import type { HttpRequest } from "@azure/functions";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse } from "../lib/http";
import { listModerationCases, requireRole } from "../lib/persistence";

export async function moderationQueue(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  try {
    await requireRole(session, ["platformAdmin", "moderator"]);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({ cases: await listModerationCases() });
}
