import type { HttpRequest } from "@azure/functions";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse } from "../lib/http";
import { listLeads, requireRole } from "../lib/persistence";

export async function crmLeads(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  try {
    await requireRole(session, ["platformAdmin", "moderator"]);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  return jsonResponse({
    leads: await listLeads(),
    note: "This CRM starter is limited to opt-in, referral, import, and manual-research leads. It intentionally excludes scraping workflows.",
  });
}
