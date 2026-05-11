import type { HttpRequest } from "@azure/functions";
import { getSession } from "./persistence";

export async function getBearerSession(request: HttpRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const session = await getSession(token);
  if (!session || session.expiresAt <= new Date().toISOString()) {
    return null;
  }

  return session;
}
