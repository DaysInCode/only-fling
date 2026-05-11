import type { HttpRequest } from "@azure/functions";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse } from "../lib/http";
import { listAllCollaborationProfiles, listCollaborationRequests, listUsers, requireRole } from "../lib/persistence";

export async function adminCollaborationOverview(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  try {
    await requireRole(session, ["platformAdmin"]);
  } catch {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const users = await listUsers();
  const profiles = await listAllCollaborationProfiles();
  const requests = Array.from(
    new Map(
      (
        await Promise.all(users.map((user) => listCollaborationRequests(user.id)))
      )
        .flat()
        .map((request) => [request.id, request]),
    ).values(),
  );

  return jsonResponse({
    profiles,
    requests,
  });
}
